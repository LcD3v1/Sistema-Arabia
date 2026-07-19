import fs from 'fs'
import path from 'path'
import { Request } from 'express'

export type AuditEvent =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGIN_LOCKED'
  | 'LOGOUT' | 'TOKEN_REFRESHED' | 'PASSWORD_CHANGED'
  | 'ACCOUNT_CREATED' | 'ACCOUNT_UPDATED' | 'ACCOUNT_DELETED'
  | 'MEMBRO_CREATED' | 'MEMBRO_UPDATED' | 'MEMBRO_DELETED'
  | 'ACAO_CREATED' | 'ACAO_DELETED'
  | 'BAU_MOVIMENTO' | 'BAU_MOVIMENTO_DELETED'
  | 'TABLET_MOVIMENTO' | 'TABLET_MOVIMENTO_DELETED'
  | 'COMUNICADO_CRIADO' | 'COMUNICADO_EDITADO' | 'COMUNICADO_DELETED'
  | 'LAVAGEM_CRIADA' | 'LAVAGEM_DELETED'
  | 'VENDA_CREATED' | 'VENDA_PAGA' | 'VENDA_DELETED'
  | 'MUNICAO_MOVIMENTO'
  | 'MUNICAO_TIPO_CREATED' | 'MUNICAO_TIPO_UPDATED' | 'MUNICAO_TIPO_DELETED'
  | 'AUSENCIA_CRIADA' | 'AUSENCIA_ENCERRADA' | 'AUSENCIA_DELETED'
  | 'RECRUTA_CREATED' | 'RECRUTA_AVALIADO' | 'RECRUTA_FECHADO' | 'RECRUTA_DELETED'
  | 'LOGO_UPDATED' | 'LOGO_DELETED'
  | 'CONFIG_UPDATED'
  | 'BACKUP_DOWNLOADED' | 'RESTORE_EXECUTED'
  | 'UNAUTHORIZED_ACCESS' | 'PRIVILEGE_ESCALATION_ATTEMPT'
  | 'RATE_LIMIT_HIT'

const LOG_PATH = process.env.AUDIT_LOG_PATH
  ? path.resolve(process.env.AUDIT_LOG_PATH)
  : path.resolve(__dirname, '..', '..', 'audit.log')

function getClientIp(req: Pick<Request, 'ip' | 'headers'>): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.ip ?? 'unknown'
}

export function audit(
  event: AuditEvent,
  req?: Pick<Request, 'ip' | 'headers' | 'user'>,
  detail?: string,
): void {
  const entry = {
    ts: new Date().toISOString(),
    event,
    user: req?.user?.username ?? null,
    ip: req ? getClientIp(req) : null,
    detail: detail ?? null,
  }
  const line = JSON.stringify(entry) + '\n'
  // Append não-bloqueante
  fs.appendFile(LOG_PATH, line, () => {})
}

export function readAuditLog(limit = 200): unknown[] {
  try {
    const raw = fs.readFileSync(LOG_PATH, 'utf-8')
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(l => JSON.parse(l))
      .slice(-limit)
      .reverse()
  } catch {
    return []
  }
}
