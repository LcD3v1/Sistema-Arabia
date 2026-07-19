import type { Permissoes, AuthUser } from '@/types'

export interface AreaDef { id: string; label: string }

export const AREAS: AreaDef[] = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'comunicados',  label: 'Comunicados' },
  { id: 'registrar',    label: 'Registrar Acao' },
  { id: 'historico',    label: 'Historico' },
  { id: 'estatisticas', label: 'Estatisticas' },
  { id: 'membros',      label: 'Membros' },
  { id: 'ausencias',    label: 'Ausencias' },
  { id: 'bau',          label: 'Bau' },
  { id: 'historicoBau', label: 'Historico Bau' },
  { id: 'estoque',      label: 'Estoque' },
  { id: 'bauGerencia',          label: 'Bau Gerencia' },
  { id: 'historicoBauGerencia', label: 'Historico Bau Gerencia' },
  { id: 'estoqueGerencia',      label: 'Estoque Gerencia' },
  { id: 'tablet',          label: 'Tablet (Saque/Deposito)' },
  { id: 'historicoTablet', label: 'Historico Tablet' },
  { id: 'vendas',          label: 'Vendas' },
  { id: 'historicoVendas', label: 'Historico de Vendas' },
  { id: 'estoqueMunicao',  label: 'Estoque de Municao' },
  { id: 'configuracoes',   label: 'Configuracoes' },
]

export function emptyPermissoes(): Permissoes {
  const p: Permissoes = {}
  for (const a of AREAS) p[a.id] = { ver: false, editar: false }
  return p
}

export function canView(user: AuthUser | null | undefined, area: string): boolean {
  return !!user?.permissoes?.[area]?.ver
}

export function canEdit(user: AuthUser | null | undefined, area: string): boolean {
  return !!user?.permissoes?.[area]?.editar
}

export function firstVisibleArea(user: AuthUser | null | undefined): string | null {
  for (const a of AREAS) if (canView(user, a.id)) return a.id
  return null
}

export const AREA_ROUTE: Record<string, string> = {
  dashboard: '/dashboard',
  comunicados: '/comunicados',
  registrar: '/acoes/nova',
  historico: '/acoes/historico',
  estatisticas: '/estatisticas',
  membros: '/membros',
  ausencias: '/ausencias',
  bau: '/bau',
  historicoBau: '/bau/historico',
  estoque: '/estoque',
  bauGerencia: '/gerencia/bau',
  historicoBauGerencia: '/gerencia/historico',
  estoqueGerencia: '/gerencia/estoque',
  tablet: '/tablet',
  historicoTablet: '/tablet/historico',
  vendas: '/vendas',
  historicoVendas: '/vendas/historico',
  estoqueMunicao: '/vendas/estoque',
  configuracoes: '/configuracoes',
}
