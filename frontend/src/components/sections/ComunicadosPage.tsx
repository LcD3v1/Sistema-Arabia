import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Trash2, Pencil, ChevronDown, Megaphone, Clock } from 'lucide-react'
import { useComunicados, useCreateComunicado, useUpdateComunicado, useDeleteComunicado } from '@/hooks/useComunicados'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import ModalOverlay from '@/components/ui/ModalOverlay'
import LoadingHud from '@/components/ui/LoadingHud'
import type { Comunicado, StatusComunicado } from '@/types'
import { PALETTE } from '@/lib/theme'

const STATUS_LIST: StatusComunicado[] = ['Aberto', 'Em andamento', 'Concluído', 'Cancelado']
const statusColor = (s: string) =>
  s === 'Aberto' ? PALETTE.ACCENT_BRIGHT : s === 'Em andamento' ? PALETTE.POSITIVE : s === 'Concluído' ? PALETTE.MUTED : PALETTE.DIM

const fmtDT = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

interface FormState { id?: number; titulo: string; descricao: string; categoria: string; status: StatusComunicado }
const formVazio = (): FormState => ({ titulo: '', descricao: '', categoria: '', status: 'Aberto' })

export default function ComunicadosPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const canEdit = canEditArea(user, 'comunicados')

  const { data, isLoading } = useComunicados({})
  const createMut = useCreateComunicado()
  const updateMut = useUpdateComunicado()
  const deleteMut = useDeleteComunicado()

  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fUsuario, setFUsuario] = useState('')
  const [fCategoria, setFCategoria] = useState('')
  const [fDe, setFDe] = useState('')
  const [fAte, setFAte] = useState('')

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<FormState>(formVazio())
  const [expandido, setExpandido] = useState<number | null>(null)

  const comunicados = data?.comunicados ?? []
  const total = data?.total ?? 0

  const usuarios = useMemo(() => [...new Set(comunicados.map(c => c.criadoPor))].sort(), [comunicados])
  const categorias = useMemo(() => [...new Set(comunicados.map(c => c.categoria).filter(Boolean))].sort() as string[], [comunicados])

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase()
    return comunicados.filter(c => {
      if (fStatus && c.status !== fStatus) return false
      if (fUsuario && c.criadoPor !== fUsuario) return false
      if (fCategoria && c.categoria !== fCategoria) return false
      if (fDe && c.criadoEm.slice(0, 10) < fDe) return false
      if (fAte && c.criadoEm.slice(0, 10) > fAte) return false
      if (termo && !c.titulo.toLowerCase().includes(termo) && !c.descricao.toLowerCase().includes(termo)) return false
      return true
    })
  }, [comunicados, q, fStatus, fUsuario, fCategoria, fDe, fAte])

  function abrirNovo() { setForm(formVazio()); setModal(true) }
  function abrirEdit(c: Comunicado) { setForm({ id: c.id, titulo: c.titulo, descricao: c.descricao, categoria: c.categoria ?? '', status: c.status }); setModal(true) }

  function onErr(e: unknown, fb: string) {
    const d = (e as { response?: { data?: { error?: string; details?: string[] } } })?.response?.data
    addToast('error', d?.details?.length ? d.details.join(' | ') : (d?.error ?? fb))
  }

  function salvar() {
    if (!form.titulo.trim() || !form.descricao.trim()) { addToast('error', 'Preencha título e descrição.'); return }
    const body = { titulo: form.titulo.trim(), descricao: form.descricao.trim(), categoria: form.categoria.trim(), status: form.status }
    if (form.id) {
      updateMut.mutate({ id: form.id, ...body }, { onSuccess: () => { addToast('success', 'Comunicado atualizado!'); setModal(false) }, onError: e => onErr(e, 'Erro ao salvar.') })
    } else {
      createMut.mutate(body, { onSuccess: () => { addToast('success', 'Comunicado criado!'); setModal(false) }, onError: e => onErr(e, 'Erro ao criar.') })
    }
  }

  function remover(c: Comunicado) {
    if (!confirm('Excluir este comunicado?')) return
    deleteMut.mutate(c.id, { onSuccess: () => addToast('success', 'Comunicado removido.'), onError: e => onErr(e, 'Erro ao remover.') })
  }

  const limparFiltros = () => { setQ(''); setFStatus(''); setFUsuario(''); setFCategoria(''); setFDe(''); setFAte('') }

  if (isLoading) return <LoadingHud />

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      {/* Cabeçalho + contador */}
      <div className="flex items-center gap-3 flex-wrap">
        <Megaphone size={18} className="text-gold" />
        <h2 className="font-orbitron text-sm text-txt tracking-widest">COMUNICADOS</h2>
        <span className="font-mono text-xs px-2 py-0.5 rounded border border-bdr2 bg-card2 text-txt2">
          {total} no total{filtrados.length !== total ? ` · ${filtrados.length} filtrados` : ''}
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-txt3">
          <span className="status-dot" /> tempo real
        </span>
        {canEdit && (
          <HudButton size="sm" onClick={abrirNovo}>
            <Plus size={14} className="inline mr-1.5" /> Novo
          </HudButton>
        )}
      </div>

      {/* Filtros + busca */}
      <GlowCard>
        <div className="p-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt3" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar título ou descrição..."
              className="input-gold w-full bg-card2 border border-bdr2 rounded pl-8 pr-3 py-1.5 text-sm font-mono text-txt placeholder-txt3" />
          </div>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="bg-card2 border border-bdr2 rounded px-2 py-1.5 text-xs font-mono text-txt">
            <option value="">Status</option>
            {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fUsuario} onChange={e => setFUsuario(e.target.value)} className="bg-card2 border border-bdr2 rounded px-2 py-1.5 text-xs font-mono text-txt">
            <option value="">Usuário</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={fCategoria} onChange={e => setFCategoria(e.target.value)} className="bg-card2 border border-bdr2 rounded px-2 py-1.5 text-xs font-mono text-txt">
            <option value="">Categoria</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={fDe} onChange={e => setFDe(e.target.value)} title="De" className="bg-card2 border border-bdr2 rounded px-2 py-1.5 text-xs font-mono text-txt" />
          <input type="date" value={fAte} onChange={e => setFAte(e.target.value)} title="Até" className="bg-card2 border border-bdr2 rounded px-2 py-1.5 text-xs font-mono text-txt" />
          {(q || fStatus || fUsuario || fCategoria || fDe || fAte) && (
            <button onClick={limparFiltros} className="font-mono text-[10px] text-txt3 hover:text-red transition-colors">limpar</button>
          )}
        </div>
      </GlowCard>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <GlowCard><div className="p-10 text-center font-mono text-xs text-txt3">Nenhum comunicado encontrado.</div></GlowCard>
      ) : (
        <AnimatePresence mode="popLayout">
          {filtrados.map(c => (
            <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlowCard>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-orbitron text-sm text-txt tracking-wide">{c.titulo}</h3>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded border" style={{
                          color: statusColor(c.status), borderColor: statusColor(c.status) + '50', background: statusColor(c.status) + '14',
                        }}>{c.status}</span>
                        {c.categoria && <span className="font-mono text-[10px] text-txt3 border border-bdr2 rounded px-2 py-0.5">{c.categoria}</span>}
                      </div>
                      <p className="font-mono text-xs text-txt2 mt-2 whitespace-pre-wrap">{c.descricao}</p>
                      <div className="flex items-center gap-3 mt-3 font-mono text-[10px] text-txt3 flex-wrap">
                        <span>por <span className="text-txt2">{c.criadoPor}</span></span>
                        <span>· criado {fmtDT(c.criadoEm)}</span>
                        {c.atualizadoEm !== c.criadoEm && <span>· atualizado {fmtDT(c.atualizadoEm)}</span>}
                        <button onClick={() => setExpandido(expandido === c.id ? null : c.id)}
                          className="flex items-center gap-1 hover:text-gold transition-colors">
                          <Clock size={11} /> histórico ({c.historico.length})
                          <ChevronDown size={11} className={`transition-transform ${expandido === c.id ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      <AnimatePresence>
                        {expandido === c.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-2 border-l-2 border-bdr2 pl-3 space-y-1">
                            {c.historico.map((h, i) => (
                              <div key={i} className="font-mono text-[10px] text-txt3">
                                <span className="text-txt2">{h.por}</span> · {fmtDT(h.em)} — {h.acao}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => abrirEdit(c)} className="text-txt3 hover:text-gold transition-colors p-1"><Pencil size={14} /></button>
                        <button onClick={() => remover(c)} className="text-txt3 hover:text-red transition-colors p-1"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Modal criar/editar */}
      <ModalOverlay open={modal} onClose={() => setModal(false)} title={form.id ? 'EDITAR COMUNICADO' : 'NOVO COMUNICADO'} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="font-mono text-xs text-txt2 block mb-1">TÍTULO</label>
            <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
              className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt" />
          </div>
          <div>
            <label className="font-mono text-xs text-txt2 block mb-1">DESCRIÇÃO</label>
            <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={5}
              className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt resize-y" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-txt2 block mb-1">CATEGORIA</label>
              <input value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} placeholder="opcional"
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt placeholder-txt3" />
            </div>
            <div>
              <label className="font-mono text-xs text-txt2 block mb-1">STATUS</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as StatusComunicado }))}
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt">
                {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <HudButton loading={createMut.isPending || updateMut.isPending} onClick={salvar} className="flex-1">
              {form.id ? 'SALVAR' : 'CRIAR'}
            </HudButton>
            <HudButton variant="ghost" onClick={() => setModal(false)} className="flex-1">CANCELAR</HudButton>
          </div>
        </div>
      </ModalOverlay>
    </div>
  )
}
