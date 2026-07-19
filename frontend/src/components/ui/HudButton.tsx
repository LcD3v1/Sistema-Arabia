import { motion } from 'framer-motion'
import { ReactNode, ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const VARIANTS = {
  primary: 'border-gold text-gold hover:bg-gold/10',
  danger:  'border-red text-red hover:bg-red/10',
  ghost:   'border-bdrg text-txt2 hover:border-gold hover:text-gold',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3 text-base',
}

export default function HudButton({
  children, variant = 'primary', size = 'md',
  loading, className = '', disabled, ...rest
}: Props) {
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.03 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      disabled={disabled || loading}
      className={`
        border font-orbitron tracking-wider rounded transition-colors duration-200
        disabled:opacity-40 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
      {...(rest as object)}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          Aguarde...
        </span>
      ) : children}
    </motion.button>
  )
}
