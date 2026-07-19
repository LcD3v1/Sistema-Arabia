import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { addClient, removeClient } from '../realtime'

const router = Router()

// Stream SSE — o cliente conecta uma vez e recebe eventos em tempo real
router.get('/', requireAuth, (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // desativa buffering em proxies (nginx)
  res.flushHeaders?.()
  res.write('retry: 5000\n\n')
  res.write(': conectado\n\n')

  addClient(res)

  // Ping periódico pra manter a conexão viva
  const ping = setInterval(() => {
    try { res.write(': ping\n\n') } catch { /* ignore */ }
  }, 25_000)

  req.on('close', () => {
    clearInterval(ping)
    removeClient(res)
  })
})

export default router
