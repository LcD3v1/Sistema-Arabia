/**
 * Padrões SVG de arabesco geométrico (estrela de oito pontas / khatam) —
 * textura de fundo dos cards, hero e sidebar. Renderizar uma única vez no shell.
 *
 * Substitui o antigo MarbleDefs, que era um `feTurbulence` com matriz de cor
 * vermelha (mármore do tema Montreal). Aqui são `<pattern>`, não `<filter>`:
 * os consumidores usam `fill="url(#arabesque)"`, não `filter=`.
 *
 * O traço é ouro (`--trim`) em opacidade baixa; quem controla o quanto aparece
 * é a opacidade do container (`.hero-arabesque`, `.card-arabesque`, etc.).
 */

const TRIM = '#C9A227'

export default function ArabesqueDefs() {
  return (
    <svg className="svg-defs" style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
      <defs>
        {/* Tile grande — estrela de 8 pontas com losangos nos interstícios */}
        <pattern id="arabesque" patternUnits="userSpaceOnUse" width="48" height="48">
          <g fill="none" stroke={TRIM} strokeWidth="1" opacity="0.55">
            <rect x="10" y="10" width="28" height="28" />
            <rect x="10" y="10" width="28" height="28" transform="rotate(45 24 24)" />
            <circle cx="24" cy="24" r="5" />
            <path d="M 0,0 L 6,0 L 0,6 Z M 48,0 L 42,0 L 48,6 Z M 0,48 L 6,48 L 0,42 Z M 48,48 L 42,48 L 48,42 Z" />
          </g>
        </pattern>

        {/* Tile fino — mesma malha, usada nas faixas laterais estreitas */}
        <pattern id="arabesque-strip" patternUnits="userSpaceOnUse" width="26" height="26">
          <g fill="none" stroke={TRIM} strokeWidth="0.8" opacity="0.5">
            <rect x="5" y="5" width="16" height="16" />
            <rect x="5" y="5" width="16" height="16" transform="rotate(45 13 13)" />
            <circle cx="13" cy="13" r="2.5" />
          </g>
        </pattern>
      </defs>
    </svg>
  )
}
