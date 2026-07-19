import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Download, Filter } from 'lucide-react'
import { useAcoes, useDeleteAcao } from '@/hooks/useAcoes'
import { useQrus } from '@/hooks/useConfig'
import { useMembros } from '@/hooks/useMembros'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import LoadingHud from '@/components/ui/LoadingHud'
import { formatDate } from '@/lib/utils'
import { fmtMoeda } from '@/lib/money'
import type { Acao, Membro, TipoAcao } from '@/types'
import api from '@/lib/axios'
import { PALETTE } from '@/lib/theme'

const RESULTADO_COLORS: Record<string, string> = {
  'Vitória': PALETTE.POSITIVE,
  'Derrota': PALETTE.DANGER,
  'Empate':  PALETTE.MUTED,
  'Sucesso': PALETTE.POSITIVE,
  'Falha':   PALETTE.DANGER,
}

const RESULTADO_OPTS: Record<TipoAcao, string[]> = {
  tiro: ['Vitória', 'Derrota'],
  fuga: ['Sucesso', 'Falha'],
}

const PAGE_SIZE = 20

export default function HistoricoPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [tipo, setTipo] = useState<TipoAcao>('tiro')
  const [page, setPage] = useState(1)
  const [qruFilter, setQruFilter] = useState('')
  const [resultFilter, setResultFilter] = useState('')

  const { data, isLoading } = useAcoes({ tipo, qru: qruFilter || undefined, resultado: resultFilter || undefined, page, limit: PAGE_SIZE })
  const { data: qrus } = useQrus()
  const { data: membros } = useMembros()
  const deleteAcao = useDeleteAcao()

  const canEdit = canEditArea(user, 'historico')

  const membroMap = new Map((membros ?? []).map((m: Membro) => [m.id, m]))

  async function handleDelete(id: number) {
    if (!confirm('Apagar esta ação? Esta operação não pode ser desfeita.')) return
    try {
      await deleteAcao.mutateAsync(id)
      addToast('success', 'Ação removida.')
    } catch {
      addToast('error', 'Erro ao remover ação.')
    }
  }

  function switchTipo(t: TipoAcao) {
    setTipo(t)
    setResultFilter('')
    setPage(1)
  }

  async function handleExportCsv() {
    try {
      const res = await api.get('/acoes/export/csv', { params: { tipo }, responseType: 'blob' })
      const blob = res.data as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `acoes-${tipo}.csv`
      a.click()
      URL.revokeObjectURL(url)
      addToast('success', 'CSV exportado!')
    } catch {
      addToast('error', 'Erro ao exportar CSV.')
    }
  }

  const acoes = data?.acoes ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (isLoading) return <LoadingHud />

  return (
    <div className="p-6 space-y-4">
      {/* Abas TIRO / FUGA */}
      <div className="flex gap-2">
        {(['tiro', 'fuga'] as TipoAcao[]).map(t => (
          <button
            key={t}
            onClick={() => switchTipo(t)}
            className={`px-6 py-2.5 border rounded font-orbitron text-xs tracking-widest transition-all ${
              tipo === t ? 'border-red text-red bg-red/10' : 'border-bdr text-txt3 hover:text-txt'
            }`}
          >
            {t === 'tiro' ? 'TIRO' : 'FUGA'}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <GlowCard>
        <div className="p-4 flex items-center gap-4 flex-wrap">
          <Filter size={16} className="text-gold shrink-0" />

          <select
            value={qruFilter}
            onChange={e => { setQruFilter(e.target.value); setPage(1) }}
            className="bg-card2 border border-bdr2 rounded px-3 py-1.5 text-sm font-mono text-txt"
          >
            <option value="">Todas as Ações</option>
            {(qrus ?? []).map(q => <option key={q} value={q}>{q}</option>)}
          </select>

          <select
            value={resultFilter}
            onChange={e => { setResultFilter(e.target.value); setPage(1) }}
            className="bg-card2 border border-bdr2 rounded px-3 py-1.5 text-sm font-mono text-txt"
          >
            <option value="">Todos Resultados</option>
            {RESULTADO_OPTS[tipo].map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <span className="font-mono text-xs text-txt2 ml-auto">{total} registros</span>

          {canEdit && (
            <HudButton variant="ghost" size="sm" onClick={handleExportCsv}>
              <Download size={14} className="inline mr-1.5" />
              Exportar CSV
            </HudButton>
          )}
        </div>
      </GlowCard>

      {/* Tabela */}
      <GlowCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['#', 'Data', 'Hora', 'Valor', 'Ação', 'Resultado', 'Participantes', ''].map(h => (
                  <th key={h} className="text-left font-mono text-xs text-txt3 tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {acoes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 font-mono text-xs text-txt3">
                      Nenhuma ação encontrada
                    </td>
                  </tr>
                ) : acoes.map((acao: Acao) => (
                  <motion.tr
                    key={acao.id}
                    layout
                    exit={{ opacity: 0, x: 200 }}
                    transition={{ duration: 0.25 }}
                    className="border-b border-bdr/50 hover:bg-bdr/40 transition-colors group"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-txt3">#{acao.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt">{formatDate(acao.data)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">{acao.horario || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt">{fmtMoeda(acao.valor ?? 0, acao.moeda)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">{acao.qru}</td>
                    <td className="px-4 py-3">
                      <span
                        className="font-mono text-xs px-2 py-0.5 rounded border"
                        style={{
                          color: RESULTADO_COLORS[acao.resultado],
                          borderColor: RESULTADO_COLORS[acao.resultado] + '40',
                          background: RESULTADO_COLORS[acao.resultado] + '12',
                        }}
                      >
                        {acao.resultado}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">
                      {(() => {
                        const membrosStr = acao.participants.map(p => {
                          const m = membroMap.get(p.memberId)
                          return m ? m.policial : `ID:${p.memberId}`
                        }).join(', ')
                        const extrasStr = (acao.participantesExtras ?? [])
                          .map(e => e.patente ? `${e.nome} (${e.patente})` : e.nome)
                          .join(', ')
                        const all = [membrosStr, extrasStr].filter(Boolean).join(', ')
                        if (!all) return '—'
                        const extCount = (acao.participantesExtras ?? []).length
                        return (
                          <span>
                            {all}
                            {extCount > 0 && (
                              <span className="ml-1.5 text-blue/70 text-[10px]">[+{extCount} ext]</span>
                            )}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(acao.id)}
                          className="opacity-0 group-hover:opacity-100 text-txt3 hover:text-red transition-all p-1"
                        >
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

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-bdr">
            <HudButton variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              ‹ Anterior
            </HudButton>
            <span className="font-mono text-xs text-txt2">
              {page} / {totalPages}
            </span>
            <HudButton variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Próximo ›
            </HudButton>
          </div>
        )}
      </GlowCard>
    </div>
  )
}
