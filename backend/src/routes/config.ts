import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { requireAuth } from '../middleware/auth'
import { requireView, requireEdit } from '../middleware/roles'
import { criticalLimiter } from '../middleware/rateLimiter'
import {
  validateBody,
  qruSchema, patenteSchema, cargoSchema,
  createContaSchema, updateContaSchema,
  createCargoPermissaoSchema, updateCargoPermissaoSchema,
  logoSchema, recCfgSchema,
  reorderPatenteSchema, bauItemSchema, lavagemPorcentagemSchema,
} from '../middleware/validate'
import { audit, readAuditLog } from '../security/audit'
import { readData, writeData } from '../data'
import { normalizePermissoes, countConfigAdmins, resolveContaPermissoes } from '../permissions'
import { CargoPermissao, Conta, ArabiaData } from '../types'

const router = Router()

// Atalho: edição de Configurações
const canEditConfig = requireEdit('configuracoes')
const canViewConfig = requireView('configuracoes')

function serializeConta(conta: Conta, cargosPermissao: CargoPermissao[]) {
  const { password: _p, ...rest } = conta
  const cargo = conta.cargoPermissaoId
    ? cargosPermissao.find(c => c.id === conta.cargoPermissaoId)
    : undefined
  return {
    ...rest,
    cargoPermissaoNome: cargo?.nome,
    permissoes: resolveContaPermissoes(conta, cargosPermissao),
  }
}

// ── QRUs ──────────────────────────────────────────────────────────────────────

router.get('/qrus', requireAuth, (_req, res) => res.json(readData().qrus))

router.post('/qrus', requireAuth, canEditConfig, validateBody(qruSchema), (req: Request, res: Response): void => {
  const { nome } = req.body as { nome: string }
  const data = readData()
  if (data.qrus.includes(nome)) { res.status(409).json({ error: 'Ação já existe' }); return }
  data.qrus.push(nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Ação criada: ${nome}`)
  res.status(201).json(data.qrus)
})

router.delete('/qrus/:nome', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const nome = String(req.params.nome).slice(0, 50)
  const data = readData()
  data.qrus = data.qrus.filter(q => q !== nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Ação removida: ${nome}`)
  res.json(data.qrus)
})

// ── Hierarquia (patentes) ──────────────────────────────────────────────────────

router.get('/patentes', requireAuth, (_req, res) => res.json(readData().patentes))

router.post('/patentes', requireAuth, canEditConfig, validateBody(patenteSchema), (req: Request, res: Response): void => {
  const { nome } = req.body as { nome: string }
  const data = readData()
  data.patentes.push(nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Hierarquia criada: ${nome}`)
  res.status(201).json(data.patentes)
})

router.put('/patentes/reorder', requireAuth, canEditConfig, validateBody(reorderPatenteSchema), (req: Request, res: Response): void => {
  const { patentes } = req.body as { patentes: string[] }
  const data = readData()
  data.patentes = patentes.map(p => String(p).slice(0, 50))
  writeData(data)
  res.json(data.patentes)
})

router.delete('/patentes/:nome', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const nome = String(req.params.nome).slice(0, 50)
  const data = readData()
  data.patentes = data.patentes.filter(p => p !== nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Hierarquia removida: ${nome}`)
  res.json(data.patentes)
})

// ── Cargos ────────────────────────────────────────────────────────────────────

router.get('/cargos', requireAuth, (_req, res) => res.json(readData().cargos))

router.post('/cargos', requireAuth, canEditConfig, validateBody(cargoSchema), (req: Request, res: Response): void => {
  const { nome } = req.body as { nome: string }
  const data = readData()
  data.cargos.push(nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Cargo criado: ${nome}`)
  res.status(201).json(data.cargos)
})

router.delete('/cargos/:nome', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const nome = String(req.params.nome).slice(0, 50)
  const data = readData()
  data.cargos = data.cargos.filter(c => c !== nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Cargo removido: ${nome}`)
  res.json(data.cargos)
})

// ── Baú: itens ──────────────────────────────────────────────────────────────

router.get('/bau-itens', requireAuth, (_req, res) => res.json(readData().bauItens))

router.post('/bau-itens', requireAuth, canEditConfig, validateBody(bauItemSchema), (req: Request, res: Response): void => {
  const { nome } = req.body as { nome: string }
  const data = readData()
  if (data.bauItens.includes(nome)) { res.status(409).json({ error: 'Item já existe' }); return }
  data.bauItens.push(nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Item de baú criado: ${nome}`)
  res.status(201).json(data.bauItens)
})

router.delete('/bau-itens/:nome', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const nome = String(req.params.nome).slice(0, 50)
  const data = readData()
  data.bauItens = data.bauItens.filter(i => i !== nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Item de baú removido: ${nome}`)
  res.json(data.bauItens)
})

