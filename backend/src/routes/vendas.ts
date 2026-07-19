import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireEdit, requireView } from '../middleware/roles'
import {
  validateBody, vendaSchema, municaoTipoSchema, municaoTipoUpdateSchema, municaoMovimentoSchema,
} from '../middleware/validate'
import { audit } from '../security/audit'
import { readData, writeData } from '../data'
import { broadcast } from '../realtime'
import { ArabiaData, MunicaoMovimento, MunicaoTipo, Venda, VendaItem } from '../types'

const router = Router()

/**
 * Estoque por tipo de munição: soma(entradas) − soma(saídas).
 * Derivado, nunca armazenado — um saldo materializado dessincroniza dos
 * movimentos; um saldo calculado, não. Mesmo padrão do Baú.
 */
function calcEstoque(data: ArabiaData) {
  const map = new Map<number, { municaoId: number; entradas: number; saidas: number }>()
  for (const t of data.municaoTipos) map.set(t.id, { municaoId: t.id, entradas: 0, saidas: 0 })
  for (const mov of data.municaoMovimentos) {
    const cur = map.get(mov.municaoId) ?? { municaoId: mov.municaoId, entradas: 0, saidas: 0 }
    if (mov.tipo === 'entrada') cur.entradas += mov.quantidade
    else cur.saidas += mov.quantidade
    map.set(mov.municaoId, cur)
  }
  return [...map.values()].map(e => {
    const tipo = data.municaoTipos.find(t => t.id === e.municaoId)
    return {
      ...e,
      quantidade: e.entradas - e.saidas,
      nome: tipo?.nome ?? `#${e.municaoId} (removido)`,
      precoUnitario: tipo?.precoUnitario ?? 0,
      moeda: tipo?.moeda ?? 'Real',
      ativo: tipo?.ativo ?? false,
    }
  })
}

function estoqueMap(data: ArabiaData): Map<number, number> {
  return new Map(calcEstoque(data).map(e => [e.municaoId, e.quantidade]))
}

// ── Catálogo de tipos ─────────────────────────────────────────────────────────

router.get('/tipos', requireAuth, requireView('vendas'), (_req: Request, res: Response): void => {
  res.json(readData().municaoTipos)
})

router.post('/tipos', requireAuth, requireEdit('configuracoes'), validateBody(municaoTipoSchema), (req: Request, res: Response): void => {
  const body = req.body as Omit<MunicaoTipo, 'id'>
  const data = readData()

  if (data.municaoTipos.some(t => t.nome.toLowerCase() === body.nome.toLowerCase())) {
    res.status(400).json({ error: 'Já existe um tipo de munição com esse nome' }); return
  }

  const tipo: MunicaoTipo = { id: data.nextMunicaoTipoId++, ...body }
  data.municaoTipos.push(tipo)
  writeData(data)

  audit('MUNICAO_TIPO_CREATED', req, `${tipo.nome} (${tipo.precoUnitario})`)
  broadcast({ resource: 'vendas', action: 'created', por: req.user!.username })
  res.status(201).json(tipo)
})

router.patch('/tipos/:id', requireAuth, requireEdit('configuracoes'), validateBody(municaoTipoUpdateSchema), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const body = req.body as Partial<Omit<MunicaoTipo, 'id'>>
  const data = readData()
  const tipo = data.municaoTipos.find(t => t.id === id)
  if (!tipo) { res.status(404).json({ error: 'Tipo de munição não encontrado' }); return }

  if (body.nome && data.municaoTipos.some(t => t.id !== id && t.nome.toLowerCase() === body.nome!.toLowerCase())) {
    res.status(400).json({ error: 'Já existe um tipo de munição com esse nome' }); return
  }

  Object.assign(tipo, body)
  writeData(data)

  audit('MUNICAO_TIPO_UPDATED', req, `ID ${id}: ${tipo.nome}`)
  broadcast({ resource: 'vendas', action: 'updated', por: req.user!.username })
  res.json(tipo)
})

/**
 * Só remove tipos que nunca foram usados. Com histórico, o caminho é `ativo:false`
 * — apagar deixaria vendas e movimentos apontando para um id inexistente.
 */
router.delete('/tipos/:id', requireAuth, requireEdit('configuracoes'), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const data = readData()
  const idx = data.municaoTipos.findIndex(t => t.id === id)
  if (idx === -1) { res.status(404).json({ error: 'Tipo de munição não encontrado' }); return }

  const emUso = data.municaoMovimentos.some(m => m.municaoId === id)
    || data.vendas.some(v => v.itens.some(i => i.municaoId === id))
  if (emUso) {
    res.status(400).json({
      error: 'Este tipo já tem histórico e não pode ser apagado. Desative-o para tirá-lo da lista de venda.',
    }); return
  }

  data.municaoTipos.splice(idx, 1)
  writeData(data)

  audit('MUNICAO_TIPO_DELETED', req, `ID: ${id}`)
  broadcast({ resource: 'vendas', action: 'deleted', por: req.user!.username })
  res.json({ ok: true })
})

