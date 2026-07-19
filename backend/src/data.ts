import fs from 'fs'
import path from 'path'
import bcrypt from 'bcrypt'
import { ArabiaData, Conta } from './types'
import { AREA_IDS, ensureAllAreas, fullPermissoes, normalizePermissoes, permissoesFromNivel } from './permissions'

const DATA_PATH = process.env.DATA_PATH
  ? path.resolve(process.env.DATA_PATH)
  : path.resolve(__dirname, '..', 'data.json')

const DEFAULT_DATA: ArabiaData = {
  membros: [],
  acoes: [],
  // Ações e cargos começam vazios: são listas que cada facção define do seu
  // jeito, e exemplos genéricos só davam trabalho de apagar na primeira vez.
  qrus: [],
  recrutas: [],
  recCfg: {
    notaMinima: 7,
    categorias: [
      { id: 1, nome: 'Comunicacao', peso: 1 },
      { id: 2, nome: 'Tiro', peso: 1 },
      { id: 3, nome: 'Taticas', peso: 1 },
      { id: 4, nome: 'Disciplina', peso: 1 },
    ],
  },
  patentes: ['Recruta', 'Soldado', 'Cabo', 'Sargento', 'Tenente', 'Capitao', 'Major', 'Coronel'],
  cargos: [],
  cargosPermissao: [],
  contas: [],
  bauItens: ['Municao', 'Colete', 'Kit Medico', 'Algema'],
  bauMovimentos: [],
  bauGerenciaItens: ['Municao', 'Colete', 'Kit Medico', 'Algema'],
  bauGerenciaMovimentos: [],
  tabletMovimentos: [],
  ausencias: [],
  comunicados: [],
  lavagens: [],
  lavagemPorcentagens: [],
  municaoTipos: [],
  municaoMovimentos: [],
  vendas: [],
  nextMemId: 200,
  nextAcId: 1,
  nextRecId: 1,
  nextContaId: 1,
  nextCargoPermissaoId: 1,
  nextBauMovId: 1,
  nextBauGerenciaMovId: 1,
  nextTabletMovId: 1,
  nextAusenciaId: 1,
  nextComunicadoId: 1,
  nextLavagemId: 1,
  nextLavagemPorcId: 1,
  nextMunicaoTipoId: 1,
  nextMunicaoMovId: 1,
  nextVendaId: 1,
  logo: '',
  membrosOrder: [],
}

