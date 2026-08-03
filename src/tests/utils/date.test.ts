import { describe, it, expect, vi, afterEach } from 'vitest'
import { today, bulanIni, monthsBack, bulanKey, bulanFromTgl, sortBulanDesc } from '../../utils/date'

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

describe('bulanKey', () => {
  it('maps Indonesian month names to a sortable YYYY-MM key', () => {
    expect(bulanKey('Januari 2026')).toBe('2026-01')
    expect(bulanKey('Maret 2026')).toBe('2026-03')
    expect(bulanKey('Desember 2025')).toBe('2025-12')
  })

  it('sorts chronologically, not alphabetically', () => {
    // Urutan alfabetis akan menaruh Agustus sebelum Maret sebelum Mei.
    expect(bulanKey('Maret 2026') < bulanKey('Mei 2026')).toBe(true)
    expect(bulanKey('Mei 2026') < bulanKey('Agustus 2026')).toBe(true)
  })

  it('orders across a year boundary', () => {
    expect(bulanKey('Desember 2025') < bulanKey('Januari 2026')).toBe(true)
  })

  it('falls back instead of throwing on unrecognised input', () => {
    expect(bulanKey('bukan bulan')).toBe('0000-00')
    expect(bulanKey('')).toBe('0000-00')
    expect(bulanKey('Maret')).toBe('0000-00')
  })
})

describe('bulanFromTgl', () => {
  it('converts an ISO date to an Indonesian month label', () => {
    expect(bulanFromTgl('2026-03-15')).toBe('Maret 2026')
    expect(bulanFromTgl('2026-12-31')).toBe('Desember 2026')
  })

  it('does not shift the month on the first of the month', () => {
    // new Date('2026-03-01') diurai sebagai UTC; getMonth() lokal di zona waktu
    // negatif akan mengembalikannya ke Februari. Parsing tekstual tidak.
    expect(bulanFromTgl('2026-03-01')).toBe('Maret 2026')
    expect(bulanFromTgl('2026-01-01')).toBe('Januari 2026')
  })

  it('returns null for missing or malformed input', () => {
    expect(bulanFromTgl(undefined)).toBeNull()
    expect(bulanFromTgl('')).toBeNull()
    expect(bulanFromTgl('bukan tanggal')).toBeNull()
    expect(bulanFromTgl('2026-13-01')).toBeNull()
  })
})

describe('sortBulanDesc', () => {
  it('returns newest first', () => {
    expect(sortBulanDesc(['Maret 2026', 'Agustus 2026', 'Desember 2025', 'Mei 2026']))
      .toEqual(['Agustus 2026', 'Mei 2026', 'Maret 2026', 'Desember 2025'])
  })

  it('does not mutate the input', () => {
    const input = ['Maret 2026', 'Agustus 2026']
    sortBulanDesc(input)
    expect(input).toEqual(['Maret 2026', 'Agustus 2026'])
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
