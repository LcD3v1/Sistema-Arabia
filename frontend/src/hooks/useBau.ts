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

export function useBauMovimentos(filters: MovimentosFilter = {}) {
  return useQuery<BauMovimentosResponse>({
    queryKey: ['bau', 'movimentos', filters],
    queryFn: async () => (await api.get<BauMovimentosResponse>('/bau/movimentos', { params: filters })).data,
    refetchInterval: 60_000,
  })
}

export function useBauEstoque() {
  return useQuery<BauEstoqueItem[]>({
    queryKey: ['bau', 'estoque'],
    queryFn: async () => (await api.get<BauEstoqueItem[]>('/bau/estoque')).data,
    refetchInterval: 60_000,
  })
}

export function useCreateBauMovimento() {
  return useMutation({
    mutationFn: (body: Omit<BauMovimento, 'id' | 'responsavel'>) => api.post<BauMovimento>('/bau/movimentos', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bau'] }),
  })
}

export interface BauLoteBody {
  tipo: 'entrada' | 'saida'
  membroId: number
  data: string
  observacoes?: string
  itens: { item: string; quantidade: number }[]
}

export function useCreateBauLote() {
  return useMutation({
    mutationFn: (body: BauLoteBody) => api.post<BauMovimento[]>('/bau/movimentos/lote', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bau'] }),
  })
}

export function useDeleteBauMovimento() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/bau/movimentos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bau'] }),
  })
}