export function readData(): ArabiaData {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8')
    return JSON.parse(JSON.stringify(DEFAULT_DATA))
  }
  /**
   * Se o arquivo EXISTE mas não pôde ser lido, este catch NÃO pode devolver
   * DEFAULT_DATA: quem chama (ensureDefaultAdmin, qualquer rota que grave)
   * escreveria os padrões por cima da base boa, e um erro passageiro de
   * leitura vira perda de dados definitiva. Já aconteceu uma vez.
   *
   * A regra é: arquivo ausente → cria padrão. Arquivo presente e ilegível →
   * estoura, e o servidor não sobe. Melhor derrubar do que apagar.
   */
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as ArabiaData
    const merged = { ...DEFAULT_DATA, ...parsed }

    merged.acoes = (merged.acoes ?? []).map(a => ({ ...a, tipo: a.tipo ?? 'tiro', moeda: a.moeda ?? 'Real' }))
    merged.tabletMovimentos = (merged.tabletMovimentos ?? []).map(m => ({ ...m, moeda: m.moeda ?? 'Real' }))
    // Cargos: áreas novas (que ainda não existem no JSON salvo) são liberadas para
    // cargos administrativos, espelhando o que ensureAllAreas já faz nas contas.
    // Sem isso, normalizePermissoes zera toda área nova e nem o admin enxerga o
    // módulo recém-adicionado.
    merged.cargosPermissao = (merged.cargosPermissao ?? []).map(c => {
      const raw = (c.permissoes ?? {}) as Record<string, { ver?: unknown; editar?: unknown }>
      const ehAdmin = !!raw.configuracoes?.editar
      const permissoes = normalizePermissoes(raw)
      if (ehAdmin) {
        for (const area of AREA_IDS) {
          if (!(area in raw)) permissoes[area] = { ver: true, editar: true }
        }
      }
      return { id: c.id, nome: c.nome, permissoes }
    })
    merged.contas = (merged.contas ?? []).map(c => {
      const legado = c as Conta & { nivel?: string }
      const base = legado.permissoes ?? permissoesFromNivel(legado.nivel)
      const ehAdmin = !!base?.configuracoes?.editar
      return {
        id: c.id,
        username: c.username,
        password: c.password,
        ativo: c.ativo,
        cargoPermissaoId: c.cargoPermissaoId,
        permissoes: ensureAllAreas(base, ehAdmin),
      }
    })

    if (merged.cargosPermissao.length === 0 && merged.contas.length > 0) {
      const seen = new Map<string, number>()
      merged.nextCargoPermissaoId = 1
      merged.contas = merged.contas.map(conta => {
        const key = JSON.stringify(conta.permissoes)
        let cargoId = seen.get(key)
        if (!cargoId) {
          cargoId = merged.nextCargoPermissaoId++
          seen.set(key, cargoId)
          merged.cargosPermissao.push({
            id: cargoId,
            nome: conta.permissoes.configuracoes?.editar ? 'Administrador' : `Cargo ${cargoId}`,
            permissoes: conta.permissoes,
          })
        }
        return { ...conta, cargoPermissaoId: cargoId }
      })
    } else {
      const highest = Math.max(0, ...merged.cargosPermissao.map(c => c.id))
      merged.nextCargoPermissaoId = Math.max(merged.nextCargoPermissaoId ?? 1, highest + 1)
    }

    const cargoIds = new Set(merged.cargosPermissao.map(c => c.id))
    merged.contas = merged.contas.map(conta => ({
      ...conta,
      cargoPermissaoId: conta.cargoPermissaoId && cargoIds.has(conta.cargoPermissaoId) ? conta.cargoPermissaoId : undefined,
    }))

    return merged
  } catch (err) {
    throw new Error(
      `[ARABIA] Falha ao ler ${DATA_PATH}. O servidor foi interrompido de propósito ` +
      `para não sobrescrever a base com dados vazios. Verifique o arquivo (JSON válido?) ` +
      `ou restaure um backup. Causa: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

export function writeData(data: ArabiaData): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

export function reconcileAusencias(data: ArabiaData): boolean {
  const hoje = new Date().toISOString().slice(0, 10)
  let changed = false
  for (const a of data.ausencias) {
    if (a.status === 'ativa' && a.dataFim < hoje) {
      a.status = 'encerrada'
      changed = true
      const m = data.membros.find(mm => mm.id === a.membroId)
      if (m && String(m.status) === 'AusÃªncia') {
        const aindaAusente = data.ausencias.some(o =>
          o.id !== a.id && o.membroId === a.membroId && o.status === 'ativa' &&
          o.dataInicio <= hoje && o.dataFim >= hoje,
        )
        if (!aindaAusente) m.status = 'Ativo'
      }
    }
  }
  return changed
}

export async function ensureDefaultAdmin(): Promise<void> {
  const data = readData()
  if (data.contas.length === 0) {
    const hashed = await bcrypt.hash('admin123', 12)
    data.cargosPermissao = [{ id: 1, nome: 'Administrador', permissoes: fullPermissoes() }]
    data.contas.push({
      id: 1,
      username: 'admin',
      password: hashed,
      ativo: true,
      cargoPermissaoId: 1,
      permissoes: fullPermissoes(),
    })
    data.nextContaId = 2
    data.nextCargoPermissaoId = 2
    writeData(data)
    console.log('[ARABIA] Conta admin padrao criada: admin / admin123')
  }
}
