import { Request, Response, NextFunction } from 'express'
import type { AreaId } from '../permissions'

// Exige permissão de VISUALIZAR uma área
export function requireView(area: AreaId) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return }
    if (req.user.permissoes?.[area]?.ver) { next(); return }
    res.status(403).json({ error: 'Acesso negado' })
  }
}

// Exige permissão de EDITAR uma área
export function requireEdit(area: AreaId) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return }
    if (req.user.permissoes?.[area]?.editar) { next(); return }
    res.status(403).json({ error: 'Acesso negado — sem permissão de edição' })
  }
}
