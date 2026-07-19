import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/axios'
import { queryClient } from '@/lib/queryClient'
import type { TabletMovimento, TabletMovimentosResponse, TabletSaldo } from '@/types'

interface MovimentosFilter {
  tipo?: 'deposito' | 'saque'
  membroId?: number
  page?: number
  limit?: number
}

export function useTabletMovimentos(filters: MovimentosFilter = {}) {
  return useQuery<TabletMovimentosResponse>({
    queryKey: ['tablet', 'movimentos', filters],
    queryFn: async () => (await api.get<TabletMovimentosResponse>('/tablet/movimentos', { params: filters })).data,
    refetchInterval: 60_000,
  })
}

export function useTabletSaldo() {
  return useQuery<TabletSaldo>({
    queryKey: ['tablet', 'saldo'],
    queryFn: async () => (await api.get<TabletSaldo>('/tablet/saldo')).data,
    refetchInterval: 60_000,
  })
}

export function useCreateTabletMovimento() {
  return useMutation({
    mutationFn: (body: Omit<TabletMovimento, 'id' | 'responsavel'>) => api.post<TabletMovimento>('/tablet/movimentos', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tablet'] }),
  })
}

export function useDeleteTabletMovimento() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/tablet/movimentos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tablet'] }),
  })
}
