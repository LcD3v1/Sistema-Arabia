import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireEdit, requireView } from '../middleware/roles'
import { validateBody, bauMovimentoSchema, bauLoteSchema } from '../middleware/validate'
import { audit } from '../security/audit'
import { readData, writeData } from '../data'
import { broadcast } from '../realtime'
import { BauMovimento, ArabiaData } from '../types'

const router = Router()

// Estoque do baú da gerência: soma(entradas) − soma(saídas) por item
function calcEstoque(data: ArabiaData) {
  const map = new Map<string, { item: string; entradas: number; saidas: number }>()
  for (const item of data.bauGerenciaItens) map.set(item, { item, entradas: 0, saidas: 0 })
  for (const mov of data.bauGerenciaMovimentos) {
    const cur = map.get(mov.item) ?? { item: mov.item, entradas: 0, saidas: 0 }
    if (mov.tipo === 'entrada') cur.entradas += mov.quantidade
    else cur.saidas += mov.quantidade
    map.set(mov.item, cur)
  }
  return [...map.values()].map(e => ({ ...e, quantidade: e.entradas - e.saidas }))
}

router.get('/movimentos', requireAuth, requireView('historicoBauGerencia'), (req: Request, res: Response): void => {
  const data = readData()
  const { tipo, item, membroId, page, limit } = req.query

  let movs = [...data.bauGerenciaMovimentos].sort((a, b) => b.id - a.id)
  if (tipo === 'entrada' || tipo === 'saida') movs = movs.filter(m => m.tipo === tipo)
  if (item && typeof item === 'string') movs = movs.filter(m => m.item === item)
  if (membroId && !isNaN(Number(membroId))) movs = movs.filter(m => m.membroId === Number(membroId))

  const pageNum = Math.max(1, parseInt(String(page || '1'), 10))
  const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10)))
  const total = movs.length
  const paginated = movs.slice((pageNum - 1) * limitNum, pageNum * limitNum)

  res.json({ movimentos: paginated, total, page: pageNum, limit: limitNum })
})

router.post('/movimentos', requireAuth, requireEdit('bauGerencia'), validateBody(bauMovimentoSchema), (req: Request, res: Response): void => {
  const body = req.body as Omit<BauMovimento, 'id' | 'responsavel'>
  const data = readData()

  if (!data.bauGerenciaItens.includes(body.item)) {
    res.status(400).json({ error: 'Item inválido — cadastre-o em Configurações' }); return
  }
  if (!data.membros.some(m => m.id === body.membroId)) {
    res.status(400).json({ error: 'Membro inválido' }); return
  }
  if (body.tipo === 'saida') {
    const estoque = calcEstoque(data).find(e => e.item === body.item)?.quantidade ?? 0
    if (body.quantidade > estoque) {
      res.status(400).json({ error: `Estoque insuficiente. Disponível: ${estoque}` }); return
    }
  }

  const novoMov: BauMovimento = {
    id: data.nextBauGerenciaMovId,
    data: body.data,
    tipo: body.tipo,
    membroId: body.membroId,
    item: body.item,
    quantidade: body.quantidade,
    responsavel: req.user!.username,
    observacoes: body.observacoes,
  }

  data.bauGerenciaMovimentos.push(novoMov)
  data.nextBauGerenciaMovId++
  writeData(data)

  audit('BAU_MOVIMENTO', req, `[GERÊNCIA] ${novoMov.tipo.toUpperCase()} ${novoMov.quantidade}x ${novoMov.item} (membro ${novoMov.membroId})`)
  broadcast({ resource: 'bauGerencia', action: 'created', por: req.user!.username })
  res.status(201).json(novoMov)
})

router.post('/movimentos/lote', requireAuth, requireEdit('bauGerencia'), validateBody(bauLoteSchema), (req: Request, res: Response): void => {
  const body = req.body as {
    tipo: 'entrada' | 'saida'; membroId: number; data: string; observacoes?: string
    itens: { item: string; quantidade: number }[]
  }
  const data = readData()

  if (!data.membros.some(m => m.id === body.membroId)) {
    res.status(400).json({ error: 'Membro inválido' }); return
  }

  const invalidos = body.itens.filter(i => !data.bauGerenciaItens.includes(i.item))
  if (invalidos.length > 0) {
    res.status(400).json({ error: `Item(ns) inválido(s): ${invalidos.map(i => i.item).join(', ')}` }); return
  }

  if (body.tipo === 'saida') {
    const estoque = new Map(calcEstoque(data).map(e => [e.item, e.quantidade]))
    const necessidade = new Map<string, number>()
    for (const i of body.itens) necessidade.set(i.item, (necessidade.get(i.item) ?? 0) + i.quantidade)
    const faltando = [...necessidade.entries()].filter(([item, qtd]) => qtd > (estoque.get(item) ?? 0))
    if (faltando.length > 0) {
      res.status(400).json({
        error: 'Estoque insuficiente: ' + faltando.map(([item, qtd]) => `${item} (pedido ${qtd}, disponível ${estoque.get(item) ?? 0})`).join('; '),
      }); return
    }
  }

  const criados: BauMovimento[] = body.itens.map(i => {
    const mov: BauMovimento = {
      id: data.nextBauGerenciaMovId++,
      data: body.data,
      tipo: body.tipo,
      membroId: body.membroId,
      item: i.item,
      quantidade: i.quantidade,
      responsavel: req.user!.username,
      observacoes: body.observacoes,
    }
    data.bauGerenciaMovimentos.push(mov)
    return mov
  })

  writeData(data)
  audit('BAU_MOVIMENTO', req, `[GERÊNCIA] ${body.tipo.toUpperCase()} (lote) ${criados.map(c => `${c.quantidade}x ${c.item}`).join(', ')}`)
  broadcast({ resource: 'bauGerencia', action: 'created', por: req.user!.username })
  res.status(201).json(criados)
})

router.delete('/movimentos/:id', requireAuth, requireEdit('historicoBauGerencia'), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const data = readData()
  const idx = data.bauGerenciaMovimentos.findIndex(m => m.id === id)
  if (idx === -1) { res.status(404).json({ error: 'Movimentação não encontrada' }); return }

  data.bauGerenciaMovimentos.splice(idx, 1)
  writeData(data)

  audit('BAU_MOVIMENTO_DELETED', req, `[GERÊNCIA] ID: ${id}`)
  broadcast({ resource: 'bauGerencia', action: 'deleted', por: req.user!.username })
  res.json({ ok: true })
})

router.get('/estoque', requireAuth, requireView('estoqueGerencia'), (_req: Request, res: Response): void => {
  res.json(calcEstoque(readData()))
})

export default router