// ── Baú Gerência: itens ───────────────────────────────────────────────────────

router.get('/bau-gerencia-itens', requireAuth, (_req, res) => res.json(readData().bauGerenciaItens))

router.post('/bau-gerencia-itens', requireAuth, canEditConfig, validateBody(bauItemSchema), (req: Request, res: Response): void => {
  const { nome } = req.body as { nome: string }
  const data = readData()
  if (data.bauGerenciaItens.includes(nome)) { res.status(409).json({ error: 'Item já existe' }); return }
  data.bauGerenciaItens.push(nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Item de baú gerência criado: ${nome}`)
  res.status(201).json(data.bauGerenciaItens)
})

router.delete('/bau-gerencia-itens/:nome', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const nome = String(req.params.nome).slice(0, 50)
  const data = readData()
  data.bauGerenciaItens = data.bauGerenciaItens.filter(i => i !== nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Item de baú gerência removido: ${nome}`)
  res.json(data.bauGerenciaItens)
})

// ── Lavagem: porcentagens ─────────────────────────────────────────────────────

router.get('/lavagem-porcentagens', requireAuth, (_req, res) => res.json(readData().lavagemPorcentagens))

router.post('/lavagem-porcentagens', requireAuth, canEditConfig, validateBody(lavagemPorcentagemSchema), (req: Request, res: Response): void => {
  const { nome, valor, lucroFamiliaPorcentagem } = req.body as { nome: string; valor: number; lucroFamiliaPorcentagem?: number }
  const data = readData()
  const nova = { id: data.nextLavagemPorcId, nome, valor, lucroFamiliaPorcentagem }
  data.lavagemPorcentagens.push(nova)
  data.nextLavagemPorcId++
  writeData(data)
  audit('CONFIG_UPDATED', req, `Porcentagem de lavagem criada: ${nome} (${valor}% | lucro ${lucroFamiliaPorcentagem ?? 100}%)`)
  res.status(201).json(data.lavagemPorcentagens)
})

router.put('/lavagem-porcentagens/:id', requireAuth, canEditConfig, validateBody(lavagemPorcentagemSchema), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  const { nome, valor, lucroFamiliaPorcentagem } = req.body as { nome: string; valor: number; lucroFamiliaPorcentagem?: number }
  const data = readData()
  const p = data.lavagemPorcentagens.find(x => x.id === id)
  if (!p) { res.status(404).json({ error: 'Porcentagem não encontrada' }); return }
  p.nome = nome; p.valor = valor; p.lucroFamiliaPorcentagem = lucroFamiliaPorcentagem
  writeData(data)
  audit('CONFIG_UPDATED', req, `Porcentagem de lavagem atualizada: ${nome} (${valor}% | lucro ${lucroFamiliaPorcentagem ?? 100}%)`)
  res.json(data.lavagemPorcentagens)
})

