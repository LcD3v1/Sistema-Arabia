import type { Moeda } from '@/types'

export const MOEDAS: Moeda[] = ['Real', 'Dólar']

export const moedaSymbol = (moeda?: Moeda) => (moeda === 'Dólar' ? 'US$' : 'R$')

export const fmtMoney = (valor: number) => `R$ ${(valor ?? 0).toLocaleString('pt-BR')}`

export const fmtMoeda = (valor: number, moeda?: Moeda) =>
  `${moedaSymbol(moeda)} ${(valor ?? 0).toLocaleString('pt-BR')}`
