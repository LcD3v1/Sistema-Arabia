import { useState } from 'react'
import {
  Image, List, Radio, Users,
  Plus, Trash2, Archive, KeyRound, Crown, Check, X, ShieldCheck, ShoppingCart,
} from 'lucide-react'
import {
  useQrus, useAddQru, useDeleteQru,
  usePatentes, useAddPatente, useDeletePatente,
  useBauItens, useAddBauItem, useDeleteBauItem,
  useBauGerenciaItens, useAddBauGerenciaItem, useDeleteBauGerenciaItem,
  useCargosPermissao, useCreateCargoPermissao, useUpdateCargoPermissao, useDeleteCargoPermissao,
  useLogo,
} from '@/hooks/useConfig'
import { useContas, useCreateConta, useUpdateConta, useDeleteConta } from '@/hooks/useContas'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { AREAS, emptyPermissoes, canEdit as canEditArea } from '@/lib/permissions'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import ModalOverlay from '@/components/ui/ModalOverlay'
import LogoUploader from '@/components/ui/LogoUploader'
import MunicaoTiposEditor from '@/components/ui/MunicaoTiposEditor'
import type { Conta, Permissoes, CargoPermissao } from '@/types'

const TABS = [
  { id: 'logo',         label: 'Logo',              icon: Image },
  { id: 'patentes',     label: 'Hierarquia',        icon: List },
  { id: 'qrus',         label: 'Ações',             icon: Radio },
  { id: 'bau',          label: 'Itens do Baú',      icon: Archive },
  { id: 'bauGerencia',  label: 'Itens Baú Gerência', icon: Crown },
  { id: 'municao',      label: 'Munição p/ Venda',  icon: ShoppingCart },
  { id: 'cargosPermissao', label: 'Cargos de Permissao', icon: ShieldCheck },
  { id: 'contas',       label: 'Contas',            icon: Users },
] as const

