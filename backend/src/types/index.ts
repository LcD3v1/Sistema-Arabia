export type StatusMembro = 'Ativo' | 'Inativo' | 'Ausência'

export interface Permissao {
  ver: boolean
  editar: boolean
}
export type Permissoes = Record<string, Permissao>
export interface CargoPermissao {
  id: number
  nome: string
  permissoes: Permissoes
}
export type TipoAcao = 'tiro' | 'fuga'
export type ResultadoTiro = 'Vitória' | 'Derrota' | 'Empate'
export type ResultadoFuga = 'Sucesso' | 'Falha'
export type ResultadoAcao = ResultadoTiro | ResultadoFuga
export type ResultadoRecruita = 'Aprovado' | 'Reprovado'
export type TipoMovimentoBau = 'entrada' | 'saida'

export interface Membro {
  id: number
  badge: string
  passaporte: string
  policial: string
  patenteNPD: string
  patenteInterna: string
  status: StatusMembro
  entrada: string
  promocao: string
  adv1: boolean
  adv2: boolean
  adv3: boolean
  ordem?: number
}

export interface ParticipanteAcao {
  memberId: number
  patenteUnidade: string
}

export interface ParticipanteExterno {
  nome: string
  patente?: string
}

export type Moeda = 'Real' | 'Dólar'

export interface Acao {
  id: number
  tipo: TipoAcao
  data: string
  horario?: string
  valor?: number
  moeda?: Moeda
  qru: string
  resultado: ResultadoAcao
  participants: ParticipanteAcao[]
  participantesExtras?: ParticipanteExterno[]
  comandante?: string
}

export type TipoMovimentoTablet = 'deposito' | 'saque'

export interface TabletMovimento {
  id: number
  data: string
  tipo: TipoMovimentoTablet
  membroId: number
  valor: number
  moeda: Moeda
  responsavel?: string
  observacoes?: string
}

export interface BauMovimento {
  id: number
  data: string
  tipo: TipoMovimentoBau
  membroId: number
  item: string
  quantidade: number
  responsavel?: string
  observacoes?: string
}

export interface LavagemRegistro {
  id: number
  data: string
  familia: string
  dinheiroSujo: number
  dinheiroLimpo: number
  porcentagem?: number
  porcentagemNome?: string
  lucroFamiliaPorcentagem?: number
  responsavel?: string
  observacoes?: string
  criadoEm: string
}

export interface LavagemPorcentagem {
  id: number
  nome: string
  valor: number
  lucroFamiliaPorcentagem?: number
}

// ── Vendas de munição ────────────────────────────────────────────────────────

export type StatusVenda = 'pendente' | 'paga'
export type PagamentoVenda = 'dinheiro' | 'troca'
export type TipoMovimentoMunicao = 'entrada' | 'saida'

export interface MunicaoTipo {
  id: number
  nome: string
  precoUnitario: number
  moeda: Moeda
  /** Aposenta o tipo sem apagar o histórico que o referencia. */
  ativo: boolean
}

export interface MunicaoMovimento {
  id: number
  data: string
  tipo: TipoMovimentoMunicao
  municaoId: number
  quantidade: number
  /** Preenchido quando a saída veio de uma venda — dá rastreabilidade e permite estorno. */
  vendaId?: number
  responsavel?: string
  observacoes?: string
}

/**
 * `nomeMunicao` e `precoUnitario` são cópias do momento da venda, de propósito:
 * se o preço for reajustado depois, a venda antiga precisa continuar mostrando
 * o que foi cobrado na época.
 */
export interface VendaItem {
  municaoId: number
  nomeMunicao: string
  quantidade: number
  precoUnitario: number
  subtotal: number
}

export interface Venda {
  id: number
  data: string
  /** Membro que fez a venda. */
  membroId: number
  familia: string
  pagamento: PagamentoVenda
  itens: VendaItem[]
  total: number
  moeda: Moeda
  status: StatusVenda
  criadoPor?: string
  criadoEm: string
  pagoEm?: string
  pagoPor?: string
  observacoes?: string
}

export type StatusComunicado = 'Aberto' | 'Em andamento' | 'Concluído' | 'Cancelado'

export interface HistoricoAlteracao {
  em: string
  por: string
  acao: string
}

export interface Comunicado {
  id: number
  titulo: string
  descricao: string
  categoria?: string
  status: StatusComunicado
  criadoPorId: number
  criadoPor: string
  criadoEm: string
  atualizadoEm: string
  historico: HistoricoAlteracao[]
}

export type StatusAusencia = 'ativa' | 'encerrada'

export interface Ausencia {
  id: number
  membroId: number
  dataInicio: string
  dataFim: string
  motivo?: string
  status: StatusAusencia
  criadoPor?: string
}

export interface Conta {
  id: number
  username: string
  password: string
  ativo: boolean
  cargoPermissaoId?: number
  permissoes: Permissoes
}

export interface CategoriaRecrutamento {
  id: number
  nome: string
  peso: number
}

export interface RecCfg {
  notaMinima: number
  categorias: CategoriaRecrutamento[]
}

export interface AvaliacaoIndividual {
  contaId: number
  username: string
  scores: Record<string, number>
  total: number
  observacoes?: string
  data: string
}

export interface Recruta {
  id: number
  nome: string
  data: string
  avaliacoes: AvaliacaoIndividual[]
  resultado?: ResultadoRecruita
  status: 'aberto' | 'fechado'
  observacoes?: string
}

export interface ArabiaData {
  membros: Membro[]
  acoes: Acao[]
  qrus: string[]
  recrutas: Recruta[]
  recCfg: RecCfg
  patentes: string[]
  cargos: string[]
  cargosPermissao: CargoPermissao[]
  contas: Conta[]
  bauItens: string[]
  bauMovimentos: BauMovimento[]
  bauGerenciaItens: string[]
  bauGerenciaMovimentos: BauMovimento[]
  tabletMovimentos: TabletMovimento[]
  ausencias: Ausencia[]
  comunicados: Comunicado[]
  lavagens: LavagemRegistro[]
  lavagemPorcentagens: LavagemPorcentagem[]
  municaoTipos: MunicaoTipo[]
  municaoMovimentos: MunicaoMovimento[]
  vendas: Venda[]
  nextMemId: number
  nextAcId: number
  nextRecId: number
  nextContaId: number
  nextCargoPermissaoId: number
  nextBauMovId: number
  nextBauGerenciaMovId: number
  nextTabletMovId: number
  nextAusenciaId: number
  nextComunicadoId: number
  nextLavagemId: number
  nextLavagemPorcId: number
  nextMunicaoTipoId: number
  nextMunicaoMovId: number
  nextVendaId: number
  logo: string
  membrosOrder: number[]
}

export interface AuthPayload {
  contaId: number
  username: string
}
