export interface ServerEvent {
  resource: string
  action?: string
  por?: string
  titulo?: string
  ts?: number
}

// Stream SSE via fetch (mantém o token no header Authorization, não na URL).
// Reconecta sozinho em caso de queda. Retorna função pra encerrar.
export function openEventStream(token: string, onEvent: (e: ServerEvent) => void): () => void {
  let stopped = false
  let ctrl: AbortController | null = null
  const base = import.meta.env.VITE_API_URL || ''

  async function connect() {
    ctrl = new AbortController()
    try {
      const res = await fetch(base + '/api/events', {
        headers: { Authorization: 'Bearer ' + token },
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) throw new Error('SSE indisponível')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (!stopped) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let idx: number
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, idx)
          buf = buf.slice(idx + 2)
          const dataLine = chunk.split('\n').find(l => l.startsWith('data:'))
          if (dataLine) {
            try { onEvent(JSON.parse(dataLine.slice(5).trim())) } catch { /* ignore */ }
          }
        }
      }
    } catch { /* cai pro reconnect */ }
    if (!stopped) setTimeout(connect, 4000)
  }

  connect()
  return () => { stopped = true; ctrl?.abort() }
}
