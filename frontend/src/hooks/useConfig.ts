import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/axios'
import { queryClient } from '@/lib/queryClient'
import type { RecCfg, LavagemPorcentagem, CargoPermissao, Permissoes } from '@/types'

export function useQrus() {
  return useQuery<string[]>({
    queryKey: ['config', 'qrus'],
    queryFn: async () => (await api.get<string[]>('/config/qrus')).data,
  })
}

export function useAddQru() {
  return useMutation({
    mutationFn: (nome: string) => api.post('/config/qrus', { nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'qrus'] }),
  })
}

export function useDeleteQru() {
  return useMutation({
    mutationFn: (nome: string) => api.delete(`/config/qrus/${encodeURIComponent(nome)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'qrus'] }),
  })
}

export function usePatentes() {
  return useQuery<string[]>({
    queryKey: ['config', 'patentes'],
    queryFn: async () => (await api.get<string[]>('/config/patentes')).data,
  })
}

export function useAddPatente() {
  return useMutation({
    mutationFn: (nome: string) => api.post('/config/patentes', { nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'patentes'] }),
  })
}

export function useDeletePatente() {
  return useMutation({
    mutationFn: (nome: string) => api.delete(`/config/patentes/${encodeURIComponent(nome)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'patentes'] }),
  })
}

export function useReorderPatentes() {
  return useMutation({
    mutationFn: (patentes: string[]) => api.put('/config/patentes/reorder', { patentes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'patentes'] }),
  })
}

export function useCargos() {
  return useQuery<string[]>({
    queryKey: ['config', 'cargos'],
    queryFn: async () => (await api.get<string[]>('/config/cargos')).data,
  })
}

export function useAddCargo() {
  return useMutation({
    mutationFn: (nome: string) => api.post('/config/cargos', { nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'cargos'] }),
  })
}

export function useDeleteCargo() {
  return useMutation({
    mutationFn: (nome: string) => api.delete(`/config/cargos/${encodeURIComponent(nome)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'cargos'] }),
  })
}

export function useCargosPermissao() {
  return useQuery<CargoPermissao[]>({
    queryKey: ['config', 'cargos-permissao'],
    queryFn: async () => (await api.get<CargoPermissao[]>('/config/cargos-permissao')).data,
  })
}

export function useCreateCargoPermissao() {
  return useMutation({
    mutationFn: (body: { nome: string; permissoes: Permissoes }) => api.post('/config/cargos-permissao', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'cargos-permissao'] })
      queryClient.invalidateQueries({ queryKey: ['config', 'contas'] })
    },
  })
}

export function useUpdateCargoPermissao() {
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; nome?: string; permissoes?: Permissoes }) => api.put(`/config/cargos-permissao/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'cargos-permissao'] })
      queryClient.invalidateQueries({ queryKey: ['config', 'contas'] })
    },
  })
}

export function useDeleteCargoPermissao() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/config/cargos-permissao/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'cargos-permissao'] })
      queryClient.invalidateQueries({ queryKey: ['config', 'contas'] })
    },
  })
}

export function useBauItens() {
  return useQuery<string[]>({
    queryKey: ['config', 'bau-itens'],
    queryFn: async () => (await api.get<string[]>('/config/bau-itens')).data,
  })
}

export function useAddBauItem() {
  return useMutation({
    mutationFn: (nome: string) => api.post('/config/bau-itens', { nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'bau-itens'] }),
  })
}

export function useDeleteBauItem() {
  return useMutation({
    mutationFn: (nome: string) => api.delete(`/config/bau-itens/${encodeURIComponent(nome)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'bau-itens'] }),
  })
}

export function useBauGerenciaItens() {
  return useQuery<string[]>({
    queryKey: ['config', 'bau-gerencia-itens'],
    queryFn: async () => (await api.get<string[]>('/config/bau-gerencia-itens')).data,
  })
}

export function useAddBauGerenciaItem() {
  return useMutation({
    mutationFn: (nome: string) => api.post('/config/bau-gerencia-itens', { nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'bau-gerencia-itens'] }),
  })
}

export function useDeleteBauGerenciaItem() {
  return useMutation({
    mutationFn: (nome: string) => api.delete(`/config/bau-gerencia-itens/${encodeURIComponent(nome)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'bau-gerencia-itens'] }),
  })
}

export function useLavagemPorcentagens() {
  return useQuery<LavagemPorcentagem[]>({
    queryKey: ['config', 'lavagem-porcentagens'],
    queryFn: async () => (await api.get<LavagemPorcentagem[]>('/config/lavagem-porcentagens')).data,
  })
}

export function useAddLavagemPorcentagem() {
  return useMutation({
    mutationFn: (body: { nome: string; valor: number; lucroFamiliaPorcentagem?: number }) => api.post('/config/lavagem-porcentagens', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'lavagem-porcentagens'] }),
  })
}

export function useUpdateLavagemPorcentagem() {
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; nome: string; valor: number; lucroFamiliaPorcentagem?: number }) => api.put(`/config/lavagem-porcentagens/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'lavagem-porcentagens'] }),
  })
}

export function useDeleteLavagemPorcentagem() {
  return useMutation({
    mutationFn: (id: number) => api.delete(`/config/lavagem-porcentagens/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'lavagem-porcentagens'] }),
  })
}

export function useLogo() {
  return useQuery<{ logo: string }>({
    queryKey: ['config', 'logo'],
    queryFn: async () => (await api.get<{ logo: string }>('/config/logo')).data,
  })
}

export function useUpdateLogo() {
  return useMutation({
    mutationFn: (logo: string) => api.put('/config/logo', { logo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'logo'] }),
  })
}

export function useRecCfg() {
  return useQuery<RecCfg>({
    queryKey: ['config', 'recrutamento'],
    queryFn: async () => (await api.get<RecCfg>('/config/recrutamento')).data,
  })
}

export function useUpdateRecCfg() {
  return useMutation({
    mutationFn: (body: Partial<RecCfg>) => api.put('/config/recrutamento', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config', 'recrutamento'] }),
  })
}
