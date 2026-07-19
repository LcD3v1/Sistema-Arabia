import { Package } from 'lucide-react'
import { useBauEstoque } from '@/hooks/useBau'
import GlowCard from '@/components/ui/GlowCard'
import LoadingHud from '@/components/ui/LoadingHud'
import { PALETTE } from '@/lib/theme'

export default function EstoquePage() {
  const { data: estoque, isLoading } = useBauEstoque()

  if (isLoading) return <LoadingHud />

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <GlowCard>
        <div className="p-4">
          <h3 className="font-orbitron text-xs text-txt2 tracking-wider mb-4 flex items-center gap-2">
            <Package size={14} className="text-gold" /> ESTOQUE ATUAL DO BAÚ
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['Item', 'Entradas', 'Saídas', 'Em estoque'].map(h => (
                  <th key={h} className="text-left font-mono text-xs text-txt3 tracking-wider px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(estoque ?? []).length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 font-mono text-xs text-txt3">Nenhum item cadastrado</td></tr>
              ) : (estoque ?? []).map(e => (
                <tr key={e.item} className="border-b border-bdr/50 hover:bg-bdr/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-txt font-bold">{e.item}</td>
                  <td className="px-4 py-3 font-mono text-xs text-green">{e.entradas}</td>
                  <td className="px-4 py-3 font-mono text-xs text-red">{e.saidas}</td>
                  <td className="px-4 py-3 font-orbitron text-sm" style={{ color: e.quantidade > 0 ? PALETTE.POSITIVE : PALETTE.MUTED }}>
                    {e.quantidade}
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
