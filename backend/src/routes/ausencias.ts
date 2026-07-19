import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireEdit } from '../middleware/roles'
import { validateBody, ausenciaSchema } from '../middleware/validate'
import { audit } from '../security/audit'
import { readData, writeData, reconcileAusencias } from '../data'
import { broadcast } from '../realtime'
import { Ausencia, ArabiaData } from '../types'

const router = Router()

const hojeStr = () => new Date().toISOString().slice(0, 10)

// Devolve membro para Ativo se não houver outra ausência ativa cobrindo hoje
function talvezReativar(data: ArabiaData, membroId: number, ignoreId?: number) {
  const m = data.membros.find(mm => mm.id === membroId)
  if (!m || m.status !== 'Ausência') return
  const hoje = hojeStr()
  const aindaAusente = data.ausencias.some(o =>
    o.id !== ignoreId && o.membroId === membroId && o.status === 'ativa' &&
    o.dataInicio <= hoje && o.dataFim >= hoje,
  )
  if (!aindaAusente) m.status = 'Ativo'
}

// ── Listar ────────────────────────────────────────────────────────────────────

router.get('/', requireAuth, (req: Request, res: Response): void => {
  const data = readData()
  if (reconcileAusencias(data)) writeData(data)

  const { status } = req.query
  let ausencias = [...data.ausencias].sort((a, b) => b.id - a.id)
  if (status === 'ativa' || status === 'encerrada') ausencias = ausencias.filter(a => a.status === status)

  res.json(ausencias)
})

// ── Criar ─────────────────────────────────────────────────────────────────────

router.post('/', requireAuth, requireEdit('ausencias'), validateBody(ausenciaSchema), (req: Request, res: Response): void => {
  const body = req.body as { membroId: number; dataInicio: string; dataFim: string; motivo?: string }
  const data = readData()

  const membro = data.membros.find(m => m.id === body.membroId)
  if (!membro) { res.status(400).json({ error: 'Membro inválido' }); return }

  const nova: Ausencia = {
    id: data.nextAusenciaId,
    membroId: body.membroId,
    dataInicio: body.dataInicio,
    dataFim: body.dataFim,
    motivo: body.motivo,
    status: 'ativa',
    criadoPor: req.user!.username,
  }
  data.ausencias.push(nova)
  data.nextAusenciaId++

  // Altera o status do membro imediatamente
  membro.status = 'Ausência'

  writeData(data)
  audit('AUSENCIA_CRIADA', req, `Membro ${membro.policial} | ${nova.dataInicio} → ${nova.dataFim}`)
  broadcast({ resource: 'ausencias', action: 'created', por: req.user!.username })
  broadcast({ resource: 'membros', action: 'updated' })
  res.status(201).json(nova)
})

// ── Encerrar antes do prazo ─────────────────────────────────────────────────

router.put('/:id/encerrar', requireAuth, requireEdit('ausencias'), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const data = readData()
  const a = data.ausencias.find(x => x.id === id)
  if (!a) { res.status(404).json({ error: 'Ausência não encontrada' }); return }

  a.status = 'encerrada'
  talvezReativar(data, a.membroId, a.id)

  writeData(data)
  audit('AUSENCIA_ENCERRADA', req, `ID: ${id}`)
  broadcast({ resource: 'ausencias', action: 'updated', por: req.user!.username })
  broadcast({ resource: 'membros', action: 'updated' })
  res.json(a)
})

// ── Excluir ──────────────────────────────────────────────────────────────────

router.delete('/:id', requireAuth, requireEdit('ausencias'), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const data = readData()
  const idx = data.ausencias.findIndex(x => x.id === id)
  if (idx === -1) { res.status(404).json({ error: 'Ausência não encontrada' }); return }

  const [removida] = data.ausencias.splice(idx, 1)
  if (removida.status === 'ativa') talvezReativar(data, removida.membroId, removida.id)

  writeData(data)
  audit('AUSENCIA_DELETED', req, `ID: ${id}`)
  broadcast({ resource: 'ausencias', action: 'deleted', por: req.user!.username })
  broadcast({ resource: 'membros', action: 'updated' })
  res.json({ ok: true })
})

export default router
