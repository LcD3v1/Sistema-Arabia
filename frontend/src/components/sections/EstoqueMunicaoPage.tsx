import { useState } from 'react'
import { Package, PlusCircle } from 'lucide-react'
import { useMunicaoEstoque, useCreateMunicaoMovimento } from '@/hooks/useVendas'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import { fmtMoeda } from '@/lib/money'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import LoadingHud from '@/components/ui/LoadingHud'
import { PALETTE } from '@/lib/theme'

const hoje = () => new Date().toISOString().slice(0, 10)

export default function EstoqueMunicaoPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const canEdit = canEditArea(user, 'estoqueMunicao')

  const { data: estoque, isLoading } = useMunicaoEstoque()
  const criarMov = useCreateMunicaoMovimento()

  const [municaoId, setMunicaoId] = useState('')
  const [quantidade, setQuantidade] = useState('')

  function darEntrada() {
    const id = Number(municaoId)
    const qtd = Number(quantidade)
    if (!id) { addToast('error', 'Selecione a munição.'); return }
    if (!Number.isInteger(qtd) || qtd <= 0) { addToast('error', 'Quantidade inválida.'); return }

    criarMov.mutate({ data: hoje(), tipo: 'entrada', municaoId: id, quantidade: qtd }, {
      onSuccess: () => { addToast('success', 'Entrada registrada!'); setQuantidade('') },
      onError: (e: unknown) => {
        const d = (e as { response?: { data?: { error?: string } } })?.response?.data
        addToast('error', d?.error ?? 'Erro ao dar entrada.')
      },
    })
  }

  if (isLoading) return <LoadingHud />

  const linhas = estoque ?? []
  const inputCls = 'bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt input-gold'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      {canEdit && (
        <GlowCard>
          <div className="p-4">
            <h3 className="font-orbitron text-xs text-txt2 tracking-wider mb-3 flex items-center gap-2">
              <PlusCircle size={14} className="text-gold" /> ENTRADA DE ESTOQUE
            </h3>
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label htmlFor="e-municao" className="block font-mono text-[10px] text-txt3 tracking-wider mb-1">MUNIÇÃO</label>
                <select id="e-municao" value={municaoId} onChange={e => setMunicaoId(e.target.value)} className={inputCls + ' w-full'}>
                  <option value="">Selecione</option>
                  {linhas.filter(l => l.ativo).map(l => (
                    <option key={l.municaoId} value={l.municaoId}>{l.nome}</option>
                  ))}
                </select>
              </div>
              <div className="w-40">
                <label htmlFor="e-qtd" className="block font-mono text-[10px] text-txt3 tracking-wider mb-1">QUANTIDADE</label>
                <input
                  id="e-qtd" type="number" min={1} value={quantidade}
                  onChange={e => setQuantidade(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); darEntrada() } }}
                  className={inputCls + ' w-full'}
                />
              </div>
              <HudButton onClick={darEntrada} disabled={criarMov.isPending}>
                {criarMov.isPending ? 'Salvando...' : 'Dar Entrada'}
              </HudButton>
            </div>
            {linhas.length === 0 && (
              <p className="font-mono text-[10px] text-txt3 mt-2">
                Nenhum tipo de munição cadastrado. Cadastre em Configurações.
              </p>
            )}
          </div>
        </GlowCard>
      )}

      <GlowCard>
        <div className="p-4">
          <h3 className="font-orbitron text-xs text-txt2 tracking-wider mb-4 flex items-center gap-2">
            <Package size={14} className="text-gold" /> ESTOQUE DE MUNIÇÃO
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['Munição', 'Preço', 'Entradas', 'Saídas', 'Em estoque'].map(h => (
                  <th key={h} className="text-left font-mono text-xs text-txt3 tracking-wider px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 font-mono text-xs text-txt3">Nenhum tipo cadastrado</td></tr>
              ) : linhas.map(l => (
                <tr key={l.municaoId} className="border-b border-bdr/50 hover:bg-bdr/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: l.ativo ? PALETTE.TEXT : PALETTE.DIM }}>
                    {l.nome}{!l.ativo && ' (desativado)'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-txt2">{fmtMoeda(l.precoUnitario, l.moeda)}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: PALETTE.POSITIVE }}>{l.entradas}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: PALETTE.DANGER }}>{l.saidas}</td>
                  <td className="px-4 py-3 font-orbitron text-sm" style={{ color: l.quantidade > 0 ? PALETTE.POSITIVE : PALETTE.MUTED }}>
                    {l.quantidade}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlowCard>
    </div>
  )
}
