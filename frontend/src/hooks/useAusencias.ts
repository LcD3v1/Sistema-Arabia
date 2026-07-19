import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/axios'
import { queryClient } from '@/lib/queryClient'
import type { Ausencia } from '@/types'

interface AusenciasFilter {
  status?: 'ativa' | 'encerrada'
}

export function useAusencias(filters: AusenciasFilter = {}) {
  return useQuery<Ausencia[]>({
    queryKey: ['ausencias', filters],
    queryFn: async () => (await api.get<Ausencia[]>('/ausencias', { params: filters })).data,
    refetchInterval: 60_000,
  })
}

function invalidate() {
  queryClient.invalidateQueries({ queryKey: ['ausencias'] })
  queryClient.invalidateQueries({ queryKey: ['membros'] })
}

export function useCreateAusencia() {
  return useMutation({
    mutationFn: (body: { membroId: number; dataInicio: string; dataFim: string; motivo?: string }) =>
      api.post<Ausencia>('/ausencias', body),
    onSuccess: invalidate,
  })
}

export function useEncerrarAusencia() {
  return useMutation({
    mutationFn: (id: number) => api.put(`/ausencias/${id}/encerrar`),
    onSuccess: invalidate,
  })
}

export function useDeleteAusencia() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/ausencias/${id}`),
    onSuccess: invalidate,
  })
}
