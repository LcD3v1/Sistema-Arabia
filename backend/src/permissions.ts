import { CargoPermissao, Conta, Permissoes } from './types'

export const AREA_IDS = [
  'dashboard',
  'comunicados',
  'registrar',
  'historico',
  'estatisticas',
  'membros',
  'ausencias',
  'bau',
  'historicoBau',
  'estoque',
  'bauGerencia',
  'historicoBauGerencia',
  'estoqueGerencia',
  'tablet',
  'historicoTablet',
  'lavagem',
  'historicoLavagem',
  'vendas',
  'historicoVendas',
  'estoqueMunicao',
  'configuracoes',
] as const

export type AreaId = typeof AREA_IDS[number]

export function fullPermissoes(): Permissoes {
  const p: Permissoes = {}
  for (const a of AREA_IDS) p[a] = { ver: true, editar: true }
  return p
}

export function emptyPermissoes(): Permissoes {
  const p: Permissoes = {}
  for (const a of AREA_IDS) p[a] = { ver: false, editar: false }
  return p
}

export function normalizePermissoes(input: unknown): Permissoes {
  const base = emptyPermissoes()
  if (input && typeof input === 'object') {
    for (const a of AREA_IDS) {
      const v = (input as Record<string, { ver?: unknown; editar?: unknown }>)[a]
      if (v && typeof v === 'object') {
        base[a] = { ver: !!v.ver || !!v.editar, editar: !!v.editar }
      }
    }
  }
  return base
}

export function permissoesFromNivel(nivel?: string): Permissoes {
  if (nivel === 'admin') return fullPermissoes()
  const p = emptyPermissoes()
  if (nivel === 'view_only') {
    for (const a of AREA_IDS) if (a !== 'configuracoes') p[a].ver = true
    return p
  }
  for (const a of AREA_IDS) {
    if (a === 'configuracoes') continue
    p[a] = { ver: true, editar: nivel !== undefined }
  }
  return p
}

export function ensureAllAreas(p: Permissoes | undefined, grantNew: boolean): Permissoes {
  const base = p ?? {}
  const out: Permissoes = {}
  for (const a of AREA_IDS) {
    out[a] = base[a] ?? (grantNew ? { ver: true, editar: true } : { ver: false, editar: false })
  }
  return out
}

export function resolveContaPermissoes(
  conta: Pick<Conta, 'cargoPermissaoId' | 'permissoes'>,
  cargosPermissao: CargoPermissao[] = [],
): Permissoes {
  const cargo = conta.cargoPermissaoId
    ? cargosPermissao.find(c => c.id === conta.cargoPermissaoId)
    : undefined
  if (cargo) {
    return ensureAllAreas(cargo.permissoes, !!cargo.permissoes?.configuracoes?.editar)
  }
  return ensureAllAreas(conta.permissoes, !!conta.permissoes?.configuracoes?.editar)
}

export function countConfigAdmins(
  contas: { ativo: boolean; cargoPermissaoId?: number; permissoes?: Permissoes }[],
  cargosPermissao: CargoPermissao[] = [],
): number {
  return contas.filter(c => c.ativo && resolveContaPermissoes({
    cargoPermissaoId: c.cargoPermissaoId,
    permissoes: c.permissoes ?? emptyPermissoes(),
  }, cargosPermissao).configuracoes?.editar).length
}
