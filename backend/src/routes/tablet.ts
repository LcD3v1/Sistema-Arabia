import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireEdit, requireView } from '../middleware/roles'
import { validateBody, tabletMovimentoSchema } from '../middleware/validate'
import { audit } from '../security/audit'
import { readData, writeData } from '../data'
import { broadcast } from '../realtime'
import { TabletMovimento, ArabiaData, Moeda } from '../types'

const router = Router()

type SaldoMoeda = { depositos: number; saques: number; saldo: number }

// Saldo do tablet POR MOEDA = soma(depósitos) − soma(saques)
function calcSaldo(data: ArabiaData): Record<Moeda, SaldoMoeda> {
  const out: Record<Moeda, SaldoMoeda> = {
    Real: { depositos: 0, saques: 0, saldo: 0 },
    Dólar: { depositos: 0, saques: 0, saldo: 0 },
  }
  for (const m of data.tabletMovimentos) {
    const moeda: Moeda = m.moeda ?? 'Real'
    const acc = out[moeda] ?? (out[moeda] = { depositos: 0, saques: 0, saldo: 0 })
    if (m.tipo === 'deposito') acc.depositos += m.valor
    else acc.saques += m.valor
  }
  for (const k of Object.keys(out) as Moeda[]) out[k].saldo = out[k].depositos - out[k].saques
  return out
}

router.get('/saldo', requireAuth, requireView('tablet'), (_req: Request, res: Response): void => {
  res.json(calcSaldo(readData()))
})

router.get('/movimentos', requireAuth, requireView('historicoTablet'), (req: Request, res: Response): void => {
  const data = readData()
  const { tipo, membroId, page, limit } = req.query

  let movs = [...data.tabletMovimentos].sort((a, b) => b.id - a.id)
  if (tipo === 'deposito' || tipo === 'saque') movs = movs.filter(m => m.tipo === tipo)
  if (membroId && !isNaN(Number(membroId))) movs = movs.filter(m => m.membroId === Number(membroId))

  const pageNum = Math.max(1, parseInt(String(page || '1'), 10))
  const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10)))
  const total = movs.length
  const paginated = movs.slice((pageNum - 1) * limitNum, pageNum * limitNum)

  res.json({ movimentos: paginated, total, page: pageNum, limit: limitNum })
})

router.post('/movimentos', requireAuth, requireEdit('tablet'), validateBody(tabletMovimentoSchema), (req: Request, res: Response): void => {
  const body = req.body as Omit<TabletMovimento, 'id' | 'responsavel'>
  const data = readData()

  if (!data.membros.some(m => m.id === body.membroId)) {
    res.status(400).json({ error: 'Membro inválido' }); return
  }
  const moeda: Moeda = body.moeda ?? 'Real'
  if (body.tipo === 'saque') {
    const saldo = calcSaldo(data)[moeda]?.saldo ?? 0
    if (body.valor > saldo) {
      res.status(400).json({ error: `Saldo insuficiente em ${moeda}. Disponível: ${saldo}` }); return
    }
  }

  const novo: TabletMovimento = {
    id: data.nextTabletMovId++,
    data: body.data,
    tipo: body.tipo,
    membroId: body.membroId,
    valor: body.valor,
    moeda,
    responsavel: req.user!.username,
    observacoes: body.observacoes,
  }
  data.tabletMovimentos.push(novo)
  writeData(data)

  audit('TABLET_MOVIMENTO', req, `${novo.tipo.toUpperCase()} ${novo.valor} ${novo.moeda} (membro ${novo.membroId})`)
  broadcast({ resource: 'tablet', action: 'created', por: req.user!.username })
  res.status(201).json(novo)
})

router.delete('/movimentos/:id', requireAuth, requireEdit('historicoTablet'), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const data = readData()
  const idx = data.tabletMovimentos.findIndex(m => m.id === id)
  if (idx === -1) { res.status(404).json({ error: 'Movimentação não encontrada' }); return }

  data.tabletMovimentos.splice(idx, 1)
  writeData(data)

  audit('TABLET_MOVIMENTO_DELETED', req, `ID: ${id}`)
  broadcast({ resource: 'tablet', action: 'deleted', por: req.user!.username })
  res.json({ ok: true })
})

export default router