// ── Estoque ───────────────────────────────────────────────────────────────────

router.get('/estoque', requireAuth, requireView('estoqueMunicao'), (_req: Request, res: Response): void => {
  res.json(calcEstoque(readData()))
})

router.get('/movimentos', requireAuth, requireView('estoqueMunicao'), (req: Request, res: Response): void => {
  const data = readData()
  const { municaoId, tipo, page, limit } = req.query

  let movs = [...data.municaoMovimentos].sort((a, b) => b.id - a.id)
  if (tipo === 'entrada' || tipo === 'saida') movs = movs.filter(m => m.tipo === tipo)
  if (municaoId && !isNaN(Number(municaoId))) movs = movs.filter(m => m.municaoId === Number(municaoId))

  const pageNum = Math.max(1, parseInt(String(page || '1'), 10))
  const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10)))
  const total = movs.length

  res.json({
    movimentos: movs.slice((pageNum - 1) * limitNum, pageNum * limitNum),
    total, page: pageNum, limit: limitNum,
  })
})

router.post('/movimentos', requireAuth, requireEdit('estoqueMunicao'), validateBody(municaoMovimentoSchema), (req: Request, res: Response): void => {
  const body = req.body as Omit<MunicaoMovimento, 'id' | 'responsavel' | 'vendaId'>
  const data = readData()

  if (!data.municaoTipos.some(t => t.id === body.municaoId)) {
    res.status(400).json({ error: 'Tipo de munição inválido' }); return
  }
  if (body.tipo === 'saida') {
    const disponivel = estoqueMap(data).get(body.municaoId) ?? 0
    if (body.quantidade > disponivel) {
      res.status(400).json({ error: `Estoque insuficiente. Disponível: ${disponivel}` }); return
    }
  }

  const mov: MunicaoMovimento = {
    id: data.nextMunicaoMovId++,
    data: body.data,
    tipo: body.tipo,
    municaoId: body.municaoId,
    quantidade: body.quantidade,
    responsavel: req.user!.username,
    observacoes: body.observacoes,
  }
  data.municaoMovimentos.push(mov)
  writeData(data)

  audit('MUNICAO_MOVIMENTO', req, `${mov.tipo.toUpperCase()} ${mov.quantidade}x tipo ${mov.municaoId}`)
  broadcast({ resource: 'vendas', action: 'created', por: req.user!.username })
  res.status(201).json(mov)
})

// ── Vendas ────────────────────────────────────────────────────────────────────

router.get('/', requireAuth, requireView('historicoVendas'), (req: Request, res: Response): void => {
  const data = readData()
  const { status, membroId, familia, de, ate, page, limit } = req.query

  let vendas = [...data.vendas].sort((a, b) => b.id - a.id)
  if (status === 'pendente' || status === 'paga') vendas = vendas.filter(v => v.status === status)
  if (membroId && !isNaN(Number(membroId))) vendas = vendas.filter(v => v.membroId === Number(membroId))
  if (familia && typeof familia === 'string') {
    const termo = familia.toLowerCase()
    vendas = vendas.filter(v => v.familia.toLowerCase().includes(termo))
  }
  if (de && typeof de === 'string') vendas = vendas.filter(v => v.data >= de)
  if (ate && typeof ate === 'string') vendas = vendas.filter(v => v.data <= ate)

  const pageNum = Math.max(1, parseInt(String(page || '1'), 10))
  const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10)))
  const total = vendas.length
  const paginated = vendas.slice((pageNum - 1) * limitNum, pageNum * limitNum)

  // Totais sobre o conjunto filtrado inteiro, não só a página exibida
  const totalPendente = vendas.filter(v => v.status === 'pendente').reduce((s, v) => s + v.total, 0)
  const totalPago = vendas.filter(v => v.status === 'paga').reduce((s, v) => s + v.total, 0)

  res.json({ vendas: paginated, total, page: pageNum, limit: limitNum, totalPendente, totalPago })
})

/**
 * Cria a venda e as saídas de estoque.
 *
 * A validação de estoque roda sobre o carrinho INTEIRO antes de gravar qualquer
 * coisa: um carrinho com o último item em falta não pode gravar os anteriores e
 * deixar o estoque pela metade.
 */
