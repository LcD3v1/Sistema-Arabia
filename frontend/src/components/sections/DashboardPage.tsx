import { useMemo } from 'react'
import { useAllAcoes } from '@/hooks/useAcoes'
import { useMembros } from '@/hooks/useMembros'
import LoadingHud from '@/components/ui/LoadingHud'
import { calcWinRate, formatDate } from '@/lib/utils'
import type { Membro } from '@/types'
import { PALETTE } from '@/lib/theme'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Cores (paleta verde / ouro)
const C_DERROTA = PALETTE.DANGER
const C_VITORIA = PALETTE.POSITIVE
const C_EMPATE  = PALETTE.MUTED

const DONUT_CIRC = 314 // 2π·50

function ArabesqueFull() {
  return (
    <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="100%" height="100%" fill="url(#arabesque)" />
    </svg>
  )
}
function ArabesqueStrip() {
  return (
    <svg width="100%" height="100%" preserveAspectRatio="xMaxYMid slice">
      <rect width="100%" height="100%" fill="url(#arabesque-strip)" />
    </svg>
  )
}

export default function DashboardPage() {
  const { data: acoesData, isLoading: acoesLoading } = useAllAcoes()
  const { data: membros, isLoading: membrosLoading } = useMembros()

  const acoes = acoesData?.acoes ?? []

  const tiroAcoes = useMemo(() => acoes.filter(a => a.tipo === 'tiro'), [acoes])
  const fugaAcoes = useMemo(() => acoes.filter(a => a.tipo === 'fuga'), [acoes])

  const sucessoFuga = useMemo(() => {
    const rel = fugaAcoes.filter(a => a.resultado === 'Sucesso' || a.resultado === 'Falha')
    return rel.length ? Math.round((fugaAcoes.filter(a => a.resultado === 'Sucesso').length / rel.length) * 100) : 0
  }, [fugaAcoes])

  const stats = useMemo(() => {
    const ativos = (membros ?? []).filter((m: Membro) => m.status === 'Ativo').length
    const comAdv = (membros ?? []).filter((m: Membro) => m.adv1 || m.adv2 || m.adv3).length
    return { ativos, comAdv, total: acoes.length, winRateTiro: calcWinRate(tiroAcoes) }
  }, [membros, acoes, tiroAcoes])

  const counts = useMemo(() => {
    const v = tiroAcoes.filter(a => a.resultado === 'Vitória').length
    const d = tiroAcoes.filter(a => a.resultado === 'Derrota').length
    return { v, d, total: v + d }
  }, [tiroAcoes])

  // Segmentos do donut (derrota → vitória)
  const donut = useMemo(() => {
    const { v, d, total } = counts
    if (total === 0) return [] as { len: number; offset: number; color: string }[]
    const segD = (d / total) * DONUT_CIRC
    const segV = (v / total) * DONUT_CIRC
    return [
      { len: segD, offset: 0,     color: C_DERROTA },
      { len: segV, offset: -segD, color: C_VITORIA },
    ]
  }, [counts])

  const barData = useMemo(() => {
    const now = new Date()
    const arr = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return { mes: MONTH_NAMES[d.getMonth()], count: acoes.filter(a => a.data.startsWith(key)).length }
    })
    const max = Math.max(1, ...arr.map(a => a.count))
    return arr.map(a => ({ ...a, pct: Math.round((a.count / max) * 100), peak: a.count === max && a.count > 0 }))
  }, [acoes])

  const operatorRanking = useMemo(() => {
    if (!membros) return []
    return membros
      .map((m: Membro) => {
        const memAll = acoes.filter(a => a.participants.some(p => p.memberId === m.id))
        const memTiro = tiroAcoes.filter(a => a.participants.some(p => p.memberId === m.id))
        return { ...m, totalAcoes: memAll.length, winRate: calcWinRate(memTiro) }
      })
      .filter(m => m.totalAcoes > 0)
      .sort((a, b) => b.winRate - a.winRate || b.totalAcoes - a.totalAcoes)
      .slice(0, 5)
  }, [membros, acoes])

  const recentOps = acoes.slice(0, 6)

  const opColor = (r: string) =>
    (r === 'Vitória' || r === 'Sucesso' ? C_VITORIA : r === 'Derrota' || r === 'Falha' ? C_DERROTA : C_EMPATE)

  if (acoesLoading || membrosLoading) return <LoadingHud />

  return (
    <div className="arb-main">
      <div className="main-inner">

        {/* HERO */}
        <div className="hero">
          <div className="hero-arabesque"><ArabesqueFull /></div>
          <div className="hero-arabesque-side">
            <svg width="100%" height="100%" preserveAspectRatio="xMaxYMid slice">
              <rect width="100%" height="100%" fill="url(#arabesque-strip)" />
            </svg>
          </div>
          <div className="scan" />
          <h1>FACÇÃO <em>ARÁBIA</em></h1>
          <div className="hero-rule" />
          <p>— SISTEMA DE GESTÃO OPERACIONAL —</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <div className="win-zone">
              <span className="win-lbl">WIN RATE · TIRO</span>
              <span className="win-val">{stats.winRateTiro}%</span>
            </div>
            <div className="win-zone">
              <span className="win-lbl">SUCESSO · FUGA</span>
              <span className="win-val">{sucessoFuga}%</span>
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="stats">
          {[
            { lbl: 'TOTAL DE AÇÕES',   val: stats.total,  sub: 'operações'  },
            { lbl: 'MEMBROS ATIVOS',   val: stats.ativos, sub: 'membros' },
            { lbl: 'WIN RATE (TIRO)',  val: `${stats.winRateTiro}%`, sub: 'vitórias' },
            { lbl: 'COM ADVERTÊNCIAS', val: stats.comAdv, sub: 'membros'    },
          ].map((s, i) => (
            <div className="stat" key={i}>
              <div className="arabesque-strip-box"><ArabesqueStrip /></div>
              <p className="s-lbl">{s.lbl}</p>
              <p className="s-val">{s.val}</p>
              <p className="s-sub">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ROW 2 — Donut + Barras */}
        <div className="row2">
          <div className="icard">
            <div className="card-arabesque"><ArabesqueFull /></div>
            <div className="card-title"><span className="dot" />RESULTADOS · TIRO</div>
            <div className="donut-wrap">
              <div className="donut-rel">
                <svg width="130" height="130" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r="50" fill="none" stroke="#132419" strokeWidth="16" />
                  <circle cx="65" cy="65" r="57" fill="none" stroke="rgba(201,162,39,0.10)" strokeWidth="1" strokeDasharray="3 15" />
                  {donut.map((seg, i) => (
                    <circle
                      key={i}
                      cx="65" cy="65" r="50" fill="none"
                      stroke={seg.color} strokeWidth="16"
                      strokeDasharray={`${seg.len} ${DONUT_CIRC}`}
                      strokeDashoffset={seg.offset}
                      strokeLinecap="butt"
                    />
                  ))}
                </svg>
                <div className="donut-label">
                  <div className="donut-val">{stats.winRateTiro}%</div>
                  <div className="donut-sub">WIN</div>
                </div>
              </div>
              <div className="legend">
                <div className="legend-row"><span className="legend-dot" style={{ background: C_DERROTA, boxShadow: `0 0 4px ${C_DERROTA}` }} />Derrotas · {counts.d}</div>
                <div className="legend-row"><span className="legend-dot" style={{ background: C_VITORIA }} />Vitórias · {counts.v}</div>
              </div>
            </div>
          </div>

          <div className="icard">
            <div className="card-arabesque"><ArabesqueFull /></div>
            <div className="card-title"><span className="dot" />AÇÕES POR MÊS</div>
            <div className="barchart">
              {barData.map((b, i) => (
                <div className="bar-col" key={i}>
                  <div className={`bar${b.peak ? ' peak' : ''}`} style={{ height: `${b.pct}%` }} />
                  <span className="bar-lbl">{b.mes}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 3 — Últimas operações + Ranking */}
        <div className="row2b">
          <div className="icard">
            <div className="card-arabesque"><ArabesqueFull /></div>
            <div className="card-title"><span className="dot" />ÚLTIMAS OPERAÇÕES</div>
            {recentOps.length === 0 ? (
              <p style={{ color: 'var(--txt3)', fontSize: 10, padding: '12px 0', textAlign: 'center' }}>
                Nenhuma operação registrada
              </p>
            ) : (
              <div className="op-list">
                {recentOps.map(op => (
                  <div className="op-row" key={op.id}>
                    <span className="op-dot" style={{ background: opColor(op.resultado), boxShadow: `0 0 5px ${opColor(op.resultado)}` }} />
                    <span className="op-date">{formatDate(op.data).slice(0, 5)}</span>
                    <span className="op-qru">{op.qru} · {op.tipo === 'tiro' ? 'TIRO' : 'FUGA'}</span>
                    <span style={{ color: opColor(op.resultado), marginLeft: 'auto' }}>{op.resultado}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="icard">
            <div className="card-arabesque"><ArabesqueFull /></div>
            <div className="card-title"><span className="dot" />RANKING DE MEMBROS</div>
            {operatorRanking.length === 0 ? (
              <p style={{ color: 'var(--txt3)', fontSize: 10, padding: '12px 0', textAlign: 'center' }}>
                Sem dados suficientes
              </p>
            ) : (
              <div className="rank-list">
                {operatorRanking.map((op, idx) => (
                  <div className="rank-row" key={op.id}>
                    <span className="rank-num">#{idx + 1}</span>
                    <div className="rank-info">
                      <div className="rank-name">{op.policial}</div>
                      <div className="rank-bar"><div className="rank-fill" style={{ width: `${op.winRate}%` }} /></div>
                    </div>
                    <span className="rank-pct">{op.winRate}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
