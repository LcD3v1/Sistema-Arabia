import { z, ZodSchema } from 'zod'
import { Request, Response, NextFunction } from 'express'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'Dados inválidos',
        details: result.error.issues.map(e =>
          `${(e.path as (string|number|symbol)[]).map(String).join('.')}: ${e.message}`
        ),
      })
      return
    }
    req.body = result.data
    next()
  }
}

// ── Schemas ──────────────────────────────────────────────────────────────────
// Em Zod v4, transform() cria ZodPipe; min/max devem vir ANTES do transform

const safeStr = (min: number, max: number) =>
  z.string().min(min).max(max).transform((s: string) => s.trim())

const safeStrOpt = (max: number) =>
  z.string().max(max).transform((s: string) => s.trim())

const MAX_QUANTIDADE_BAU = 1_000_000_000

export const loginSchema = z.object({
  username: z.string().min(1).max(64).regex(/^[\w.\-@]+$/, 'Usuário contém caracteres inválidos'),
  password: z.string().min(1).max(128),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(4).max(128),
})

const permissoesSchema = z.record(
  z.string(),
  z.object({ ver: z.boolean().optional(), editar: z.boolean().optional() }),
)

export const createContaSchema = z.object({
  username: z.string().min(2).max(64).regex(/^[\w.\-]+$/, 'Usuário contém caracteres inválidos'),
  password: z.string().min(4).max(128),
  cargoPermissaoId: z.number().int().positive().optional(),
  permissoes: permissoesSchema.optional(),
})

export const updateContaSchema = z.object({
  username: z.string().min(2).max(64).regex(/^[\w.\-]+$/, 'Usuário contém caracteres inválidos').optional(),
  cargoPermissaoId: z.number().int().positive().optional(),
  permissoes: permissoesSchema.optional(),
  ativo: z.boolean().optional(),
  password: z.string().min(4).max(128).optional(),
}).refine(body => Object.keys(body).length > 0, { message: 'Nenhum campo fornecido' })

export const createCargoPermissaoSchema = z.object({
  nome: safeStr(1, 50),
  permissoes: permissoesSchema,
})

export const updateCargoPermissaoSchema = z.object({
  nome: safeStr(1, 50).optional(),
  permissoes: permissoesSchema.optional(),
}).refine(body => Object.keys(body).length > 0, { message: 'Nenhum campo fornecido' })

export const membroSchema = z.object({
  badge:          safeStrOpt(20).default(''),
  passaporte:     safeStrOpt(20).default(''),
  policial:       safeStr(1, 100),
  patenteNPD:     safeStrOpt(50).default(''),
  patenteInterna: safeStrOpt(50).default(''),
  status:         z.enum(['Ativo', 'Inativo', 'Ausência']).default('Ativo'),
  entrada:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  promocao:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adv1:           z.boolean().default(false),
  adv2:           z.boolean().default(false),
  adv3:           z.boolean().default(false),
})

export const membroUpdateSchema = z.object({
  badge:          safeStrOpt(20).optional(),
  passaporte:     safeStrOpt(20).optional(),
  policial:       safeStr(1, 100).optional(),
  patenteNPD:     safeStrOpt(50).optional(),
  patenteInterna: safeStrOpt(50).optional(),
  status:         z.enum(['Ativo', 'Inativo', 'Ausência']).optional(),
  entrada:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  promocao:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adv1:           z.boolean().optional(),
  adv2:           z.boolean().optional(),
  adv3:           z.boolean().optional(),
}).refine(body => Object.keys(body).filter(k => body[k as keyof typeof body] !== undefined).length > 0, {
  message: 'Nenhum campo fornecido',
})

const RESULTADO_TIRO = ['Vitória', 'Derrota'] as const
const RESULTADO_FUGA = ['Sucesso', 'Falha'] as const

export const acaoSchema = z.object({
  tipo:         z.enum(['tiro', 'fuga']),
  data:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  horario:      z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido').optional(),
  valor:        z.number().min(0).max(1_000_000_000).optional(),
  moeda:        z.enum(['Real', 'Dólar']).optional(),
  qru:          safeStr(1, 50),
  resultado:    z.enum([...RESULTADO_TIRO, ...RESULTADO_FUGA]),
  comandante:   z.string().max(100).optional(),
  participants: z.array(z.object({
    memberId:       z.number().int().positive(),
    patenteUnidade: safeStrOpt(50),
  })).default([]),
  participantesExtras: z.array(z.object({
    nome:    safeStr(1, 100),
    patente: z.string().max(50).optional(),
  })).default([]),
}).refine(
  b => b.tipo === 'tiro'
    ? (RESULTADO_TIRO as readonly string[]).includes(b.resultado)
    : (RESULTADO_FUGA as readonly string[]).includes(b.resultado),
  { message: 'Resultado incompatível com o tipo de ação', path: ['resultado'] },
)

// ── Vendas de munição ────────────────────────────────────────────────────────

export const municaoTipoSchema = z.object({
  nome:           safeStr(1, 60),
  precoUnitario:  z.number().min(0).max(1_000_000_000),
  moeda:          z.enum(['Real', 'Dólar']).default('Real'),
  ativo:          z.boolean().default(true),
})

export const municaoTipoUpdateSchema = z.object({
  nome:           safeStr(1, 60).optional(),
  precoUnitario:  z.number().min(0).max(1_000_000_000).optional(),
  moeda:          z.enum(['Real', 'Dólar']).optional(),
  ativo:          z.boolean().optional(),
}).refine(body => Object.keys(body).filter(k => body[k as keyof typeof body] !== undefined).length > 0, {
  message: 'Nenhum campo fornecido',
})

