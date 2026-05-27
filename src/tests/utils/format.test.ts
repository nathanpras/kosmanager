import { describe, it, expect } from 'vitest'
import { fmt, fmtTgl } from '../../utils/format'

describe('fmt', () => {
  it('formats a number as Rupiah', () => {
    expect(fmt(1500000)).toBe('Rp 1.500.000')
  })
  it('formats zero', () => {
    expect(fmt(0)).toBe('Rp 0')
  })
  it('rounds decimals', () => {
    expect(fmt(1500.7)).toBe('Rp 1.501')
  })
})

describe('fmtTgl', () => {
  it('formats ISO date string to Indonesian short date', () => {
    expect(fmtTgl('2026-05-15')).toBe('15 Mei 2026')
  })
  it('returns dash for empty string', () => {
    expect(fmtTgl('')).toBe('-')
  })
  it('returns dash for dash input', () => {
    expect(fmtTgl('-')).toBe('-')
  })
})
