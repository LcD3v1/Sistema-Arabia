import { Response } from 'express'

// Conexões SSE abertas
const clients = new Set<Response>()

export interface RealtimeEvent {
  resource: string                 // 'comunicados' | 'acoes' | 'membros' | 'bau' | 'tablet' | 'ausencias' | 'config'
  action?: string                  // 'created' | 'updated' | 'deleted'
  por?: string                     // quem fez (username)
  titulo?: string                  // rótulo amigável (ex: título do comunicado)
}

export function addClient(res: Response): void {
  clients.add(res)
}

export function removeClient(res: Response): void {
  clients.delete(res)
}

// Notifica todos os clientes conectados
export function broadcast(event: RealtimeEvent): void {
  const payload = `data: ${JSON.stringify({ ...event, ts: Date.now() })}\n\n`
  for (const res of clients) {
    try { res.write(payload) } catch { clients.delete(res) }
  }
}