export const municaoMovimentoSchema = z.object({
  data:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  tipo:        z.enum(['entrada', 'saida']),
  municaoId:   z.number().int().positive(),
  quantidade:  z.number().int().positive().max(MAX_QUANTIDADE_BAU),
  observacoes: z.string().max(500).optional(),
})

export const vendaSchema = z.object({
  data:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  membroId:    z.number().int().positive(),
  familia:     safeStr(1, 100),
  pagamento:   z.enum(['dinheiro', 'troca']),
  itens: z.array(z.object({
    municaoId:  z.number().int().positive(),
    quantidade: z.number().int().positive().max(MAX_QUANTIDADE_BAU),
  })).min(1, 'O carrinho está vazio'),
  observacoes: z.string().max(500).optional(),
})

export const bauItemSchema = z.object({
  nome: safeStr(1, 50),
})

const STATUS_COMUNICADO = ['Aberto', 'Em andamento', 'Concluído', 'Cancelado'] as const

export const comunicadoSchema = z.object({
  titulo:    safeStr(1, 120),
  descricao: safeStr(1, 5000),
  categoria: safeStrOpt(50).default(''),
  status:    z.enum(STATUS_COMUNICADO).default('Aberto'),
})

export const comunicadoUpdateSchema = z.object({
  titulo:    safeStr(1, 120).optional(),
  descricao: safeStr(1, 5000).optional(),
  categoria: safeStrOpt(50).optional(),
  status:    z.enum(STATUS_COMUNICADO).optional(),
}).refine(b => Object.keys(b).length > 0, { message: 'Nenhum campo fornecido' })

export const lavagemSchema = z.object({
  data:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  familia:         safeStr(1, 80),
  dinheiroSujo:    z.number().min(0).max(1_000_000_000),
  dinheiroLimpo:   z.number().min(0).max(1_000_000_000),
  porcentagem:     z.number().min(0).max(100).optional(),
  porcentagemNome: safeStrOpt(60).optional(),
  lucroFamiliaPorcentagem: z.number().min(0).max(100).optional(),
  observacoes:     safeStrOpt(300).default(''),
})

export const lavagemPorcentagemSchema = z.object({
  nome:                    safeStr(1, 60),
  valor:                   z.number().min(0).max(100),
  lucroFamiliaPorcentagem: z.number().min(0).max(100).optional(),
})

export const tabletMovimentoSchema = z.object({
  data:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  tipo:        z.enum(['deposito', 'saque']),
  membroId:    z.number().int().positive(),
  valor:       z.number().positive().max(1_000_000_000),
  moeda:       z.enum(['Real', 'Dólar']).default('Real'),
  observacoes: safeStrOpt(300).default(''),
})

export const ausenciaSchema = z.object({
  membroId:   z.number().int().positive(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  dataFim:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  motivo:     safeStrOpt(300).default(''),
}).refine(b => b.dataFim >= b.dataInicio, {
  message: 'A data de fim deve ser maior ou igual à de início',
  path: ['dataFim'],
})

export const bauMovimentoSchema = z.object({
  data:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  tipo:        z.enum(['entrada', 'saida']),
  membroId:    z.number().int().positive(),
  item:        safeStr(1, 50),
  quantidade:  z.number().int().positive().max(MAX_QUANTIDADE_BAU),
  observacoes: safeStrOpt(300).default(''),
})

// Movimentação em lote: vários itens de uma vez (mesmo tipo/membro/data)
export const bauLoteSchema = z.object({
  data:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  tipo:        z.enum(['entrada', 'saida']),
  membroId:    z.number().int().positive(),
  observacoes: safeStrOpt(300).default(''),
  itens: z.array(z.object({
    item:       safeStr(1, 50),
    quantidade: z.number().int().positive().max(MAX_QUANTIDADE_BAU),
  })).min(1, 'Adicione ao menos um item').max(50),
})

export const recrutaCreateSchema = z.object({
  nome:        safeStr(1, 100),
  data:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  observacoes: safeStrOpt(500).default(''),
})

export const avaliacaoRecrutaSchema = z.object({
  scores:      z.record(z.string(), z.number().min(0).max(10)).default({}),
  total:       z.number().min(0).max(10).default(0),
  observacoes: safeStrOpt(500).default(''),
})

export const qruSchema = z.object({
  nome: z.string().min(1).max(50).regex(/^[\w\s\-]+$/, 'Nome do QRU contém caracteres inválidos').transform((s: string) => s.trim()),
})

export const patenteSchema = z.object({
  nome: safeStr(1, 50),
})

export const cargoSchema = z.object({
  nome: safeStr(1, 50),
})

export const logoSchema = z.object({
  logo: z.string()
    .min(1)
    .max(2_900_000, 'Logo excede 2MB')
    .refine(
      // Apenas data-URLs de imagem rasterizada (sem SVG, que pode carregar scripts)
      s => /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s),
      'Formato de imagem inválido (use PNG, JPG, WEBP ou GIF)',
    ),
})

export const recCfgSchema = z.object({
  notaMinima: z.number().min(0).max(10).optional(),
  categorias: z.array(z.object({
    id:   z.number().int().positive(),
    nome: safeStr(1, 50),
    peso: z.number().min(0).max(100),
  })).optional(),
})

export const reorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()),
})

export const reorderPatenteSchema = z.object({
  patentes: z.array(z.string().max(50)),
})
