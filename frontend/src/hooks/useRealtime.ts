import { useEffect } from 'react'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { openEventStream } from '@/lib/sse'

// Conecta ao stream SSE e mantém os dados de todos os usuários sincronizados em tempo real.
export function useRealtime() {
  const token = useAuthStore(s => s.token)
  const username = useAuthStore(s => s.user?.username)
  const addToast = useUIStore(s => s.addToast)

  useEffect(() => {
    if (!token) return
    const close = openEventStream(token, e => {
      if (e.resource) {
        // Atualiza qualquer query cujo key comece com o recurso (ex: ['acoes', ...])
        queryClient.invalidateQueries({ queryKey: [e.resource] })
      }
      // Notificação em tempo real (apenas de ações feitas por outros usuários)
      if (e.resource === 'comunicados' && e.por && e.por !== username) {
        const verbo = e.action === 'created' ? 'criou' : e.action === 'deleted' ? 'removeu' : 'atualizou'
        addToast('info', `${e.por} ${verbo} um comunicado${e.titulo ? `: ${e.titulo}` : ''}`)
      }
    })
    return close
  }, [token, username, addToast])
}