function ListEditor({
  items, onAdd, onDelete, placeholder, canEdit,
}: {
  items: string[]; onAdd: (v: string) => void; onDelete: (v: string) => void
  placeholder: string; canEdit: boolean
}) {
  const [val, setVal] = useState('')
  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex gap-2">
          <input
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal('') } }}
            placeholder={placeholder}
            className="input-gold flex-1 bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt"
          />
          <HudButton size="sm" onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal('') } }}>
            <Plus size={14} />
          </HudButton>
        </div>
      )}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {items.map(item => (
          <div key={item} className="flex items-center justify-between px-3 py-2 bg-card2 border border-bdr rounded group">
            <span className="font-mono text-xs text-txt">{item}</span>
            {canEdit && (
              <button onClick={() => onDelete(item)} className="opacity-0 group-hover:opacity-100 text-txt3 hover:text-red transition-all">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="font-mono text-xs text-txt3 text-center py-4">Nenhum item cadastrado</p>
        )}
      </div>
    </div>
  )
}

function PermissoesEditor({ value, onChange, disabled }: {
  value: Permissoes; onChange: (p: Permissoes) => void; disabled?: boolean
}) {
  function set(area: string, campo: 'ver' | 'editar', v: boolean) {
    const cur = value[area] ?? { ver: false, editar: false }
    const next = { ...cur, [campo]: v }
    if (campo === 'editar' && v) next.ver = true   // editar implica ver
    if (campo === 'ver' && !v) next.editar = false // sem ver, sem editar
    onChange({ ...value, [area]: next })
  }
  return (
    <div className="border border-bdr rounded overflow-hidden">
      <div className="grid grid-cols-[1fr_56px_56px] items-center px-3 py-2 bg-card2 font-mono text-[10px] text-txt3 tracking-wider">
        <span>ÁREA</span>
        <span className="text-center">VER</span>
        <span className="text-center">EDITAR</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {AREAS.map(a => {
          const perm = value[a.id] ?? { ver: false, editar: false }
          return (
            <div key={a.id} className="grid grid-cols-[1fr_56px_56px] items-center px-3 py-1.5 border-t border-bdr/60">
              <span className="font-mono text-xs text-txt">{a.label}</span>
              <input type="checkbox" disabled={disabled} checked={perm.ver}
                onChange={e => set(a.id, 'ver', e.target.checked)}
                className="accent-gold w-4 h-4 justify-self-center" />
              <input type="checkbox" disabled={disabled} checked={perm.editar}
                onChange={e => set(a.id, 'editar', e.target.checked)}
                className="accent-gold w-4 h-4 justify-self-center" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CargosPermissaoEditor({
  items, canEdit, onAdd, onUpdate, onDelete,
}: {
  items: CargoPermissao[]
  canEdit: boolean
  onAdd: (nome: string, permissoes: Permissoes) => void
  onUpdate: (id: number, nome: string, permissoes: Permissoes) => void
  onDelete: (id: number) => void
}) {
  const [nome, setNome] = useState('')
  const [permissoes, setPermissoes] = useState<Permissoes>(emptyPermissoes())
  const [editId, setEditId] = useState<number | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editPermissoes, setEditPermissoes] = useState<Permissoes>(emptyPermissoes())

  function resetCreate() {
    setNome('')
    setPermissoes(emptyPermissoes())
  }

  function startEdit(cargo: CargoPermissao) {
    setEditId(cargo.id)
    setEditNome(cargo.nome)
    setEditPermissoes({ ...emptyPermissoes(), ...cargo.permissoes })
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="border border-bdr rounded p-4 bg-card2/40 space-y-3">
          <div className="flex gap-2">
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome do cargo..."
              className="input-gold flex-1 bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt"
            />
            <HudButton
              size="sm"
              onClick={() => {
                if (!nome.trim()) return
                onAdd(nome.trim(), permissoes)
                resetCreate()
              }}
            >
              <Plus size={14} className="inline mr-1.5" /> Criar
            </HudButton>
          </div>
          <PermissoesEditor value={permissoes} onChange={setPermissoes} />
        </div>
      )}

      <div className="space-y-2">
        {items.map(cargo => (
          <div key={cargo.id} className="border border-bdr rounded bg-card2 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-bdr">
              {editId === cargo.id ? (
                <input
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  className="input-gold flex-1 bg-bg border border-bdr2 rounded px-2 py-1 text-xs font-mono text-txt"
                />
              ) : (
                <span className="font-mono text-xs text-txt">{cargo.nome}</span>
              )}
              {canEdit && (
                <div className="flex items-center gap-2">
                  {editId === cargo.id ? (
                    <>
                      <button onClick={() => { onUpdate(cargo.id, editNome.trim(), editPermissoes); setEditId(null) }} className="text-green hover:text-green/80">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditId(null)} className="text-txt3 hover:text-red">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(cargo)} className="text-txt3 hover:text-gold">
                        <KeyRound size={14} />
                      </button>
                      <button onClick={() => onDelete(cargo.id)} className="text-txt3 hover:text-red">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="p-3">
              <PermissoesEditor
                value={editId === cargo.id ? editPermissoes : cargo.permissoes}
                onChange={setEditPermissoes}
                disabled={!canEdit || editId !== cargo.id}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="font-mono text-xs text-txt3 text-center py-4">Nenhum cargo de permissao cadastrado</p>
        )}
      </div>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [activeTab, setActiveTab] = useState('logo')

  const canEditConfig = canEditArea(user, 'configuracoes')

  const { data: qrus = [] } = useQrus()
  const addQru = useAddQru()
  const deleteQru = useDeleteQru()

  const { data: patentes = [] } = usePatentes()
  const addPatente = useAddPatente()
  const deletePatente = useDeletePatente()

  const { data: bauItens = [] } = useBauItens()
  const addBauItem = useAddBauItem()
  const deleteBauItem = useDeleteBauItem()

  const { data: bauGerenciaItens = [] } = useBauGerenciaItens()
  const addBauGerenciaItem = useAddBauGerenciaItem()
  const deleteBauGerenciaItem = useDeleteBauGerenciaItem()

  const { data: cargosPermissao = [] } = useCargosPermissao()
  const createCargoPermissao = useCreateCargoPermissao()
  const updateCargoPermissao = useUpdateCargoPermissao()
  const deleteCargoPermissao = useDeleteCargoPermissao()

  const { data: logoData } = useLogo()

  const { data: contas = [] } = useContas()
  const createConta = useCreateConta()
  const updateConta = useUpdateConta()
  const deleteConta = useDeleteConta()

  // Nova conta
  const [novaContaModal, setNovaContaModal] = useState(false)
  const [form, setForm] = useState({ username: '', password: '' })
  const [novaCargoId, setNovaCargoId] = useState<number | ''>('')

  // Editar conta existente (usuário, senha, permissões)
  const [editConta, setEditConta] = useState<Conta | null>(null)
  const [editCargoId, setEditCargoId] = useState<number | ''>('')
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')

  function abrirEdit(conta: Conta) {
    setEditConta(conta)
    setEditCargoId(conta.cargoPermissaoId ?? '')
    setEditUsername(conta.username)
    setEditPassword('')
  }

  function salvarEdicao() {
    if (!editConta) return
    if (!editCargoId) { addToast('error', 'Selecione um cargo de permissao.'); return }
    const body: { id: number; username?: string; password?: string; cargoPermissaoId: number } = {
      id: editConta.id,
      cargoPermissaoId: Number(editCargoId),
    }
    if (editUsername.trim() && editUsername.trim() !== editConta.username) body.username = editUsername.trim()
    if (editPassword.trim()) body.password = editPassword.trim()
    updateConta.mutate(body, {
      onSuccess: () => { addToast('success', 'Conta atualizada!'); setEditConta(null) },
      onError: e => onError(e, 'Erro ao salvar conta.'),
    })
  }

  function onError(err: unknown, fallback: string) {
    const data = (err as { response?: { data?: { error?: string; details?: string[] } } })?.response?.data
    addToast('error', data?.details?.length ? data.details.join(' | ') : (data?.error ?? fallback))
  }

  return (
    <div className="p-6 space-y-4">
      {/* Tabs */}
      <GlowCard>
        <div className="p-3 flex gap-1 flex-wrap">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono transition-all ${
                  activeTab === tab.id
                    ? 'bg-bdrg text-gold border border-gold/30'
                    : 'text-txt2 hover:bg-bdr hover:text-txt border border-transparent'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </GlowCard>

      {/* Conteúdo */}
      <GlowCard>
        <div className="p-6">
          {!canEditConfig && (
            <p className="font-mono text-[10px] text-txt3 mb-4">Modo somente leitura — você não tem permissão de editar Configurações.</p>
          )}

          {activeTab === 'logo' && <LogoUploader currentLogo={logoData?.logo ?? ''} />}

          {activeTab === 'patentes' && (
            <div>
              <h3 className="font-orbitron text-xs text-gold tracking-wider mb-4">HIERARQUIA</h3>
              <ListEditor items={patentes} onAdd={v => addPatente.mutate(v)} onDelete={v => deletePatente.mutate(v)} placeholder="Nova hierarquia..." canEdit={canEditConfig} />
            </div>
          )}

          {activeTab === 'qrus' && (
            <div>
              <h3 className="font-orbitron text-xs text-gold tracking-wider mb-4">GERENCIAR AÇÕES</h3>
              <ListEditor items={qrus} onAdd={v => addQru.mutate(v)} onDelete={v => deleteQru.mutate(v)} placeholder="Nova ação..." canEdit={canEditConfig} />
            </div>
          )}

          {activeTab === 'bau' && (
            <div>
              <h3 className="font-orbitron text-xs text-gold tracking-wider mb-4">ITENS DO BAÚ</h3>
              <ListEditor items={bauItens} onAdd={v => addBauItem.mutate(v)} onDelete={v => deleteBauItem.mutate(v)} placeholder="Novo item..." canEdit={canEditConfig} />
            </div>
          )}

          {activeTab === 'bauGerencia' && (
            <div>
              <h3 className="font-orbitron text-xs text-gold tracking-wider mb-4">ITENS DO BAÚ DA GERÊNCIA</h3>
              <ListEditor items={bauGerenciaItens} onAdd={v => addBauGerenciaItem.mutate(v)} onDelete={v => deleteBauGerenciaItem.mutate(v)} placeholder="Novo item..." canEdit={canEditConfig} />
            </div>
          )}

          {activeTab === 'municao' && (
            <div>
              <h3 className="font-orbitron text-xs text-gold tracking-wider mb-4">MUNIÇÃO PARA VENDA</h3>
              <MunicaoTiposEditor canEdit={canEditConfig} />
            </div>
          )}

          {activeTab === 'cargosPermissao' && (
            <div>
              <h3 className="font-orbitron text-xs text-gold tracking-wider mb-4">CARGOS DE PERMISSAO</h3>
              <CargosPermissaoEditor
                items={cargosPermissao}
                canEdit={canEditConfig}
                onAdd={(nome, permissoes) => createCargoPermissao.mutate({ nome, permissoes }, { onError: e => onError(e, 'Erro ao criar cargo.') })}
                onUpdate={(id, nome, permissoes) => updateCargoPermissao.mutate({ id, nome, permissoes }, { onError: e => onError(e, 'Erro ao salvar cargo.') })}
                onDelete={id => {
                  if (confirm('Excluir este cargo de permissao?')) {
                    deleteCargoPermissao.mutate(id, { onError: e => onError(e, 'Erro ao excluir cargo.') })
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'contas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-orbitron text-xs text-gold tracking-wider">CONTAS DE ACESSO</h3>
                {canEditConfig && (
                  <HudButton size="sm" onClick={() => { setForm({ username: '', password: '' }); setNovaCargoId(cargosPermissao[0]?.id ?? ''); setNovaContaModal(true) }}>
                    <Plus size={14} className="inline mr-1.5" /> Nova Conta
                  </HudButton>
                )}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bdr">
                    {['Usuario', 'Cargo', 'Status', 'Acoes'].map(h => (
                      <th key={h} className="text-left font-mono text-xs text-txt3 px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contas.map(conta => (
                    <tr key={conta.id} className="border-b border-bdr/50 hover:bg-bdr/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs text-txt">{conta.username}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-txt2">{conta.cargoPermissaoNome ?? '-'}</td>
                      <td className="px-3 py-2.5">
                        <button
                          disabled={!canEditConfig}
                          onClick={() => updateConta.mutate({ id: conta.id, ativo: !conta.ativo }, { onError: e => onError(e, 'Erro ao alterar status.') })}
                          className={`font-mono text-xs px-2 py-0.5 rounded border disabled:opacity-50 disabled:cursor-default ${
                            conta.ativo ? 'border-green/40 text-green bg-green/10' : 'border-red/40 text-red bg-red/10'
                          }`}
                        >
                          {conta.ativo ? '● Ativo' : '○ Inativo'}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        {canEditConfig && (
                          <div className="flex items-center gap-3">
                            <button onClick={() => abrirEdit(conta)} title="Editar conta"
                              className="text-txt3 hover:text-gold transition-colors flex items-center gap-1 font-mono text-xs">
                              <KeyRound size={14} /> Editar
                            </button>
                            {conta.id !== user?.contaId && (
                              <button onClick={() => { if (confirm('Excluir esta conta?')) deleteConta.mutate(conta.id, { onError: e => onError(e, 'Erro ao excluir.') }) }}
                                className="text-txt3 hover:text-red transition-colors">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </GlowCard>

      {/* Modal Nova Conta */}
      <ModalOverlay open={novaContaModal} onClose={() => setNovaContaModal(false)} title="NOVA CONTA" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-txt2 block mb-1">USUÁRIO</label>
              <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                placeholder="min. 2 — letras, números, _ . -"
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt placeholder:text-txt3" />
            </div>
            <div>
              <label className="font-mono text-xs text-txt2 block mb-1">SENHA</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="min. 4 caracteres"
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt placeholder:text-txt3" />
            </div>
          </div>
          <div>
            <label className="font-mono text-xs text-txt2 block mb-2">PERMISSÕES</label>
            <select
              value={novaCargoId}
              onChange={e => setNovaCargoId(e.target.value ? Number(e.target.value) : '')}
              className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt"
            >
              <option value="">Selecione...</option>
              {cargosPermissao.map(cargo => (
                <option key={cargo.id} value={cargo.id}>{cargo.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <HudButton
              loading={createConta.isPending}
              onClick={() => {
                if (!form.username || !form.password) { addToast('error', 'Preencha usuário e senha.'); return }
                if (!novaCargoId) { addToast('error', 'Selecione um cargo de permissao.'); return }
                createConta.mutate({ username: form.username, password: form.password, cargoPermissaoId: Number(novaCargoId) }, {
                  onSuccess: () => { addToast('success', 'Conta criada!'); setNovaContaModal(false) },
                  onError: e => onError(e, 'Erro ao criar conta.'),
                })
              }}
              className="flex-1"
            >
              CRIAR CONTA
            </HudButton>
            <HudButton variant="ghost" onClick={() => setNovaContaModal(false)} className="flex-1">CANCELAR</HudButton>
          </div>
        </div>
      </ModalOverlay>

      {/* Modal Editar Conta */}
      <ModalOverlay open={!!editConta} onClose={() => setEditConta(null)} title={`EDITAR CONTA — ${editConta?.username ?? ''}`} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-txt2 block mb-1">USUÁRIO</label>
              <input value={editUsername} onChange={e => setEditUsername(e.target.value)}
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt" />
            </div>
            <div>
              <label className="font-mono text-xs text-txt2 block mb-1">NOVA SENHA</label>
              <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                placeholder="deixe em branco p/ manter"
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt placeholder:text-txt3" />
            </div>
          </div>
          <div>
            <label className="font-mono text-xs text-txt2 block mb-2">PERMISSÕES</label>
            <select
              value={editCargoId}
              onChange={e => setEditCargoId(e.target.value ? Number(e.target.value) : '')}
              className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt"
            >
              <option value="">Selecione...</option>
              {cargosPermissao.map(cargo => (
                <option key={cargo.id} value={cargo.id}>{cargo.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <HudButton loading={updateConta.isPending} onClick={salvarEdicao} className="flex-1">
              SALVAR
            </HudButton>
            <HudButton variant="ghost" onClick={() => setEditConta(null)} className="flex-1">CANCELAR</HudButton>
          </div>
        </div>
      </ModalOverlay>
    </div>
  )
}
