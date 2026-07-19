import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/axios'
import { queryClient } from '@/lib/queryClient'
import type { Comunicado, ComunicadosResponse, StatusComunicado } from '@/types'

export interface ComunicadosFilter {
  status?: string
  categoria?: string
  usuario?: string
  dataDe?: string
  dataAte?: string
  q?: string
}

export function useComunicados(filters: ComunicadosFilter = {}) {
  return useQuery<ComunicadosResponse>({
    queryKey: ['comunicados', filters],
    queryFn: async () => (await api.get<ComunicadosResponse>('/comunicados', { params: filters })).data,
  })
}

interface CreateBody { titulo: string; descricao: string; categoria?: string; status: StatusComunicado }
interface UpdateBody { titulo?: string; descricao?: string; categoria?: string; status?: StatusComunicado }

export function useCreateComunicado() {
  return useMutation({
    mutationFn: (body: CreateBody) => api.post<Comunicado>('/comunicados', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comunicados'] }),
  })
}

export function useUpdateComunicado() {
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateBody & { id: number }) => api.put<Comunicado>(`/comunicados/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comunicados'] }),
  })
}

export function useDeleteComunicado() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/comunicados/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comunicados'] }),
  })
}
