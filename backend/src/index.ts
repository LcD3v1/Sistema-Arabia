import 'dotenv/config'
import path from 'path'
import { existsSync } from 'fs'
import express, { Request, Response } from 'express'
import cors from 'cors'
import hpp from 'hpp'
import { securityHeaders, permissionsPolicy } from './middleware/securityHeaders'
import { globalLimiter, apiLimiter } from './middleware/rateLimiter'
import { sanitizeBody } from './middleware/sanitize'
import { ensureDefaultAdmin } from './data'
import authRoutes from './routes/auth'
import membrosRoutes from './routes/membros'
import acoesRoutes from './routes/acoes'
import configRoutes from './routes/config'
import bauRoutes from './routes/bau'
import bauGerenciaRoutes from './routes/bauGerencia'
import tabletRoutes from './routes/tablet'
import ausenciasRoutes from './routes/ausencias'
import comunicadosRoutes from './routes/comunicados'
import lavagemRoutes from './routes/lavagem'
import vendasRoutes from './routes/vendas'
import eventsRoutes from './routes/events'

const app = express()
const PROD = process.env.NODE_ENV === 'production'

// ── Validação de segredo JWT no startup ──────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32 || JWT_SECRET.includes('mude-para')) {
  console.error('[ARABIA] ERRO FATAL: JWT_SECRET ausente ou fraco (mínimo 32 chars). Configure no .env.')
  process.exit(1)
}

// ── Segurança: camada 1 — headers HTTP ───────────────────────────────────────
app.use(securityHeaders)
app.use(permissionsPolicy)

// ── Segurança: camada 2 — rate limiting global ────────────────────────────────
app.set('trust proxy', 1) // Necessário para rate limit funcionar atrás de proxy/CDN
app.use(globalLimiter)

// ── CORS (apenas desenvolvimento) ────────────────────────────────────────────
if (!PROD) {
  app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }))
}

// ── Parser + proteção contra HTTP Parameter Pollution ─────────────────────────
app.use(express.json({ limit: '5mb' }))
app.use(hpp())

// ── Sanitização de inputs ────────────────────────────────────────────────────
app.use(sanitizeBody)

// ── API routes com rate limit específico ─────────────────────────────────────
app.use('/api', apiLimiter)
app.use('/api/auth', authRoutes)
app.use('/api/membros', membrosRoutes)
app.use('/api/acoes', acoesRoutes)
app.use('/api/config', configRoutes)
app.use('/api/bau', bauRoutes)
app.use('/api/bau-gerencia', bauGerenciaRoutes)
app.use('/api/tablet', tabletRoutes)
app.use('/api/ausencias', ausenciasRoutes)
app.use('/api/comunicados', comunicadosRoutes)
app.use('/api/lavagem', lavagemRoutes)
app.use('/api/vendas', vendasRoutes)
app.use('/api/events', eventsRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ── Bloqueio de dotfiles ──────────────────────────────────────────────────────
// Qualquer caminho com um segmento iniciado em "." (ex: /.env, /.git/config) → 404.
app.use((req: Request, res: Response, next): void => {
  if (req.path.split('/').some(seg => seg.startsWith('.'))) {
    res.status(404).end()
    return
  }
  next()
})

// ── Serve frontend buildado ───────────────────────────────────────────────────
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist')
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist, {
    dotfiles: 'deny',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
      } else if (/\.(js|css|woff2?|ttf|otf|eot)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else {
        res.setHeader('Cache-Control', 'no-cache')
      }
    },
  }))
  app.use((_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
  console.log('[ARABIA] Servindo frontend de:', frontendDist)
} else {
  console.log('[ARABIA] Frontend dist não encontrado — rode: npm run build')
}

const PORT = parseInt(process.env.PORT || '3001', 10)

ensureDefaultAdmin().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ARABIA] Sistema rodando em http://0.0.0.0:${PORT}`)
    console.log(`[ARABIA] Ambiente: ${PROD ? 'produção' : 'desenvolvimento'}`)
  })
}).catch(err => {
  console.error('[ARABIA] Erro ao inicializar:', err)
  process.exit(1)
})
