/**
 * Paleta ARÁBIA — verde esmeralda (marca) + ouro (filete) sobre base escura.
 *
 * Espelha as CSS vars de `index.css`. Existe para os casos em que a cor
 * precisa ir para JS (gráficos Recharts, estilos inline, PDF), onde
 * `var(--gold)` não é resolvido.
 *
 * No tema original (Montreal) marca e "negativo" eram o mesmo vermelho.
 * Aqui são coisas distintas: ACCENT identifica a marca, DANGER comunica
 * derrota/saída/falha. Não use ACCENT para estado negativo.
 */
export const PALETTE = {
  /** Acento da marca — verde esmeralda. */
  ACCENT: '#12A150',
  /** Verde claro, para texto/realce sobre fundo escuro. */
  ACCENT_BRIGHT: '#2FD37E',
  /** Verde pálido. */
  ACCENT_SOFT: '#8FE9BB',

  /** Ouro — filetes, colchetes e detalhes decorativos. */
  TRIM: '#C9A227',

  /** Positivo: entrada, depósito, vitória. */
  POSITIVE: '#2FD37E',
  /** Negativo: derrota, falha, saída, saque. */
  DANGER: '#E0523E',

  /** Texto/estado neutro. */
  MUTED: '#7FA890',
  /** Texto/estado desativado. */
  DIM: '#5E7A6A',

  /** Superfícies. */
  BG: '#07100C',
  CARD: '#0E1B14',
  BORDER: '#1E4029',
  TEXT: '#EAF3EC',
} as const
