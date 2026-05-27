import { describe, it, expect, vi, afterEach } from 'vitest'
import { today, bulanIni, monthsBack } from '../../utils/date'

afterEach(() => vi.useRealTimers())

describe('today', () => {
  it('returns YYYY-MM-DD format', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27'))
    expect(today()).toBe('2026-05-27')
  })
})

describe('bulanIni', () => {
  it('returns Indonesian month and year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27'))
    expect(bulanIni()).toBe('Mei 2026')
  })
})

describe('monthsBack', () => {
  it('returns array of N month strings going back from now', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27'))
    const result = monthsBack(3)
    expect(result).toEqual(['Maret 2026', 'April 2026', 'Mei 2026'])
  })
})
