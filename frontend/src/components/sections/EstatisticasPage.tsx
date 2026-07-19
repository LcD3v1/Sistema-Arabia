import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, X, Calendar } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { useAllAcoes } from '@/hooks/useAcoes'
import { useMembros } from '@/hooks/useMembros'
import { useQrus } from '@/hooks/useConfig'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import LoadingHud from '@/components/ui/LoadingHud'
import { fmtMoeda } from '@/lib/money'
import type { Membro, Acao, TipoAcao } from '@/types'
import { PALETTE } from '@/lib/theme'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Rótulos de resultado por tipo de ação
const LABELS: Record<TipoAcao, { pos: string; neg: string; neu?: string }> = {
  tiro: { pos: 'Vitória', neg: 'Derrota' },
  fuga: { pos: 'Sucesso', neg: 'Falha' },
}

const ROW_VARIANTS = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }
const TABLE_VARIANTS = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }
type JsPDFWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } }

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: Array<{ name: string; value: number; fill: string }>; label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-bdr rounded p-2 text-xs font-mono">
      <p className="text-txt2 mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.fill }}>{p.name}: {p.value}</p>)}
    </div>
  )
}

function formatDateBR(d: string) { return d.split('-').reverse().join('/') }
function n(s: string) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '') }

export default function EstatisticasPage() {
  const { data: acoesData, isLoading: acoesLoading } = useAllAcoes()
  const { data: membros, isLoading: membrosLoading } = useMembros()
  const { data: qrus } = useQrus()

  const [tipo, setTipo] = useState<TipoAcao>('tiro')
  const [fromDate, setFromDate] = useState('')

  const L = LABELS[tipo]
  const winRateOf = (arr: Acao[]) => {
    const rel = arr.filter(a => a.resultado === L.pos || a.resultado === L.neg)
    return rel.length ? Math.round((arr.filter(a => a.resultado === L.pos).length / rel.length) * 100) : 0
  }

  const acoes: Acao[] = useMemo(
    () => (acoesData?.acoes ?? []).filter(a => a.tipo === tipo),
    [acoesData, tipo],
  )

  const filteredAcoes = useMemo(
    () => (fromDate ? acoes.filter(a => a.data >= fromDate) : acoes),
    [acoes, fromDate],
  )

  const weekdayData = useMemo(() => {
    const counts = Array(7).fill(0)
    filteredAcoes.forEach(a => { counts[new Date(a.data + 'T12:00:00').getDay()]++ })
    return WEEKDAYS.map((day, i) => ({ dia: day, ações: counts[i] }))
  }, [filteredAcoes])

  const operatorData = useMemo(() => {
    if (!membros) return []
    return membros
      .map((m: Membro) => {
        const memAcoes = filteredAcoes.filter(a => a.participants.some(p => p.memberId === m.id))
        return {
          nome: m.policial,
          total: memAcoes.length,
          pos: memAcoes.filter(a => a.resultado === L.pos).length,
          neg: memAcoes.filter(a => a.resultado === L.neg).length,
          winRate: winRateOf(memAcoes),
        }
      })
      .filter(o => o.total > 0)
      .sort((a, b) => b.winRate - a.winRate)
  }, [membros, filteredAcoes, tipo])

  const qruExtData = useMemo(() => {
    return (qrus ?? []).map(q => {
      const qAcoes = filteredAcoes.filter(a => a.qru === q)
      return {
        qru: q,
        total: qAcoes.length,
        pos: qAcoes.filter(a => a.resultado === L.pos).length,
        neg: qAcoes.filter(a => a.resultado === L.neg).length,
        neu: L.neu ? qAcoes.filter(a => a.resultado === L.neu).length : 0,
        winRate: winRateOf(qAcoes),
      }
    }).filter(q => q.total > 0).sort((a, b) => b.winRate - a.winRate)
  }, [filteredAcoes, qrus, tipo])

  function generatePdf() {
    const W = 210, M = 14
    const now = new Date()
    const toDate = now.toISOString().slice(0, 10)
    const periodText = fromDate
      ? `${formatDateBR(fromDate)} a ${formatDateBR(toDate)}`
      : `Todos os registros ate ${formatDateBR(toDate)}`

    const total = filteredAcoes.length
    const pos = filteredAcoes.filter(a => a.resultado === L.pos).length
    const neg = filteredAcoes.filter(a => a.resultado === L.neg).length
    const neu = L.neu ? filteredAcoes.filter(a => a.resultado === L.neu).length : 0

    const doc = new jsPDF({ orientation: 'portrait', format: 'a4' })
    const sectionTitle = (label: string, y: number) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(80, 80, 80)
      doc.text(label, M, y)
      doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3); doc.line(M, y + 1.5, W - M, y + 1.5)
    }

    let y = 20
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(40, 40, 40)
    doc.text('SISTEMA ARABIA', W / 2, y, { align: 'center' })
    y += 7
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100)
    doc.text(`Relatorio de Estatisticas — ${tipo.toUpperCase()}`, W / 2, y, { align: 'center' })
    y += 5
    doc.setFontSize(7.5)
    doc.text(`Periodo: ${periodText}`, W / 2, y, { align: 'center' })
    y += 4
    doc.text(`Gerado em: ${now.toLocaleString('pt-BR')}`, W / 2, y, { align: 'center' })
    y += 8

    sectionTitle('RESUMO GERAL', y)
    y += 6
    autoTable(doc, {
      startY: y,
      head: [['Total', n(L.pos), n(L.neg), ...(L.neu ? [n(L.neu)] : []), 'Win Rate', 'Valor (R$)', 'Valor (US$)']],
      body: [[total, pos, neg, ...(L.neu ? [neu] : []), `${winRateOf(filteredAcoes)}%`,
        fmtMoeda(filteredAcoes.filter(a => (a.moeda ?? 'Real') === 'Real').reduce((s, a) => s + (a.valor ?? 0), 0), 'Real'),
        fmtMoeda(filteredAcoes.filter(a => a.moeda === 'Dólar').reduce((s, a) => s + (a.valor ?? 0), 0), 'Dólar')]],
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, halign: 'center' },
      theme: 'grid', margin: { left: M, right: M },
    })
    y = ((doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? y + 20) + 8

    sectionTitle('PERFORMANCE POR MEMBRO', y)
    y += 6
    autoTable(doc, {
      startY: y,
      head: [['#', 'Membro', 'Total', n(L.pos), n(L.neg), 'Win Rate']],
      body: operatorData.length > 0
        ? operatorData.map((op, i) => [`${i + 1}`, n(op.nome), op.total, op.pos, op.neg, `${op.winRate}%`])
        : [['—', 'Sem dados no periodo selecionado', '', '', '', '']],
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      theme: 'grid', margin: { left: M, right: M },
    })
    y = ((doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? y + 50) + 8

    if (y > 250) { doc.addPage(); y = 20 }
    sectionTitle('RESULTADOS POR AÇÃO', y)
    y += 6
    autoTable(doc, {
      startY: y,
      head: [['Ação', 'Total', n(L.pos), n(L.neg), ...(L.neu ? [n(L.neu)] : []), 'Win Rate']],
      body: qruExtData.length > 0
        ? qruExtData.map(q => [n(q.qru), q.total, q.pos, q.neg, ...(L.neu ? [q.neu] : []), `${q.winRate}%`])
        : [['Sem dados no periodo selecionado', '', '', '', '', '']],
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      theme: 'grid', margin: { left: M, right: M },
    })

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(150, 150, 150)
      doc.text(`SISTEMA ARABIA — ${now.toLocaleDateString('pt-BR')} — Pagina ${i} de ${pageCount}`, W / 2, 290, { align: 'center' })
    }
    doc.save(`estatisticas-${tipo}-${toDate}.pdf`)
  }

  if (acoesLoading || membrosLoading) return <LoadingHud />

  return (
    <div className="p-6 space-y-6">
      {/* Abas TIRO / FUGA */}
      <div className="flex gap-2">
        {(['tiro', 'fuga'] as TipoAcao[]).map(t => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`px-6 py-2.5 border rounded font-orbitron text-xs tracking-widest transition-all ${
              tipo === t ? 'border-red text-red bg-red/10' : 'border-bdr text-txt3 hover:text-txt'
            }`}
          >
            {t === 'tiro' ? 'TIRO' : 'FUGA'}
          </button>
        ))}
      </div>

      {/* Filtros e exportação */}
      <GlowCard>
        <div className="p-4 flex items-center gap-4 flex-wrap">
          <Calendar size={15} className="text-gold shrink-0" />
          <label className="font-mono text-xs text-txt2 tracking-wider">A PARTIR DE:</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="input-gold bg-card2 border border-bdr2 rounded px-3 py-1.5 text-sm font-mono text-txt"
          />
          {fromDate && (
            <button onClick={() => setFromDate('')} className="text-txt3 hover:text-txt transition-colors" title="Limpar filtro">
              <X size={14} />
            </button>
          )}
          <span className="font-mono text-xs text-txt2 ml-auto">
            Total: <span className="text-gold">{fmtMoeda(filteredAcoes.filter(a => (a.moeda ?? 'Real') === 'Real').reduce((s, a) => s + (a.valor ?? 0), 0), 'Real')}</span> <span className="text-gold">{fmtMoeda(filteredAcoes.filter(a => a.moeda === 'Dólar').reduce((s, a) => s + (a.valor ?? 0), 0), 'Dólar')}</span>
            <span className="mx-2 text-txt3">·</span>
            {filteredAcoes.length}{filteredAcoes.length !== acoes.length ? ` / ${acoes.length} ações` : ' ações'}
          </span>
          <HudButton variant="ghost" size="sm" onClick={generatePdf}>
            <Download size={14} className="inline mr-1.5" />
            Baixar PDF
          </HudButton>
        </div>
      </GlowCard>

      <div className="grid grid-cols-2 gap-6">
        {/* Ações por dia da semana */}
        <GlowCard>
          <div className="p-4">
            <h3 className="font-orbitron text-xs text-txt2 tracking-wider mb-4">AÇÕES POR DIA DA SEMANA</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekdayData}>
                <XAxis dataKey="dia" tick={{ fill: '#7F9C8A', fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                <YAxis tick={{ fill: '#7F9C8A', fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ações" radius={[3, 3, 0, 0]}>
                  {weekdayData.map((_, i) => (
                    <Cell key={i} fill={i === 0 || i === 6 ? PALETTE.MUTED : PALETTE.ACCENT} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlowCard>

        {/* Resultados por QRU — gráfico empilhado */}
        <GlowCard>
          <div className="p-4">
            <h3 className="font-orbitron text-xs text-txt2 tracking-wider mb-4">RESULTADOS POR AÇÃO</h3>
            {qruExtData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={qruExtData}>
                  <XAxis dataKey="qru" tick={{ fill: '#7F9C8A', fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                  <YAxis tick={{ fill: '#7F9C8A', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => <span className="font-mono text-[10px] text-txt2">{v}</span>} />
                  <Bar dataKey="pos" name={L.pos} stackId="a" fill={PALETTE.POSITIVE} />
                  <Bar dataKey="neg" name={L.neg} stackId="a" fill={PALETTE.DANGER} radius={L.neu ? undefined : [3, 3, 0, 0]} />
                  {L.neu && <Bar dataKey="neu" name={L.neu} stackId="a" fill="#8a8a8a" radius={[3, 3, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="font-mono text-xs text-txt3">Sem dados</p>
              </div>
            )}
          </div>
        </GlowCard>
      </div>

      {/* Performance por operador */}
      <GlowCard>
        <div className="p-4">
          <h3 className="font-orbitron text-xs text-txt2 tracking-wider mb-4">PERFORMANCE POR MEMBRO</h3>
          {operatorData.length === 0 ? (
            <p className="font-mono text-xs text-txt3 text-center py-8">Sem dados suficientes</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bdr">
                  {['Membro', 'Total', L.pos, L.neg, 'Win Rate'].map(h => (
                    <th key={h} className="text-left font-mono text-xs text-txt3 tracking-wider px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <motion.tbody variants={TABLE_VARIANTS} initial="hidden" animate="visible">
                {operatorData.map(op => (
                  <motion.tr key={op.nome} variants={ROW_VARIANTS} className="border-b border-bdr/50 hover:bg-bdr/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-txt">{op.nome}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">{op.total}</td>
                    <td className="px-4 py-3 font-mono text-xs text-green">{op.pos}</td>
                    <td className="px-4 py-3 font-mono text-xs text-red">{op.neg}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded bg-bdrg overflow-hidden">
                          <motion.div className="h-full rounded bg-gold" initial={{ width: 0 }} animate={{ width: `${op.winRate}%` }} transition={{ duration: 0.7 }} />
                        </div>
                        <span className="font-orbitron text-xs text-gold w-10 text-right">{op.winRate}%</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          )}
        </div>
      </GlowCard>

      {/* Estatísticas por QRU */}
      <GlowCard>
        <div className="p-4">
          <h3 className="font-orbitron text-xs text-txt2 tracking-wider mb-4">ESTATÍSTICAS POR AÇÃO</h3>
          {qruExtData.length === 0 ? (
            <p className="font-mono text-xs text-txt3 text-center py-8">Sem dados suficientes</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bdr">
                  {['Ação', 'Total', L.pos, L.neg, ...(L.neu ? [L.neu] : []), 'Win Rate'].map(h => (
                    <th key={h} className="text-left font-mono text-xs text-txt3 tracking-wider px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <motion.tbody variants={TABLE_VARIANTS} initial="hidden" animate="visible">
                {qruExtData.map((q, idx) => (
                  <motion.tr key={q.qru} variants={ROW_VARIANTS} className="border-b border-bdr/50 hover:bg-bdr/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-txt font-bold">{q.qru}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">{q.total}</td>
                    <td className="px-4 py-3 font-mono text-xs text-green">{q.pos}</td>
                    <td className="px-4 py-3 font-mono text-xs text-red">{q.neg}</td>
                    {L.neu && <td className="px-4 py-3 font-mono text-xs text-blue">{q.neu}</td>}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-bdrg overflow-hidden flex">
                          <motion.div style={{ background: PALETTE.POSITIVE }} className="h-full" initial={{ width: 0 }} animate={{ width: `${q.total > 0 ? (q.pos / q.total) * 100 : 0}%` }} transition={{ duration: 0.7, delay: idx * 0.04 }} />
                          <motion.div style={{ background: PALETTE.DANGER }} className="h-full" initial={{ width: 0 }} animate={{ width: `${q.total > 0 ? (q.neg / q.total) * 100 : 0}%` }} transition={{ duration: 0.7, delay: idx * 0.04 + 0.05 }} />
                        </div>
                        <span className="font-orbitron text-xs text-gold w-10 text-right">{q.winRate}%</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          )}
        </div>
      </GlowCard>
    </div>
  )
}
