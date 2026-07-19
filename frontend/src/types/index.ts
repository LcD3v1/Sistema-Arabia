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
export type ResultadoTiro = 'Vitória' | 'Derrota'
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

export interface SaldoMoeda {
  depositos: number
  saques: number
  saldo: number
}
export type TabletSaldo = Record<Moeda, SaldoMoeda>

export interface TabletMovimentosResponse {
  movimentos: TabletMovimento[]
  total: number
  page: number
  limit: number
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

export interface BauEstoqueItem {
  item: string
  entradas: number
  saidas: number
  quantidade: number
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

export interface LavagemResponse {
  lavagens: LavagemRegistro[]
  total: number
  totalSujo: number
  totalLimpo: number
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

export interface ComunicadosResponse {
  comunicados: Comunicado[]
  total: number
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

export interface BauMovimentosResponse {
  movimentos: BauMovimento[]
  total: number
  page: number
  limit: number
}

// ── Vendas de munição ────────────────────────────────────────────────────────

export type StatusVenda = 'pendente' | 'paga'
export type PagamentoVenda = 'dinheiro' | 'troca'

export interface MunicaoTipo {
  id: number
  nome: string
  precoUnitario: number
  moeda: Moeda
  ativo: boolean
}

/** Linha do estoque calculado — o backend devolve nome e preço já resolvidos. */
export interface MunicaoEstoque {
  municaoId: number
  nome: string
  entradas: number
  saidas: number
  quantidade: number
  precoUnitario: number
  moeda: Moeda
  ativo: boolean
}

export interface MunicaoMovimento {
  id: number
  data: string
  tipo: 'entrada' | 'saida'
  municaoId: number
  quantidade: number
  vendaId?: number
  responsavel?: string
  observacoes?: string
}

/** `nomeMunicao` e `precoUnitario` são do momento da venda, não do catálogo atual. */
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

export interface VendasResponse {
  vendas: Venda[]
  total: number
  page: number
  limit: number
  totalPendente: number
  totalPago: number
}

export interface MunicaoMovimentosResponse {
  movimentos: MunicaoMovimento[]
  total: number
  page: number
  limit: number
}

export interface Conta {
  id: number
  username: string
  ativo: boolean
  cargoPermissaoId?: number
  cargoPermissaoNome?: string
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

export interface AuthUser {
  contaId: number
  username: string
  cargoPermissaoId?: number
  permissoes: Permissoes
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

export interface AcoesResponse {
  acoes: Acao[]
  total: number
  page: number
  limit: number
}
