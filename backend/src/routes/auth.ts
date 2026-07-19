import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { requireAuth } from '../middleware/auth'
import { loginLimiter, criticalLimiter } from '../middleware/rateLimiter'
import { validateBody, loginSchema, changePasswordSchema } from '../middleware/validate'
import { checkLockout, recordFailed, clearAttempts } from '../security/bruteForce'
import { revokeToken } from '../security/tokenBlacklist'
import { audit } from '../security/audit'
import { readData, writeData } from '../data'
import { resolveContaPermissoes } from '../permissions'

const router = Router()

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body as { username: string; password: string }

    // Verificar bloqueio por força bruta
    const lockout = checkLockout(username)
    if (lockout.locked) {
      const mins = Math.ceil((lockout.remainingMs ?? 0) / 60000)
      audit('LOGIN_LOCKED', req, `Conta bloqueada: ${username}`)
      res.status(429).json({
        error: `Conta bloqueada por excesso de tentativas. Tente novamente em ${mins} minuto(s).`,
      })
      return
    }

    const data = readData()
    const conta = data.contas.find(c => c.username.toLowerCase() === username.toLowerCase())

    // Timing-safe: sempre faz bcrypt para não revelar se usuário existe
    const hash = conta?.password ?? '$2b$12$invalidsalthashusedtopreventtimingattackXXXXXXXXXXXXXX'
    const senhaCorreta = await bcrypt.compare(password, hash)

    if (!conta || !conta.ativo || !senhaCorreta) {
      const remaining = recordFailed(username)
      audit('LOGIN_FAILED', req, `Usuário: ${username} | Restantes: ${remaining}`)
      // Mensagem genérica — não revelar se conta existe ou está desativada
      res.status(401).json({ error: 'Credenciais inválidas' })
      return
    }

    clearAttempts(username)

    const jti = crypto.randomUUID()
    const token = jwt.sign(
      { contaId: conta.id, username: conta.username, jti },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' },
    )

    audit('LOGIN_SUCCESS', req, `Usuário: ${conta.username}`)

    res.json({
      token,
      user: {
        contaId: conta.id,
        username: conta.username,
        cargoPermissaoId: conta.cargoPermissaoId,
        permissoes: resolveContaPermissoes(conta, data.cargosPermissao),
      },
    })
  },
)

// POST /api/auth/logout
router.post('/logout', requireAuth, (req: Request, res: Response): void => {
  const user = req.user!
  if (user.jti && user.exp) {
    revokeToken(user.jti, user.exp * 1000)
  }
  audit('LOGOUT', req)
  res.json({ ok: true })
})

// GET /api/auth/me
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  const data = readData()
  const conta = data.contas.find(c => c.id === req.user!.contaId)

  if (!conta || !conta.ativo) {
    res.status(401).json({ error: 'CONTA_DESATIVADA' })
    return
  }

  res.json({
    contaId: conta.id,
    username: conta.username,
    cargoPermissaoId: conta.cargoPermissaoId,
    permissoes: resolveContaPermissoes(conta, data.cargosPermissao),
  })
})

// PUT /api/auth/change-password
router.put(
  '/change-password',
  requireAuth,
  criticalLimiter,
  validateBody(changePasswordSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string
      newPassword: string
    }

    const data = readData()
    const conta = data.contas.find(c => c.id === req.user!.contaId)

    if (!conta) {
      res.status(404).json({ error: 'Conta não encontrada' })
      return
    }

    const senhaCorreta = await bcrypt.compare(currentPassword, conta.password)
    if (!senhaCorreta) {
      audit('PASSWORD_CHANGED', req, 'Falha — senha atual incorreta')
      res.status(401).json({ error: 'Senha atual incorreta' })
      return
    }

    if (newPassword === currentPassword) {
      res.status(400).json({ error: 'A nova senha deve ser diferente da atual' })
      return
    }

    const novoHash = await bcrypt.hash(newPassword, 12)
    // Releitura fresca antes de gravar — evita sobrescrever alterações concorrentes
    const fresh = readData()
    const contaFresh = fresh.contas.find(c => c.id === req.user!.contaId)
    if (!contaFresh) { res.status(404).json({ error: 'Conta não encontrada' }); return }
    contaFresh.password = novoHash
    writeData(fresh)

    // Revogar token atual — obriga novo login com nova senha
    if (req.user!.jti && req.user!.exp) {
      revokeToken(req.user!.jti, req.user!.exp * 1000)
    }

    audit('PASSWORD_CHANGED', req, 'Senha alterada com sucesso')
    res.json({ ok: true, message: 'Senha alterada. Faça login novamente.' })
  },
)

export default router
