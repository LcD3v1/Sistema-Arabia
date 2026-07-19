import { useState } from 'react'
import { Send, ArrowDownCircle, ArrowUpCircle, Plus, X } from 'lucide-react'
import { useCreateBauGerenciaLote } from '@/hooks/useBauGerencia'
import { useBauGerenciaItens } from '@/hooks/useConfig'
import { useMembros } from '@/hooks/useMembros'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import { getApiErrorMessage } from '@/lib/apiError'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import type { Membro, TipoMovimentoBau } from '@/types'

interface LinhaItem { item: string; quantidade: number | '' }

const MAX_QUANTIDADE_BAU = 1_000_000_000
const linhaVazia = (): LinhaItem => ({ item: '', quantidade: '' })
const quantidadeValida = (quantidade: number | '') =>
  typeof quantidade === 'number'
  && Number.isInteger(quantidade)
  && quantidade >= 1
  && quantidade <= MAX_QUANTIDADE_BAU

export default function BauGerenciaPage() {
  const { addToast } = useUIStore()
  const { user } = useAuthStore()
  const podeMovimentar = canEditArea(user, 'bauGerencia')
  const { data: itens } = useBauGerenciaItens()
  const { data: membros } = useMembros()
  const createLote = useCreateBauGerenciaLote()

  const [tipo, setTipo] = useState<TipoMovimentoBau>('entrada')
  const [membroId, setMembroId] = useState<number | ''>('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [observacoes, setObservacoes] = useState('')
  const [linhas, setLinhas] = useState<LinhaItem[]>([linhaVazia()])

  function updateLinha(idx: number, campo: keyof LinhaItem, valor: string) {
    setLinhas(prev => prev.map((l, i) => i === idx
      ? { ...l, [campo]: campo === 'quantidade' ? (valor ? Number(valor) : '') : valor }
      : l))
  }
  function addLinha() { setLinhas(prev => [...prev, linhaVazia()]) }
  function removeLinha(idx: number) { setLinhas(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!membroId) { addToast('error', 'Selecione um membro.'); return }
    const itensLimpos = linhas
      .filter(l => l.item && quantidadeValida(l.quantidade))
      .map(l => ({ item: l.item, quantidade: Number(l.quantidade) }))
    const temQuantidadeInvalida = linhas.some(l => l.item && l.quantidade !== '' && !quantidadeValida(l.quantidade))
    if (temQuantidadeInvalida) { addToast('error', `Informe uma quantidade inteira entre 1 e ${MAX_QUANTIDADE_BAU}.`); return }
    if (itensLimpos.length === 0) { addToast('error', 'Adicione ao menos um item com quantidade.'); return }

    try {
      await createLote.mutateAsync({ tipo, membroId: Number(membroId), data, observacoes: observacoes.trim(), itens: itensLimpos })
      addToast('success', `${tipo === 'entrada' ? 'Entrada' : 'Retirada'} de ${itensLimpos.length} item(ns) registrada!`)
      setLinhas([linhaVazia()]); setObservacoes('')
    } catch (err: unknown) {
      addToast('error', getApiErrorMessage(err, 'Erro ao registrar movimentação.'))
    }
  }

  if (!podeMovimentar) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <GlowCard>
          <div className="p-8 text-center">
            <p className="font-orbitron text-sm text-gold tracking-widest mb-2">SOMENTE LEITURA</p>
            <p className="font-mono text-xs text-txt2">Sua conta não tem permissão para movimentar o baú da gerência.</p>
          </div>
        </GlowCard>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <GlowCard>
        <div className="p-6">
          <h2 className="font-orbitron text-sm font-bold text-gold tracking-wider mb-5">REGISTRAR MOVIMENTAÇÃO DO BAÚ DA GERÊNCIA</h2>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="flex gap-3">
              <button type="button" onClick={() => setTipo('entrada')}
                className={`flex-1 py-3 border rounded font-orbitron text-xs tracking-wider flex items-center justify-center gap-2 transition-all ${
                  tipo === 'entrada' ? 'border-green text-green bg-green/10' : 'border-bdr text-txt3'}`}>
                <ArrowDownCircle size={15} /> ENTRADA
              </button>
              <button type="button" onClick={() => setTipo('saida')}
                className={`flex-1 py-3 border rounded font-orbitron text-xs tracking-wider flex items-center justify-center gap-2 transition-all ${
                  tipo === 'saida' ? 'border-red text-red bg-red/10' : 'border-bdr text-txt3'}`}>
                <ArrowUpCircle size={15} /> RETIRADA
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">MEMBRO</label>
                <select value={membroId} onChange={e => setMembroId(e.target.value ? Number(e.target.value) : '')}
                  className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt">
                  <option value="">Selecione...</option>
                  {(membros ?? []).map((m: Membro) => <option key={m.id} value={m.id}>{m.policial}</option>)}
                </select>
              </div>
              <div>
                <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">DATA</label>
                <input type="date" value={data} onChange={e => setData(e.target.value)}
                  className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt" />
              </div>
            </div>

            {/* Itens (vários de uma vez) */}
            <div>
              <label className="font-mono text-xs text-txt2 tracking-wider block mb-2">ITENS</label>
              <div className="space-y-2">
                {linhas.map((l, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select value={l.item} onChange={e => updateLinha(idx, 'item', e.target.value)}
                      className="input-gold flex-1 bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt">
                      <option value="">Selecione o item...</option>
                      {(itens ?? []).map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <input type="number" min={1} max={MAX_QUANTIDADE_BAU} step={1} value={l.quantidade}
                      onChange={e => updateLinha(idx, 'quantidade', e.target.value)}
                      placeholder="Qtd"
                      className="input-gold w-24 bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt placeholder-txt3" />
                    <button type="button" onClick={() => removeLinha(idx)} disabled={linhas.length === 1}
                      className="border border-bdr2 rounded px-3 text-txt3 hover:text-red hover:border-red/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addLinha}
                className="mt-2 flex items-center gap-1.5 font-mono text-xs text-txt2 hover:text-gold transition-colors">
                <Plus size={14} /> Adicionar item
              </button>
            </div>

            <div>
              <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">OBSERVAÇÃO (opcional)</label>
              <input value={observacoes} onChange={e => setObservacoes(e.target.value)}
                placeholder="Ex: reposição semanal..."
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt placeholder-txt3" />
            </div>

            <HudButton type="submit" loading={createLote.isPending} size="lg" className="w-full justify-center">
              <Send size={16} className="inline mr-2" /> REGISTRAR
            </HudButton>
          </form>
        </div>
      </GlowCard>
    </div>
  )
}
