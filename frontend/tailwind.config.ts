import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:    '#0D0D0D',
        sb:    '#101010',
        card:  '#141414',
        card2: '#1A1414',
        bdr:   '#221010',
        bdr2:  '#2E1212',
        bdrg:  '#3D1818',
        txt:   '#ffffff',
        txt2:  '#c8c8c8',
        txt3:  '#6f6f6f',
        gold:  '#CC0000',
        gold2: '#FF2222',
        gold3: '#ff6666',
        green: '#ffffff',
        red:   '#CC0000',
        blue:  '#8a8a8a',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono:     ['Share Tech Mono', 'monospace'],
        body:     ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
