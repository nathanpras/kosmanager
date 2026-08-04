import { describe, it, expect } from 'vitest'
import { selCsv, keCsv } from '../../utils/berkas'

describe('selCsv', () => {
  it('leaves plain values untouched', () => {
    expect(selCsv('Listrik')).toBe('Listrik')
    expect(selCsv(150000)).toBe('150000')
  })

  it('quotes values containing a comma', () => {
    expect(selCsv('Jl. Waru Raya No.23, Kapuk')).toBe('"Jl. Waru Raya No.23, Kapuk"')
  })

  it('escapes embedded quotes by doubling them', () => {
    expect(selCsv('kamar "pojok"')).toBe('"kamar ""pojok"""')
  })

  it('quotes values containing newlines', () => {
    expect(selCsv('baris1\nbaris2')).toBe('"baris1\nbaris2"')
  })

  it('renders null and undefined as empty, not as text', () => {
    expect(selCsv(null)).toBe('')
    expect(selCsv(undefined)).toBe('')
  })

  it('keeps a zero, which is not the same as empty', () => {
    expect(selCsv(0)).toBe('0')
  })
})

describe('keCsv', () => {
  const kolom = [
    { kunci: 'nama' as const, judul: 'Nama' },
    { kunci: 'jumlah' as const, judul: 'Jumlah' },
  ]

  it('writes a header row followed by data rows', () => {
    const csv = keCsv([{ nama: 'Lia', jumlah: 2_000_000 }], kolom)
    expect(csv.replace('﻿', '')).toBe('Nama,Jumlah\r\nLia,2000000')
  })

  it('starts with a UTF-8 BOM so Excel reads accents correctly', () => {
    expect(keCsv([], kolom).startsWith('﻿')).toBe(true)
  })

  it('uses CRLF line endings', () => {
    const csv = keCsv([{ nama: 'A', jumlah: 1 }, { nama: 'B', jumlah: 2 }], kolom)
    expect(csv).toContain('A,1\r\nB,2')
  })

  it('emits only a header when there are no rows', () => {
    expect(keCsv([], kolom).replace('﻿', '')).toBe('Nama,Jumlah')
  })

  it('escapes data that would otherwise break the columns', () => {
    const csv = keCsv([{ nama: 'Budi, S.T.', jumlah: 500 }], kolom)
    expect(csv).toContain('"Budi, S.T.",500')
  })

  it('leaves a missing field empty rather than writing undefined', () => {
    const csv = keCsv([{ nama: 'Lia' } as { nama: string; jumlah?: number }],
      [{ kunci: 'nama', judul: 'Nama' }, { kunci: 'jumlah', judul: 'Jumlah' }])
    expect(csv).toContain('Lia,')
    expect(csv).not.toContain('undefined')
  })
})
