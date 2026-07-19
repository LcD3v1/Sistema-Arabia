import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Trash2, CheckCircle2 } from 'lucide-react'
import { useAusencias, useCreateAusencia, useEncerrarAusencia, useDeleteAusencia } from '@/hooks/useAusencias'
import { useMembros } from '@/hooks/useMembros'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import { getApiErrorMessage } from '@/lib/apiError'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import LoadingHud from '@/components/ui/LoadingHud'
import { formatDate } from '@/lib/utils'
import type { Membro, StatusAusencia } from '@/types'
import { PALETTE } from '@/lib/theme'

type Filtro = '' | StatusAusencia

const TABS: [Filtro, string][] = [
  ['', 'TODAS'],
  ['ativa', 'ATIVAS'],
  ['encerrada', 'ENCERRADAS'],
]

export default function AusenciasPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [filtro, setFiltro] = useState<Filtro>('')

  const { data: ausencias, isLoading } = useAusencias({ status: filtro || undefined })
  const { data: membros } = useMembros()
  const createAus = useCreateAusencia()
  const encerrarAus = useEncerrarAusencia()
  const deleteAus = useDeleteAusencia()

  const canEdit = canEditArea(user, 'ausencias')
  const canRegister = canEditArea(user, 'ausencias')

  const [membroId, setMembroId] = useState<number | ''>('')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10))
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10))
  const [motivo, setMotivo] = useState('')

  const membroMap = new Map((membros ?? []).map((m: Membro) => [m.id, m]))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!membroId) { addToast('error', 'Selecione um membro.'); return }
    if (dataFim < dataInicio) { addToast('error', 'A data de fim deve ser maior ou igual à de início.'); return }
    try {
      await createAus.mutateAsync({ membroId: Number(membroId), dataInicio, dataFim, motivo: motivo.trim() })
      addToast('success', 'Ausência registrada! Membro marcado como Ausência.')
      setMotivo('')
    } catch (err: unknown) {
      addToast('error', getApiErrorMessage(err, 'Erro ao registrar ausência.'))
    }
  }

  async function handleEncerrar(id: number) {
    if (!confirm('Encerrar esta ausência agora? O membro volta para Ativo.')) return
    try {
      await encerrarAus.mutateAsync(id)
      addToast('success', 'Ausência encerrada. Membro voltou para Ativo.')
    } catch {
      addToast('error', 'Erro ao encerrar.')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Apagar este registro de ausência?')) return
    try {
      await deleteAus.mutateAsync(id)
      addToast('success', 'Registro removido.')
    } catch {
      addToast('error', 'Erro ao remover.')
    }
  }

  if (isLoading) return <LoadingHud />

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      {/* Formulário */}
      {canRegister && (
        <GlowCard>
          <div className="p-6">
            <h2 className="font-orbitron text-sm font-bold text-gold tracking-wider mb-5">REGISTRAR AUSÊNCIA</h2>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">MEMBRO</label>
                  <select value={membroId} onChange={e => setMembroId(e.target.value ? Number(e.target.value) : '')}
                    className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt">
                    <option value="">Selecione...</option>
                    {(membros ?? []).map((m: Membro) => <option key={m.id} value={m.id}>{m.policial}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">INÍCIO</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt" />
                </div>
                <div>
                  <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">FIM</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                    className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt" />
                </div>
              </div>
              <div>
                <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">MOTIVO (opcional)</label>
                <input value={motivo} onChange={e => setMotivo(e.target.value)}
                  placeholder="Ex: viagem, prova, etc..."
                  className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt placeholder-txt3" />
              </div>
              <HudButton type="submit" loading={createAus.isPending} size="lg" className="w-full justify-center">
                <Send size={16} className="inline mr-2" /> REGISTRAR AUSÊNCIA
              </HudButton>
            </form>
          </div>
        </GlowCard>
      )}

      {/* Filtro */}
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

      {/* Histórico */}
      <GlowCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['Membro', 'Início', 'Fim', 'Motivo', 'Status', 'Por', ''].map(h => (
                  <th key={h} className="text-left font-mono text-xs text-txt3 tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {(ausencias ?? []).length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 font-mono text-xs text-txt3">Nenhuma ausência encontrada</td></tr>
                ) : (ausencias ?? []).map(a => (
                  <motion.tr key={a.id} layout exit={{ opacity: 0, x: 200 }} transition={{ duration: 0.25 }}
                    className="border-b border-bdr/50 hover:bg-bdr/40 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-txt">{membroMap.get(a.membroId)?.policial ?? `ID:${a.membroId}`}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">{formatDate(a.dataInicio)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">{formatDate(a.dataFim)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt3">{a.motivo || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs px-2 py-0.5 rounded border" style={{
                        color: a.status === 'ativa' ? PALETTE.ACCENT_BRIGHT : PALETTE.MUTED,
                        borderColor: (a.status === 'ativa' ? PALETTE.ACCENT_BRIGHT : PALETTE.MUTED) + '40',
                        background: (a.status === 'ativa' ? PALETTE.ACCENT_BRIGHT : PALETTE.MUTED) + '12',
                      }}>
                        {a.status === 'ativa' ? 'ATIVA' : 'ENCERRADA'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-txt3">{a.criadoPor ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canRegister && a.status === 'ativa' && (
                          <button onClick={() => handleEncerrar(a.id)} title="Encerrar agora"
                            className="text-txt3 hover:text-green transition-all p-1">
                            <CheckCircle2 size={15} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => handleDelete(a.id)} title="Excluir"
                            className="opacity-0 group-hover:opacity-100 text-txt3 hover:text-red transition-all p-1">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
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