router.delete('/lavagem-porcentagens/:id', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  const data = readData()
  data.lavagemPorcentagens = data.lavagemPorcentagens.filter(p => p.id !== id)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Porcentagem de lavagem removida: ${id}`)
  res.json(data.lavagemPorcentagens)
})

// ── Contas ────────────────────────────────────────────────────────────────────

router.get('/cargos-permissao', requireAuth, canViewConfig, (_req, res) => {
  res.json(readData().cargosPermissao)
})

router.post('/cargos-permissao', requireAuth, canEditConfig, validateBody(createCargoPermissaoSchema), (req: Request, res: Response): void => {
  const { nome, permissoes } = req.body as { nome: string; permissoes: unknown }
  const data = readData()
  if (data.cargosPermissao.some(c => c.nome.toLowerCase() === nome.toLowerCase())) {
    res.status(409).json({ error: 'Cargo de permissao ja existe' }); return
  }
  const novo: CargoPermissao = {
    id: data.nextCargoPermissaoId,
    nome,
    permissoes: normalizePermissoes(permissoes),
  }
  data.cargosPermissao.push(novo)
  data.nextCargoPermissaoId++
  writeData(data)
  audit('CONFIG_UPDATED', req, `Cargo de permissao criado: ${nome}`)
  res.status(201).json(novo)
})

router.put('/cargos-permissao/:id', requireAuth, canEditConfig, validateBody(updateCargoPermissaoSchema), (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID invalido' }); return }

  const { nome, permissoes } = req.body as { nome?: string; permissoes?: unknown }
  const data = readData()
  const cargo = data.cargosPermissao.find(c => c.id === id)
  if (!cargo) { res.status(404).json({ error: 'Cargo de permissao nao encontrado' }); return }

  const nomeAnterior = cargo.nome
  const permissoesAnteriores = cargo.permissoes
  if (nome && nome !== cargo.nome) {
    if (data.cargosPermissao.some(c => c.id !== id && c.nome.toLowerCase() === nome.toLowerCase())) {
      res.status(409).json({ error: 'Cargo de permissao ja existe' }); return
    }
    cargo.nome = nome
  }
  if (permissoes !== undefined) cargo.permissoes = normalizePermissoes(permissoes)

  if (countConfigAdmins(data.contas, data.cargosPermissao) < 1) {
    cargo.nome = nomeAnterior
    cargo.permissoes = permissoesAnteriores
    audit('PRIVILEGE_ESCALATION_ATTEMPT', req, `Bloqueado: cargo ${id} deixaria o sistema sem admin de Configuracoes`)
    res.status(400).json({ error: 'Operacao bloqueada: precisa existir ao menos uma conta ativa com permissao de editar Configuracoes.' })
    return
  }

  writeData(data)
  audit('CONFIG_UPDATED', req, `Cargo de permissao atualizado: ${cargo.nome}`)
  res.json(cargo)
})

router.delete('/cargos-permissao/:id', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID invalido' }); return }

  const data = readData()
  if (data.contas.some(c => c.cargoPermissaoId === id)) {
    res.status(400).json({ error: 'Nao e possivel excluir um cargo vinculado a contas.' })
    return
  }
  const before = data.cargosPermissao.length
  data.cargosPermissao = data.cargosPermissao.filter(c => c.id !== id)
  if (data.cargosPermissao.length === before) { res.status(404).json({ error: 'Cargo de permissao nao encontrado' }); return }
  writeData(data)
  audit('CONFIG_UPDATED', req, `Cargo de permissao removido: ${id}`)
  res.json({ ok: true })
})

router.get('/contas', requireAuth, canViewConfig, (_req, res) => {
  const data = readData()
  res.json(data.contas.map(conta => serializeConta(conta, data.cargosPermissao)))
})

router.post('/contas', requireAuth, canEditConfig, validateBody(createContaSchema), async (req: Request, res: Response): Promise<void> => {
  const { username, password, cargoPermissaoId, permissoes } = req.body as { username: string; password: string; cargoPermissaoId?: number; permissoes?: unknown }
  // Hash ANTES de ler os dados — evita janela de corrida (read-modify-write) com o await
  const hashed = await bcrypt.hash(password, 12)
  const data = readData()

  if (data.contas.some(c => c.username.toLowerCase() === username.toLowerCase())) {
    res.status(409).json({ error: 'Nome de usuário já existe' }); return
  }

  const cargoId = cargoPermissaoId ?? data.cargosPermissao[0]?.id
  const cargo = data.cargosPermissao.find(c => c.id === cargoId)
  if (!cargo) {
    res.status(400).json({ error: 'Selecione um cargo de permissao valido.' }); return
  }

  const novaConta: Conta = {
    id: data.nextContaId,
    username: username.trim(),
    password: hashed,
    ativo: true,
    cargoPermissaoId: cargoId,
    permissoes: permissoes !== undefined ? normalizePermissoes(permissoes) : cargo.permissoes,
  }

  data.contas.push(novaConta)
  data.nextContaId++
  writeData(data)

  audit('ACCOUNT_CREATED', req, `Usuário: ${novaConta.username}`)
  res.status(201).json(serializeConta(novaConta, data.cargosPermissao))
})

router.put('/contas/:id', requireAuth, canEditConfig, validateBody(updateContaSchema), async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const { username, cargoPermissaoId, permissoes, ativo, password } = req.body as { username?: string; cargoPermissaoId?: number; permissoes?: unknown; ativo?: boolean; password?: string }
  // Hash ANTES de ler os dados — evita janela de corrida com o await
  const novoHash = password ? await bcrypt.hash(password, 12) : undefined

  const data = readData()
  const conta = data.contas.find(c => c.id === id)
  if (!conta) { res.status(404).json({ error: 'Conta não encontrada' }); return }

  const changes: string[] = []

  if (username && username.trim() && username.trim() !== conta.username) {
    const novo = username.trim()
    if (data.contas.some(c => c.id !== id && c.username.toLowerCase() === novo.toLowerCase())) {
      res.status(409).json({ error: 'Nome de usuário já existe' }); return
    }
    changes.push(`usuário: ${conta.username}→${novo}`)
    conta.username = novo
  }
  if (permissoes !== undefined) {
    conta.permissoes = normalizePermissoes(permissoes)
    changes.push('permissões atualizadas')
  }
  if (cargoPermissaoId !== undefined) {
    const cargo = data.cargosPermissao.find(c => c.id === cargoPermissaoId)
    if (!cargo) { res.status(400).json({ error: 'Cargo de permissao invalido.' }); return }
    conta.cargoPermissaoId = cargoPermissaoId
    conta.permissoes = cargo.permissoes
    changes.push(`cargo: ${cargo.nome}`)
  }
  if (typeof ativo === 'boolean') {
    conta.ativo = ativo
    changes.push(`ativo: ${ativo}`)
  }
  if (password) {
    conta.password = novoHash!
    changes.push('senha alterada')
  }

  // Trava anti-lockout: nunca deixar o sistema sem ninguém que gerencie Configurações
  if (countConfigAdmins(data.contas, data.cargosPermissao) < 1) {
    audit('PRIVILEGE_ESCALATION_ATTEMPT', req, `Bloqueado: deixaria o sistema sem admin de Configurações (conta ${id})`)
    res.status(400).json({ error: 'Operação bloqueada: precisa existir ao menos uma conta ativa com permissão de editar Configurações.' })
    return
  }

  writeData(data)
  audit('ACCOUNT_UPDATED', req, `ID: ${id} | ${changes.join(', ')}`)
  res.json(serializeConta(conta, data.cargosPermissao))
})

router.delete('/contas/:id', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  if (req.user!.contaId === id) {
    res.status(400).json({ error: 'Não é possível excluir sua própria conta' }); return
  }

  const data = readData()
  const idx = data.contas.findIndex(c => c.id === id)
  if (idx === -1) { res.status(404).json({ error: 'Conta não encontrada' }); return }

  const [removida] = data.contas.splice(idx, 1)

  if (countConfigAdmins(data.contas, data.cargosPermissao) < 1) {
    res.status(400).json({ error: 'Operação bloqueada: precisa existir ao menos uma conta ativa com permissão de editar Configurações.' })
    return
  }

  writeData(data)
  audit('ACCOUNT_DELETED', req, `Usuário: ${removida.username}`)
  res.json({ ok: true })
})

// ── Logo ──────────────────────────────────────────────────────────────────────

router.get('/logo', (_req, res) => res.json({ logo: readData().logo }))

router.put('/logo', requireAuth, canEditConfig, validateBody(logoSchema), (req: Request, res: Response): void => {
  const { logo } = req.body as { logo: string }
  const data = readData()
  data.logo = logo
  writeData(data)
  audit('LOGO_UPDATED', req)
  res.json({ ok: true })
})

router.delete('/logo', requireAuth, canEditConfig, (_req, res) => {
  const data = readData()
  data.logo = ''
  writeData(data)
  audit('LOGO_DELETED', _req as Request)
  res.json({ ok: true })
})

// ── Recrutamento (config legada, mantida) ──────────────────────────────────────

router.get('/recrutamento', requireAuth, (_req, res) => res.json(readData().recCfg))

router.put('/recrutamento', requireAuth, canEditConfig, validateBody(recCfgSchema), (req: Request, res: Response): void => {
  const data = readData()
  const { notaMinima, categorias } = req.body
  if (typeof notaMinima === 'number') data.recCfg.notaMinima = notaMinima
  if (Array.isArray(categorias)) data.recCfg.categorias = categorias
  writeData(data)
  audit('CONFIG_UPDATED', req, 'Configuração de recrutamento atualizada')
  res.json(data.recCfg)
})

// ── Backup / Restore ──────────────────────────────────────────────────────────

router.get('/backup', requireAuth, canViewConfig, (req: Request, res: Response): void => {
  const data = readData()
  const sanitized = {
    ...data,
    contas: data.contas.map(({ password: _p, ...rest }) => ({ ...rest, password: '[REDACTED]' })),
  }
  audit('BACKUP_DOWNLOADED', req)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="arabia-backup-${new Date().toISOString().slice(0, 10)}.json"`)
  res.send(JSON.stringify(sanitized, null, 2))
})

router.post('/restore', requireAuth, canEditConfig, criticalLimiter, (req: Request, res: Response): void => {
  const body = req.body as Partial<ArabiaData>

  const required: (keyof ArabiaData)[] = ['membros', 'acoes', 'contas']
  if (!required.every(k => Array.isArray(body[k]))) {
    res.status(400).json({ error: 'Backup inválido — campos obrigatórios ausentes' }); return
  }

  const contasSemSenha = (body.contas as Conta[]).filter(c => !c.password || c.password === '[REDACTED]')
  if (contasSemSenha.length > 0) {
    res.status(400).json({ error: 'Backup não pode ser restaurado: senhas ausentes. Use um backup completo gerado pelo sistema.' })
    return
  }

  writeData(body as ArabiaData)
  audit('RESTORE_EXECUTED', req, `Membros: ${body.membros?.length} | Ações: ${body.acoes?.length}`)
  res.json({ ok: true })
})

// ── Audit Log ───────────────────────────────────────────────────────────────

router.get('/audit-log', requireAuth, canViewConfig, (req: Request, res: Response): void => {
  const limit = Math.min(500, Math.max(10, parseInt(String(req.query.limit || '100'), 10)))
  res.json(readAuditLog(limit))
})

export default router
