import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/axios'
import { queryClient } from '@/lib/queryClient'
import type { BauMovimento, BauMovimentosResponse, BauEstoqueItem } from '@/types'

interface MovimentosFilter {
  tipo?: 'entrada' | 'saida'
  item?: string
  membroId?: number
  page?: number
  limit?: number
}

export function useBauGerenciaMovimentos(filters: MovimentosFilter = {}) {
  return useQuery<BauMovimentosResponse>({
    queryKey: ['bauGerencia', 'movimentos', filters],
    queryFn: async () => (await api.get<BauMovimentosResponse>('/bau-gerencia/movimentos', { params: filters })).data,
    refetchInterval: 60_000,
  })
}

export function useBauGerenciaEstoque() {
  return useQuery<BauEstoqueItem[]>({
    queryKey: ['bauGerencia', 'estoque'],
    queryFn: async () => (await api.get<BauEstoqueItem[]>('/bau-gerencia/estoque')).data,
    refetchInterval: 60_000,
  })
}

export interface BauLoteBody {
  tipo: 'entrada' | 'saida'
  membroId: number
  data: string
  observacoes?: string
  itens: { item: string; quantidade: number }[]
}

export function useCreateBauGerenciaLote() {
  return useMutation({
    mutationFn: (body: BauLoteBody) => api.post<BauMovimento[]>('/bau-gerencia/movimentos/lote', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bauGerencia'] }),
  })
}

export function useDeleteBauGerenciaMovimento() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/bau-gerencia/movimentos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bauGerencia'] }),
  })
}
