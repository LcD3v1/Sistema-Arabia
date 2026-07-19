import type { Acao } from '@/types'
import { PALETTE } from './theme'

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function calcWinRate(acoes: Acao[]): number {
  const relevantes = acoes.filter(a => a.resultado === 'Vitória' || a.resultado === 'Derrota')
  if (relevantes.length === 0) return 0
  const vitorias = relevantes.filter(a => a.resultado === 'Vitória').length
  return Math.round((vitorias / relevantes.length) * 100)
}

export function getResultadoColor(resultado: string): string {
  if (resultado === 'Vitória') return PALETTE.POSITIVE
  if (resultado === 'Derrota') return PALETTE.DANGER
  return PALETTE.MUTED
}

export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function generateId(): string {
  return Math.random().toString(36).slice(2)
}
