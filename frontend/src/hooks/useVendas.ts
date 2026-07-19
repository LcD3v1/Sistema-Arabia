import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/axios'
import { queryClient } from '@/lib/queryClient'
import type {
  MunicaoEstoque, MunicaoMovimento, MunicaoMovimentosResponse, MunicaoTipo, Venda, VendasResponse,
} from '@/types'

/**
 * Toda mutação invalida `vendas` E `municao-estoque`: uma venda mexe nos dois,
 * e mostrar estoque velho depois de vender faria alguém tentar vender o que
 * não existe mais.
 */
function invalidarTudo() {
  queryClient.invalidateQueries({ queryKey: ['vendas'] })
  queryClient.invalidateQueries({ queryKey: ['municao-estoque'] })
  queryClient.invalidateQueries({ queryKey: ['municao-movimentos'] })
}

interface VendasFilter {
  status?: string
  membroId?: number
  familia?: string
  de?: string
  ate?: string
  page?: number
  limit?: number
}

export function useVendas(filters: VendasFilter = {}) {
  return useQuery<VendasResponse>({
    queryKey: ['vendas', filters],
    queryFn: async () => (await api.get<VendasResponse>('/vendas', { params: filters })).data,
  })
}

export function useMunicaoTipos() {
  return useQuery<MunicaoTipo[]>({
    queryKey: ['municao-tipos'],
    queryFn: async () => (await api.get<MunicaoTipo[]>('/vendas/tipos')).data,
  })
}

export function useMunicaoEstoque() {
  return useQuery<MunicaoEstoque[]>({
    queryKey: ['municao-estoque'],
    queryFn: async () => (await api.get<MunicaoEstoque[]>('/vendas/estoque')).data,
  })
}

export function useMunicaoMovimentos(params: { municaoId?: number; tipo?: string; page?: number; limit?: number } = {}) {
  return useQuery<MunicaoMovimentosResponse>({
    queryKey: ['municao-movimentos', params],
    queryFn: async () => (await api.get<MunicaoMovimentosResponse>('/vendas/movimentos', { params })).data,
  })
}

export function useCreateVenda() {
  return useMutation({
    mutationFn: (body: {
      data: string; membroId: number; familia: string
      pagamento: 'dinheiro' | 'troca'
      itens: { municaoId: number; quantidade: number }[]
      observacoes?: string
    }) => api.post<Venda>('/vendas', body),
    onSuccess: invalidarTudo,
  })
}

export function usePagarVenda() {
  return useMutation({
    mutationFn: (id: number) => api.patch<Venda>(`/vendas/${id}/pagar`),
    onSuccess: invalidarTudo,
  })
}

export function useDeleteVenda() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/vendas/${id}`),
    onSuccess: invalidarTudo,
  })
}

export function useCreateMunicaoMovimento() {
  return useMutation({
    mutationFn: (body: { data: string; tipo: 'entrada' | 'saida'; municaoId: number; quantidade: number; observacoes?: string }) =>
      api.post<MunicaoMovimento>('/vendas/movimentos', body),
    onSuccess: invalidarTudo,
  })
}

export function useCreateMunicaoTipo() {
  return useMutation({
    mutationFn: (body: { nome: string; precoUnitario: number; moeda: string; ativo?: boolean }) =>
      api.post<MunicaoTipo>('/vendas/tipos', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municao-tipos'] })
      queryClient.invalidateQueries({ queryKey: ['municao-estoque'] })
    },
  })
}

export function useUpdateMunicaoTipo() {
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; nome?: string; precoUnitario?: number; moeda?: string; ativo?: boolean }) =>
      api.patch<MunicaoTipo>(`/vendas/tipos/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municao-tipos'] })
      queryClient.invalidateQueries({ queryKey: ['municao-estoque'] })
    },
  })
}

export function useDeleteMunicaoTipo() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/vendas/tipos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municao-tipos'] })
      queryClient.invalidateQueries({ queryKey: ['municao-estoque'] })
    },
  })
}
