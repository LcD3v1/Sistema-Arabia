import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Filter, CheckCircle2, Clock } from 'lucide-react'
import { useVendas, usePagarVenda, useDeleteVenda } from '@/hooks/useVendas'
import { useMembros } from '@/hooks/useMembros'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import { formatDate } from '@/lib/utils'
import { fmtMoeda } from '@/lib/money'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import LoadingHud from '@/components/ui/LoadingHud'
import type { Membro, Venda } from '@/types'
import { PALETTE } from '@/lib/theme'

const PAGE_SIZE = 20

export default function HistoricoVendasPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const canEdit = canEditArea(user, 'historicoVendas')

  const [status, setStatus] = useState('')
  const [membroId, setMembroId] = useState('')
  const [familia, setFamilia] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useVendas({
    status: status || undefined,
    membroId: membroId ? Number(membroId) : undefined,
    familia: familia || undefined,
    de: de || undefined,
    ate: ate || undefined,
    page, limit: PAGE_SIZE,
  })
  const { data: membros } = useMembros()
  const pagar = usePagarVenda()
  const remover = useDeleteVenda()

  const membroMap = new Map((membros ?? []).map((m: Membro) => [m.id, m.policial]))
  const vendas = data?.vendas ?? []
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE)

  function onErr(e: unknown, fb: string) {
    const d = (e as { response?: { data?: { error?: string } } })?.response?.data
    addToast('error', d?.error ?? fb)
  }

  function marcarPaga(v: Venda) {
    pagar.mutate(v.id, {
      onSuccess: () => addToast('success', `Venda #${v.id} marcada como paga.`),
      onError: e => onErr(e, 'Erro ao marcar como paga.'),
    })
  }

  function apagar(v: Venda) {
    if (!confirm(`Apagar a venda #${v.id}? A munição volta para o estoque.`)) return
    remover.mutate(v.id, {
      onSuccess: () => addToast('success', 'Venda removida e estoque devolvido.'),
      onError: e => onErr(e, 'Erro ao remover a venda.'),
    })
  }

  const limpar = () => { setStatus(''); setMembroId(''); setFamilia(''); setDe(''); setAte(''); setPage(1) }
  const inputCls = 'bg-card2 border border-bdr2 rounded px-2 py-1.5 text-xs font-mono text-txt'

  if (isLoading) return <LoadingHud />

  return (
    <div className="p-6 space-y-4">
      {/* Totais do conjunto filtrado inteiro, não só desta página */}
      <div className="stats">
        <div className="stat">
          <p className="s-lbl">VENDAS</p>
          <p className="s-val">{data?.total ?? 0}</p>
          <p className="s-sub">no filtro atual</p>
        </div>
        <div className="stat">
          <p className="s-lbl">PENDENTE</p>
          <p className="s-val" style={{ color: PALETTE.TRIM }}>{fmtMoeda(data?.totalPendente ?? 0)}</p>
          <p className="s-sub">a receber</p>
        </div>
        <div className="stat">
          <p className="s-lbl">RECEBIDO</p>
          <p className="s-val" style={{ color: PALETTE.POSITIVE }}>{fmtMoeda(data?.totalPago ?? 0)}</p>
          <p className="s-sub">já pago</p>
        </div>
        <div className="stat">
          <p className="s-lbl">PÁGINA</p>
          <p className="s-val">{page}/{Math.max(1, totalPages)}</p>
          <p className="s-sub">{PAGE_SIZE} por página</p>
        </div>
      </div>

      {/* Filtros */}
      <GlowCard>
        <div className="p-4 flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-gold shrink-0" />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className={inputCls}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendentes</option>
            <option value="paga">Pagas</option>
          </select>
          <select value={membroId} onChange={e => { setMembroId(e.target.value); setPage(1) }} className={inputCls}>
            <option value="">Todos os vendedores</option>
            {(membros ?? []).map((m: Membro) => <option key={m.id} value={m.id}>{m.policial}</option>)}
          </select>
          <input
            value={familia} onChange={e => { setFamilia(e.target.value); setPage(1) }}
            placeholder="Família" className={inputCls + ' placeholder-txt3'}
          />
          <input type="date" value={de} onChange={e => { setDe(e.target.value); setPage(1) }} title="De" className={inputCls} />
          <input type="date" value={ate} onChange={e => { setAte(e.target.value); setPage(1) }} title="Até" className={inputCls} />
          {(status || membroId || familia || de || ate) && (
            <button onClick={limpar} className="font-mono text-[10px] text-txt3 hover:text-gold transition-colors cursor-pointer">
              limpar
            </button>
          )}
        </div>
      </GlowCard>

      {/* Tabela */}
      <GlowCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['#', 'Data', 'Vendedor', 'Família', 'Itens', 'Total', 'Pagamento', 'Status', ''].map(h => (
                  <th key={h} className="text-left font-mono text-xs text-txt3 tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {vendas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 font-mono text-xs text-txt3">
                      Nenhuma venda encontrada
                    </td>
                  </tr>
                ) : vendas.map(v => (
                  <motion.tr
                    key={v.id} layout exit={{ opacity: 0, x: 200 }} transition={{ duration: 0.25 }}
                    className="border-b border-bdr/50 hover:bg-bdr/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-txt3">#{v.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt">{formatDate(v.data)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">
                      {membroMap.get(v.membroId) ?? `ID:${v.membroId}`}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-txt">{v.familia}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">
                      {v.itens.map(i => `${i.quantidade}x ${i.nomeMunicao}`).join(', ')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-txt">{fmtMoeda(v.total, v.moeda)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">
                      {v.pagamento === 'dinheiro' ? 'Dinheiro' : 'Troca'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-mono text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1"
                        style={{
                          color: v.status === 'paga' ? PALETTE.POSITIVE : PALETTE.TRIM,
                          borderColor: (v.status === 'paga' ? PALETTE.POSITIVE : PALETTE.TRIM) + '40',
                          background: (v.status === 'paga' ? PALETTE.POSITIVE : PALETTE.TRIM) + '12',
                        }}
                      >
                        {v.status === 'paga'
                          ? <><CheckCircle2 size={11} /> Paga</>
                          : <><Clock size={11} /> Pendente</>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <div className="flex items-center gap-2 justify-end">
                          {v.status === 'pendente' && (
                            <HudButton size="sm" variant="ghost" onClick={() => marcarPaga(v)} disabled={pagar.isPending}>
                              Marcar paga
                            </HudButton>
                          )}
                          <button
                            onClick={() => apagar(v)}
                            aria-label={`Apagar venda #${v.id}`}
                            className="text-txt3 hover:text-danger transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </GlowCard>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <HudButton size="sm" variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Anterior
          </HudButton>
          <span className="font-mono text-xs text-txt3">{page} de {totalPages}</span>
          <HudButton size="sm" variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Próxima
          </HudButton>
        </div>
      )}
    </div>
  )
}
