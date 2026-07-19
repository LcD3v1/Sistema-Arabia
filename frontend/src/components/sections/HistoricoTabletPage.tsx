import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { useTabletMovimentos, useDeleteTabletMovimento } from '@/hooks/useTablet'
import { useMembros } from '@/hooks/useMembros'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import GlowCard from '@/components/ui/GlowCard'
import LoadingHud from '@/components/ui/LoadingHud'
import { formatDate } from '@/lib/utils'
import { fmtMoeda } from '@/lib/money'
import type { Membro, TipoMovimentoTablet } from '@/types'
import { PALETTE } from '@/lib/theme'

type Filtro = '' | TipoMovimentoTablet

const TABS: [Filtro, string][] = [
  ['', 'TODOS'],
  ['deposito', 'DEPÓSITOS'],
  ['saque', 'SAQUES'],
]

export default function HistoricoTabletPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [filtro, setFiltro] = useState<Filtro>('')

  const { data: movData, isLoading } = useTabletMovimentos({ tipo: filtro || undefined, limit: 200 })
  const { data: membros } = useMembros()
  const deleteMov = useDeleteTabletMovimento()

  const canEdit = canEditArea(user, 'historicoTablet')
  const membroMap = new Map((membros ?? []).map((m: Membro) => [m.id, m]))

  async function handleDelete(id: number) {
    if (!confirm('Apagar esta movimentação?')) return
    try {
      await deleteMov.mutateAsync(id)
      addToast('success', 'Movimentação removida.')
    } catch {
      addToast('error', 'Erro ao remover.')
    }
  }

  const movimentos = movData?.movimentos ?? []

  if (isLoading) return <LoadingHud />

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex gap-2">
        {TABS.map(([f, label]) => (
          <button key={label} onClick={() => setFiltro(f)}
            className={`px-6 py-2.5 border rounded font-orbitron text-xs tracking-widest transition-all ${
              filtro === f ? 'border-red text-red bg-red/10' : 'border-bdr text-txt3 hover:text-txt'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <GlowCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['Data', 'Tipo', 'Valor', 'Membro', 'Responsável', 'Obs', ''].map(h => (
                  <th key={h} className="text-left font-mono text-xs text-txt3 tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {movimentos.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 font-mono text-xs text-txt3">Nenhuma movimentação encontrada</td></tr>
                ) : movimentos.map(mov => (
                  <motion.tr key={mov.id} layout exit={{ opacity: 0, x: 200 }} transition={{ duration: 0.25 }}
                    className="border-b border-bdr/50 hover:bg-bdr/40 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-txt">{formatDate(mov.data)}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs px-2 py-0.5 rounded border" style={{
                        color: mov.tipo === 'deposito' ? PALETTE.POSITIVE : PALETTE.DANGER,
                        borderColor: (mov.tipo === 'deposito' ? PALETTE.POSITIVE : PALETTE.DANGER) + '40',
                        background: (mov.tipo === 'deposito' ? PALETTE.POSITIVE : PALETTE.DANGER) + '12',
                      }}>
                        {mov.tipo === 'deposito' ? 'DEPÓSITO' : 'SAQUE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: mov.tipo === 'deposito' ? PALETTE.POSITIVE : PALETTE.DANGER }}>
                      {mov.tipo === 'deposito' ? '+' : '−'} {fmtMoeda(mov.valor, mov.moeda)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">{membroMap.get(mov.membroId)?.policial ?? `ID:${mov.membroId}`}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt3">{mov.responsavel ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt3">{mov.observacoes || '—'}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <button onClick={() => handleDelete(mov.id)}
                          className="opacity-0 group-hover:opacity-100 text-txt3 hover:text-red transition-all p-1">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </GlowCard>
    </div>
  )
}
