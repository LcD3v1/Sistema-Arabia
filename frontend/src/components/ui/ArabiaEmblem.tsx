import { PALETTE } from '@/lib/theme'

/**
 * Emblema ARÁBIA — palmeira sobre duas cimitarras cruzadas.
 *
 * Substitui o antigo MapleLeaf. Mantém o mesmo contrato (`size`, `color`,
 * `className`) para ser um drop-in nos mesmos pontos: sidebar, topbar,
 * login e o placeholder do LogoUploader.
 *
 * O viewBox é quadrado e o desenho fica dentro de um círculo de raio ~58,
 * porque o emblema é sempre exibido dentro de `.logo-ring` (recorte
 * circular). Traços com no mínimo 4 de espessura para não sumir em 16px.
 */
export default function ArabiaEmblem({
  size = 28,
  color = PALETTE.ACCENT,
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-60 -60 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Cimitarras cruzadas — lâmina curva + guarda + punho, espelhadas */}
      <g fill={color}>
        <path d="M -47,34 C -30,36 -6,26 8,6 L 14,12 C 0,34 -24,45 -45,42 Z" />
        <path d="M 47,34 C 30,36 6,26 -8,6 L -14,12 C 0,34 24,45 45,42 Z" />
        <rect x="6" y="-2" width="16" height="5" rx="2" transform="rotate(45 14 0)" />
        <rect x="-22" y="-2" width="16" height="5" rx="2" transform="rotate(-45 -14 0)" />
      </g>

      {/* Palmeira — tronco e sete folhas em leque */}
      <g fill={color}>
        <path d="M -4,8 C -3,-6 -3,-18 -5,-28 L 5,-28 C 3,-18 3,-6 4,8 Z" />
        <path d="M 0,-30 C -6,-44 -4,-54 0,-58 C 4,-54 6,-44 0,-30 Z" />
        <path d="M -2,-28 C -16,-40 -28,-42 -34,-40 C -28,-31 -14,-25 -2,-24 Z" />
        <path d="M 2,-28 C 16,-40 28,-42 34,-40 C 28,-31 14,-25 2,-24 Z" />
        <path d="M -2,-26 C -18,-30 -30,-26 -35,-20 C -26,-16 -12,-18 -2,-22 Z" />
        <path d="M 2,-26 C 18,-30 30,-26 35,-20 C 26,-16 12,-18 2,-22 Z" />
        <path d="M -2,-24 C -14,-20 -22,-12 -24,-4 C -15,-8 -6,-15 -2,-21 Z" />
        <path d="M 2,-24 C 14,-20 22,-12 24,-4 C 15,-8 6,-15 2,-21 Z" />
      </g>
    </svg>
  )
}
