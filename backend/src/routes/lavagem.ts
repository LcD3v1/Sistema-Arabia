import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireView, requireEdit } from '../middleware/roles'
import { validateBody, lavagemSchema } from '../middleware/validate'
import { audit } from '../security/audit'
import { readData, writeData } from '../data'
import { broadcast } from '../realtime'
import { LavagemRegistro } from '../types'

const router = Router()

// ── Listar (com totais) ────────────────────────────────────────────────────────

router.get('/', requireAuth, requireView('historicoLavagem'), (req: Request, res: Response): void => {
  const data = readData()
  const { familia, dataDe, dataAte } = req.query

  let lista = [...data.lavagens].sort((a, b) => b.id - a.id)
  if (typeof familia === 'string' && familia) lista = lista.filter(l => l.familia === familia)
  if (typeof dataDe === 'string' && dataDe) lista = lista.filter(l => l.data >= dataDe)
  if (typeof dataAte === 'string' && dataAte) lista = lista.filter(l => l.data <= dataAte)

  const totalSujo = data.lavagens.reduce((s, l) => s + l.dinheiroSujo, 0)
  const totalLimpo = data.lavagens.reduce((s, l) => s + l.dinheiroLimpo, 0)

  res.json({ lavagens: lista, total: data.lavagens.length, totalSujo, totalLimpo })
})

// ── Registrar ──────────────────────────────────────────────────────────────────

router.post('/', requireAuth, requireEdit('lavagem'), validateBody(lavagemSchema), (req: Request, res: Response): void => {
  const body = req.body as {
    data: string; familia: string; dinheiroSujo: number; dinheiroLimpo: number
    porcentagem?: number; porcentagemNome?: string; lucroFamiliaPorcentagem?: number; observacoes?: string
  }
  const data = readData()

  const novo: LavagemRegistro = {
    id: data.nextLavagemId,
    data: body.data,
    familia: body.familia,
    dinheiroSujo: body.dinheiroSujo,
    dinheiroLimpo: body.dinheiroLimpo,
    porcentagem: body.porcentagem,
    porcentagemNome: body.porcentagemNome,
    lucroFamiliaPorcentagem: body.lucroFamiliaPorcentagem,
    responsavel: req.user!.username,
    observacoes: body.observacoes,
    criadoEm: new Date().toISOString(),
  }
  data.lavagens.push(novo)
  data.nextLavagemId++
  writeData(data)

  audit('LAVAGEM_CRIADA', req, `Família ${novo.familia} | sujo ${novo.dinheiroSujo} → limpo ${novo.dinheiroLimpo}`)
  broadcast({ resource: 'lavagem', action: 'created', por: req.user!.username })
  res.status(201).json(novo)
})

// ── Excluir ──────────────────────────────────────────────────────────────────

router.delete('/:id', requireAuth, requireEdit('historicoLavagem'), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const data = readData()
  const idx = data.lavagens.findIndex(l => l.id === id)
  if (idx === -1) { res.status(404).json({ error: 'Registro não encontrado' }); return }

  data.lavagens.splice(idx, 1)
  writeData(data)

  audit('LAVAGEM_DELETED', req, `ID: ${id}`)
  broadcast({ resource: 'lavagem', action: 'deleted', por: req.user!.username })
  res.json({ ok: true })
})

export default router
