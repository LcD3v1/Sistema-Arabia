import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireView, requireEdit } from '../middleware/roles'
import { validateBody, comunicadoSchema, comunicadoUpdateSchema } from '../middleware/validate'
import { audit } from '../security/audit'
import { readData, writeData } from '../data'
import { broadcast } from '../realtime'
import { Comunicado, StatusComunicado } from '../types'

const router = Router()

// ── Listar (com filtros e busca) ───────────────────────────────────────────────

router.get('/', requireAuth, requireView('comunicados'), (req: Request, res: Response): void => {
  const data = readData()
  const { status, categoria, usuario, dataDe, dataAte, q } = req.query

  let lista = [...data.comunicados].sort((a, b) => b.id - a.id)

  if (typeof status === 'string' && status) lista = lista.filter(c => c.status === status)
  if (typeof categoria === 'string' && categoria) lista = lista.filter(c => c.categoria === categoria)
  if (typeof usuario === 'string' && usuario) lista = lista.filter(c => c.criadoPor === usuario)
  if (typeof dataDe === 'string' && dataDe) lista = lista.filter(c => c.criadoEm.slice(0, 10) >= dataDe)
  if (typeof dataAte === 'string' && dataAte) lista = lista.filter(c => c.criadoEm.slice(0, 10) <= dataAte)
  if (typeof q === 'string' && q.trim()) {
    const termo = q.trim().toLowerCase()
    lista = lista.filter(c =>
      c.titulo.toLowerCase().includes(termo) || c.descricao.toLowerCase().includes(termo),
    )
  }

  res.json({ comunicados: lista, total: data.comunicados.length })
})

// ── Criar ───────────────────────────────────────────────────────────────────

router.post('/', requireAuth, requireEdit('comunicados'), validateBody(comunicadoSchema), (req: Request, res: Response): void => {
  const body = req.body as { titulo: string; descricao: string; categoria?: string; status: StatusComunicado }
  const data = readData()
  const agora = new Date().toISOString()
  const autor = req.user!.username

  const novo: Comunicado = {
    id: data.nextComunicadoId,
    titulo: body.titulo,
    descricao: body.descricao,
    categoria: body.categoria || '',
    status: body.status,
    criadoPorId: req.user!.contaId,
    criadoPor: autor,
    criadoEm: agora,
    atualizadoEm: agora,
    historico: [{ em: agora, por: autor, acao: 'Criou o comunicado' }],
  }
  data.comunicados.push(novo)
  data.nextComunicadoId++
  writeData(data)

  audit('COMUNICADO_CRIADO', req, `ID: ${novo.id} | ${novo.titulo}`)
  broadcast({ resource: 'comunicados', action: 'created', por: autor, titulo: novo.titulo })
  res.status(201).json(novo)
})

// ── Editar ────────────────────────────────────────────────────────────────────

router.put('/:id', requireAuth, requireEdit('comunicados'), validateBody(comunicadoUpdateSchema), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const data = readData()
  const c = data.comunicados.find(x => x.id === id)
  if (!c) { res.status(404).json({ error: 'Comunicado não encontrado' }); return }

  const body = req.body as { titulo?: string; descricao?: string; categoria?: string; status?: StatusComunicado }
  const mudancas: string[] = []

  if (body.titulo !== undefined && body.titulo !== c.titulo) { mudancas.push('título'); c.titulo = body.titulo }
  if (body.descricao !== undefined && body.descricao !== c.descricao) { mudancas.push('descrição'); c.descricao = body.descricao }
  if (body.categoria !== undefined && body.categoria !== c.categoria) { mudancas.push('categoria'); c.categoria = body.categoria }
  if (body.status !== undefined && body.status !== c.status) { mudancas.push(`status: ${c.status} → ${body.status}`); c.status = body.status }

  if (mudancas.length === 0) { res.json(c); return }

  const agora = new Date().toISOString()
  const autor = req.user!.username
  c.atualizadoEm = agora
  c.historico.push({ em: agora, por: autor, acao: 'Editou — ' + mudancas.join(', ') })
  writeData(data)

  audit('COMUNICADO_EDITADO', req, `ID: ${id} | ${mudancas.join(', ')}`)
  broadcast({ resource: 'comunicados', action: 'updated', por: autor, titulo: c.titulo })
  res.json(c)
})

// ── Excluir ──────────────────────────────────────────────────────────────────

router.delete('/:id', requireAuth, requireEdit('comunicados'), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const data = readData()
  const idx = data.comunicados.findIndex(x => x.id === id)
  if (idx === -1) { res.status(404).json({ error: 'Comunicado não encontrado' }); return }

  const [removido] = data.comunicados.splice(idx, 1)
  writeData(data)

  audit('COMUNICADO_DELETED', req, `ID: ${id} | ${removido.titulo}`)
  broadcast({ resource: 'comunicados', action: 'deleted', por: req.user!.username, titulo: removido.titulo })
  res.json({ ok: true })
})

export default router
