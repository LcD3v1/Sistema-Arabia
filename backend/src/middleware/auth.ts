import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthPayload, Permissoes } from '../types'
import { isRevoked } from '../security/tokenBlacklist'
import { readData } from '../data'
import { resolveContaPermissoes } from '../permissions'

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload & { jti?: string; exp?: number; permissoes?: Permissoes }
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token ausente' })
    return
  }

  let payload: AuthPayload & { jti?: string; exp?: number }

  try {
    const token = header.slice(7)
    payload = jwt.verify(token, process.env.JWT_SECRET!) as typeof payload
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' })
    return
  }

  // 1. Token explicitamente revogado (logout)?
  if (payload.jti && isRevoked(payload.jti)) {
    res.status(401).json({ error: 'Token revogado' })
    return
  }

  // 2. Conta ainda existe e está ativa? (efeito imediato ao desativar)
  // readData() é rápido — lê arquivo local em memória do SO
  const data = readData()
  const conta = data.contas.find(c => c.id === payload.contaId)
  if (!conta || !conta.ativo) {
    res.status(401).json({ error: 'CONTA_DESATIVADA' })
    return
  }

  // Anexa as permissões ATUAIS da conta (efeito imediato ao alterar permissões)
  req.user = { ...payload, permissoes: resolveContaPermissoes(conta, data.cargosPermissao) }
  next()
}
