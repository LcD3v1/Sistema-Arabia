import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, X, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useCreateAcao } from '@/hooks/useAcoes'
import { useQrus } from '@/hooks/useConfig'
import { useMembros } from '@/hooks/useMembros'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import LoadingHud from '@/components/ui/LoadingHud'
import type { ResultadoAcao, TipoAcao, Membro, Moeda } from '@/types'

interface FormData {
  data: string
  horario: string
  valor: number
  moeda: Moeda
  qru: string
  resultado: ResultadoAcao
}

const RESULTADO_BY_TIPO: Record<TipoAcao, { value: ResultadoAcao; color: string }[]> = {
  tiro: [
    { value: 'Vitória', color: 'border-green text-green bg-green/10' },
    { value: 'Derrota', color: 'border-red text-red bg-red/10' },
  ],
  fuga: [
    { value: 'Sucesso', color: 'border-green text-green bg-green/10' },
    { value: 'Falha',   color: 'border-red text-red bg-red/10' },
  ],
}

export default function RegistrarAcaoPage() {
  const navigate = useNavigate()
  const { addToast } = useUIStore()
  const { user } = useAuthStore()
  const podeRegistrar = canEditArea(user, 'registrar')
  const { data: qrus, isLoading: qrusLoading } = useQrus()
  const { data: membros, isLoading: membrosLoading } = useMembros()
  const createAcao = useCreateAcao()

  const [tipo, setTipo] = useState<TipoAcao>('tiro')
  const resultadoOptions = RESULTADO_BY_TIPO[tipo]

  const [selectedMembros, setSelectedMembros] = useState<Array<{ memberId: number; patenteUnidade: string }>>([])
  const [membroSearch, setMembroSearch] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      data: new Date().toISOString().slice(0, 10),
      horario: new Date().toTimeString().slice(0, 5),
      valor: 0,
      moeda: 'Real',
      resultado: 'Vitória',
    },
  })

  const resultado = watch('resultado')

  const filteredMembros = (membros ?? []).filter((m: Membro) =>
    !selectedMembros.some(s => s.memberId === m.id) &&
    (membroSearch === '' || m.policial.toLowerCase().includes(membroSearch.toLowerCase()))
  )

  function addMembro(m: Membro) {
    setSelectedMembros(prev => [...prev, { memberId: m.id, patenteUnidade: m.patenteInterna || '' }])
    setMembroSearch('')
  }

  function removeMembro(id: number) {
    setSelectedMembros(prev => prev.filter(s => s.memberId !== id))
  }

  async function onSubmit(data: FormData) {
    try {
      await createAcao.mutateAsync({
        tipo,
        data: data.data,
        horario: data.horario || undefined,
        valor: Number(data.valor) || 0,
        moeda: data.moeda,
        qru: data.qru,
        resultado: data.resultado,
        participants: selectedMembros,
        participantesExtras: [],
      })
      addToast('success', 'Ação registrada com sucesso!')
      navigate('/acoes/historico')
    } catch {
      addToast('error', 'Erro ao registrar ação.')
    }
  }

  if (qrusLoading || membrosLoading) return <LoadingHud />

  if (!podeRegistrar) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <GlowCard>
          <div className="p-8 text-center">
            <p className="font-orbitron text-sm text-gold tracking-widest mb-2">SOMENTE LEITURA</p>
            <p className="font-mono text-xs text-txt2">Sua conta não tem permissão para registrar ações.</p>
          </div>
        </GlowCard>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <GlowCard>
        <div className="p-6">
          <h2 className="font-orbitron text-sm font-bold text-gold tracking-wider mb-4">
            NOVA AÇÃO
          </h2>

          {/* Abas TIRO / FUGA */}
          <div className="flex gap-2 mb-6">
            {(['tiro', 'fuga'] as TipoAcao[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setTipo(t); setValue('resultado', RESULTADO_BY_TIPO[t][0].value) }}
                className={`flex-1 py-2.5 border rounded font-orbitron text-xs tracking-widest transition-all ${
                  tipo === t ? 'border-red text-red bg-red/10' : 'border-bdr text-txt3 hover:text-txt'
                }`}
              >
                {t === 'tiro' ? 'AÇÃO DE TIRO' : 'AÇÃO DE FUGA'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Data */}
            <div>
              <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">DATA</label>
              <input
                {...register('data', { required: 'Data obrigatória' })}
                type="date"
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt"
              />
              {errors.data && <p className="text-red text-xs font-mono mt-1">{errors.data.message}</p>}
            </div>

            {/* Horário + Valor + Moeda */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">HORÁRIO</label>
                <input
                  {...register('horario')}
                  type="time"
                  className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt"
                />
              </div>
              <div>
                <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">VALOR</label>
                <input
                  {...register('valor', { valueAsNumber: true })}
                  type="number" min={0}
                  className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt"
                />
              </div>
              <div>
                <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">MOEDA</label>
                <select
                  {...register('moeda')}
                  className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt"
                >
                  <option value="Real">Real (R$)</option>
                  <option value="Dólar">Dólar (US$)</option>
                </select>
              </div>
            </div>

            {/* Ação (antigo QRU) */}
            <div>
              <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">AÇÃO</label>
              <select
                {...register('qru', { required: 'Ação obrigatória' })}
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt"
              >
                <option value="">Selecione...</option>
                {(qrus ?? []).map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              {errors.qru && <p className="text-red text-xs font-mono mt-1">{errors.qru.message}</p>}
            </div>

            {/* Resultado */}
            <div>
              <label className="font-mono text-xs text-txt2 tracking-wider block mb-2">RESULTADO</label>
              <div className="flex gap-3">
                {resultadoOptions.map(opt => (
                  <motion.button
                    key={opt.value}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setValue('resultado', opt.value)}
                    className={`flex-1 py-3 border rounded font-orbitron text-xs tracking-wider transition-all ${
                      resultado === opt.value ? opt.color : 'border-bdr text-txt3'
                    }`}
                  >
                    {opt.value.toUpperCase()}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Participantes da Ação */}
            <div>
              <label className="font-mono text-xs text-txt2 tracking-wider block mb-2">
                PARTICIPANTES DA AÇÃO ({selectedMembros.length})
              </label>

              {selectedMembros.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedMembros.map(s => {
                    const m = (membros ?? []).find((m: Membro) => m.id === s.memberId)
                    return (
                      <motion.span
                        key={s.memberId}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1.5 bg-bdr border border-bdr2 rounded px-2 py-1 text-xs font-mono text-txt"
                      >
                        {m?.policial ?? `ID:${s.memberId}`}
                        <button type="button" onClick={() => removeMembro(s.memberId)}
                          className="text-txt3 hover:text-red transition-colors">
                          <X size={12} />
                        </button>
                      </motion.span>
                    )
                  })}
                </div>
              )}

              <div className="relative">
                <input
                  value={membroSearch}
                  onChange={e => setMembroSearch(e.target.value)}
                  placeholder="Buscar membro..."
                  className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt placeholder-txt3"
                />
                {membroSearch && filteredMembros.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-card border border-bdr rounded-b-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredMembros.slice(0, 8).map((m: Membro) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => addMembro(m)}
                        className="w-full text-left px-3 py-2 text-xs font-mono text-txt2 hover:bg-bdr hover:text-txt transition-colors flex items-center gap-2"
                      >
                        <Plus size={12} className="text-gold" />
                        <span>{m.policial}</span>
                        <span className="text-txt3 ml-auto">{m.patenteInterna}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <HudButton type="submit" loading={createAcao.isPending} size="lg" className="w-full justify-center">
                <Send size={16} className="inline mr-2" />
                REGISTRAR AÇÃO
              </HudButton>
            </div>
          </form>
        </div>
      </GlowCard>
    </div>
  )
}
