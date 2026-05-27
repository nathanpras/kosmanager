import { MONTHS_FULL } from './format'

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function bulanIni(): string {
  const d = new Date()
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
}

export function monthsBack(n: number): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(`${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`)
  }
  return result
}