router.post('/', requireAuth, requireEdit('vendas'), validateBody(vendaSchema), (req: Request, res: Response): void => {
  const body = req.body as {
    data: string; membroId: number; familia: string
    pagamento: 'dinheiro' | 'troca'
    itens: { municaoId: number; quantidade: number }[]
    observacoes?: string
  }
  const data = readData()

  if (!data.membros.some(m => m.id === body.membroId)) {
    res.status(400).json({ error: 'Membro inválido' }); return
  }

  // Tipos precisam existir e estar ativos
  const tiposInvalidos = body.itens.filter(i => {
    const t = data.municaoTipos.find(t => t.id === i.municaoId)
    return !t || !t.ativo
  })
  if (tiposInvalidos.length > 0) {
    res.status(400).json({ error: 'Tipo de munição inválido ou desativado no carrinho' }); return
  }

  // O mesmo tipo pode aparecer em mais de uma linha — somar antes de comparar
  const necessidade = new Map<number, number>()
  for (const i of body.itens) {
    necessidade.set(i.municaoId, (necessidade.get(i.municaoId) ?? 0) + i.quantidade)
  }
  const disponivel = estoqueMap(data)
  const faltando = [...necessidade.entries()].filter(([id, qtd]) => qtd > (disponivel.get(id) ?? 0))
  if (faltando.length > 0) {
    const detalhe = faltando.map(([id, qtd]) => {
      const nome = data.municaoTipos.find(t => t.id === id)?.nome ?? `#${id}`
      return `${nome} (pedido ${qtd}, disponível ${disponivel.get(id) ?? 0})`
    }).join('; ')
    res.status(400).json({ error: `Estoque insuficiente: ${detalhe}` }); return
  }

  // A moeda da venda é a do primeiro item; misturar moedas tornaria o total sem sentido
  const primeiroTipo = data.municaoTipos.find(t => t.id === body.itens[0].municaoId)!
  const moeda = primeiroTipo.moeda
  const moedasMisturadas = body.itens.some(i => {
    const t = data.municaoTipos.find(t => t.id === i.municaoId)!
    return t.moeda !== moeda
  })
  if (moedasMisturadas) {
    res.status(400).json({ error: 'O carrinho mistura moedas diferentes. Separe em vendas distintas.' }); return
  }

  // Snapshot de nome e preço: o histórico não pode mudar quando o preço for reajustado
  const itens: VendaItem[] = body.itens.map(i => {
    const t = data.municaoTipos.find(t => t.id === i.municaoId)!
    return {
      municaoId: t.id,
      nomeMunicao: t.nome,
      quantidade: i.quantidade,
      precoUnitario: t.precoUnitario,
      subtotal: t.precoUnitario * i.quantidade,
    }
  })

  const venda: Venda = {
    id: data.nextVendaId++,
    data: body.data,
    membroId: body.membroId,
    familia: body.familia,
    pagamento: body.pagamento,
    itens,
    total: itens.reduce((s, i) => s + i.subtotal, 0),
    moeda,
    status: 'pendente',
    criadoPor: req.user!.username,
    criadoEm: new Date().toISOString(),
    observacoes: body.observacoes,
  }
  data.vendas.push(venda)

  for (const item of itens) {
    data.municaoMovimentos.push({
      id: data.nextMunicaoMovId++,
      data: venda.data,
      tipo: 'saida',
      municaoId: item.municaoId,
      quantidade: item.quantidade,
      vendaId: venda.id,
      responsavel: req.user!.username,
      observacoes: `Venda #${venda.id} — ${venda.familia}`,
    })
  }

  writeData(data)
  audit('VENDA_CREATED', req, `#${venda.id} ${venda.familia} — ${itens.map(i => `${i.quantidade}x ${i.nomeMunicao}`).join(', ')} = ${venda.total}`)
  broadcast({ resource: 'vendas', action: 'created', por: req.user!.username })
  res.status(201).json(venda)
})

router.patch('/:id/pagar', requireAuth, requireEdit('historicoVendas'), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const data = readData()
  const venda = data.vendas.find(v => v.id === id)
  if (!venda) { res.status(404).json({ error: 'Venda não encontrada' }); return }
  if (venda.status === 'paga') { res.status(400).json({ error: 'Esta venda já está paga' }); return }

  venda.status = 'paga'
  venda.pagoEm = new Date().toISOString()
  venda.pagoPor = req.user!.username
  writeData(data)

  audit('VENDA_PAGA', req, `#${venda.id} — ${venda.total}`)
  broadcast({ resource: 'vendas', action: 'updated', por: req.user!.username })
  res.json(venda)
})

/**
 * Apaga a venda e devolve o estoque removendo os movimentos ligados a ela.
 * Sem isso a baixa ficaria órfã e o estoque menor para sempre.
 */
router.delete('/:id', requireAuth, requireEdit('historicoVendas'), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const data = readData()
  const idx = data.vendas.findIndex(v => v.id === id)
  if (idx === -1) { res.status(404).json({ error: 'Venda não encontrada' }); return }

  data.vendas.splice(idx, 1)
  const antes = data.municaoMovimentos.length
  data.municaoMovimentos = data.municaoMovimentos.filter(m => m.vendaId !== id)
  writeData(data)

  audit('VENDA_DELETED', req, `#${id} (${antes - data.municaoMovimentos.length} movimento(s) estornado(s))`)
  broadcast({ resource: 'vendas', action: 'deleted', por: req.user!.username })
  res.json({ ok: true })
})

export default router
