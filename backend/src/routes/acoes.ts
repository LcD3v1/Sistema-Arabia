import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireEdit } from '../middleware/roles'
import { validateBody, acaoSchema } from '../middleware/validate'
import { audit } from '../security/audit'
import { readData, writeData } from '../data'
import { broadcast } from '../realtime'
import { Acao } from '../types'

const router = Router()

router.get('/export/csv', requireAuth, (req: Request, res: Response): void => {
  const data = readData()
  const membroMap = new Map(data.membros.map(m => [m.id, m]))
  const { tipo } = req.query

  const rows: string[] = ['ID,Tipo,Data,Hora,Valor,Moeda,QRU,Resultado,Participantes']
  let sorted = [...data.acoes].sort((a, b) => b.id - a.id)
  if (tipo === 'tiro' || tipo === 'fuga') sorted = sorted.filter(a => a.tipo === tipo)

  for (const acao of sorted) {
    const membersStr = acao.participants
      .map(p => {
        const m = membroMap.get(p.memberId)
        return m ? `${p.patenteUnidade} ${m.policial}` : `ID:${p.memberId}`
      })
      .join(' | ')

    const extrasStr = (acao.participantesExtras ?? [])
      .map(e => e.patente ? `${e.patente} ${e.nome} [EXT]` : `${e.nome} [EXT]`)
      .join(' | ')

    const participantes = [membersStr, extrasStr].filter(Boolean).join(' | ')
    rows.push([acao.id, acao.tipo, acao.data, acao.horario ?? '', acao.valor ?? 0, acao.moeda ?? 'Real', acao.qru, acao.resultado, `"${participantes}"`].join(','))
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="acoes.csv"')
  res.send('﻿' + rows.join('\n'))
})

router.get('/', requireAuth, (req: Request, res: Response): void => {
  const data = readData()
  const { qru, resultado, tipo, page, limit } = req.query

  const VALID_RESULTADOS = ['Vitória', 'Derrota', 'Sucesso', 'Falha']
  let acoes = [...data.acoes].sort((a, b) => b.id - a.id)

  if (tipo === 'tiro' || tipo === 'fuga') acoes = acoes.filter(a => a.tipo === tipo)
  if (qru && typeof qru === 'string') acoes = acoes.filter(a => a.qru === qru)
  if (resultado && typeof resultado === 'string' && VALID_RESULTADOS.includes(resultado)) {
    acoes = acoes.filter(a => a.resultado === resultado)
  }

  const pageNum = Math.max(1, parseInt(String(page || '1'), 10))
  const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10)))
  const total = acoes.length
  const paginated = acoes.slice((pageNum - 1) * limitNum, pageNum * limitNum)

  res.json({ acoes: paginated, total, page: pageNum, limit: limitNum })
})

router.post('/', requireAuth, requireEdit('registrar'), validateBody(acaoSchema), (req: Request, res: Response): void => {
  const body = req.body as Omit<Acao, 'id'>
  const data = readData()

  // Validar que participantes existem
  const existingIds = new Set(data.membros.map(m => m.id))
  const invalidParticipants = body.participants.filter(p => !existingIds.has(p.memberId))
  if (invalidParticipants.length > 0) {
    res.status(400).json({ error: 'Participantes inválidos', ids: invalidParticipants.map(p => p.memberId) })
    return
  }

  const novaAcao: Acao = {
    id: data.nextAcId,
    tipo: body.tipo,
    data: body.data,
    horario: body.horario,
    valor: body.valor ?? 0,
    moeda: body.moeda ?? 'Real',
    qru: body.qru,
    resultado: body.resultado,
    participants: body.participants,
    participantesExtras: body.participantesExtras ?? [],
    comandante: body.comandante,
  }

  data.acoes.push(novaAcao)
  data.nextAcId++
  writeData(data)

  audit('ACAO_CREATED', req, `ID: ${novaAcao.id} | ${novaAcao.tipo.toUpperCase()} | QRU: ${novaAcao.qru} | ${novaAcao.resultado}`)
  broadcast({ resource: 'acoes', action: 'created', por: req.user!.username })
  res.status(201).json(novaAcao)
})

router.delete('/:id', requireAuth, requireEdit('historico'), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const data = readData()
  const idx = data.acoes.findIndex(a => a.id === id)
  if (idx === -1) { res.status(404).json({ error: 'Ação não encontrada' }); return }

  data.acoes.splice(idx, 1)
  writeData(data)

  audit('ACAO_DELETED', req, `ID: ${id}`)
  broadcast({ resource: 'acoes', action: 'deleted', por: req.user!.username })
  res.json({ ok: true })
})

export default router
