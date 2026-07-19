import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export default function GlowCard({ children, className = '', onClick }: Props) {
  return (
    <div
      className={`glow-card ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Textura de mármore vermelho/preto (igual ao mockup) */}
      <div className="card-arabesque">
        <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="100%" height="100%" fill="url(#arabesque)" />
        </svg>
      </div>
      <div className="gc-content">{children}</div>
    </div>
  )
}
