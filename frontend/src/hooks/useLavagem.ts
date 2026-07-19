import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/axios'
import { queryClient } from '@/lib/queryClient'
import type { LavagemRegistro, LavagemResponse } from '@/types'

interface LavagemFilter {
  familia?: string
  dataDe?: string
  dataAte?: string
}

export function useLavagens(filters: LavagemFilter = {}) {
  return useQuery<LavagemResponse>({
    queryKey: ['lavagem', filters],
    queryFn: async () => (await api.get<LavagemResponse>('/lavagem', { params: filters })).data,
  })
}

export function useCreateLavagem() {
  return useMutation({
    mutationFn: (body: {
      data: string; familia: string; dinheiroSujo: number; dinheiroLimpo: number
      porcentagem?: number; porcentagemNome?: string; lucroFamiliaPorcentagem?: number; observacoes?: string
    }) =>
      api.post<LavagemRegistro>('/lavagem', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lavagem'] }),
  })
}

export function useDeleteLavagem() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/lavagem/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lavagem'] }),
  })
}
