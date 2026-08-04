import { describe, it, expect } from 'vitest'
import { jenisIkon, jenisWarna, durasiHari, labelDurasi, ringkasKeluhan } from '../../utils/keluhan'
import { fmtTgl } from '../../utils/format'

describe('jenisIkon / jenisWarna', () => {
  it('returns the configured icon and colour', () => {
    expect(jenisIkon('AC')).toBe('❄️')
    expect(jenisWarna('AC')).toBe('#0891B2')
  })

  it('falls back for unknown or missing types', () => {
    expect(jenisIkon('entah')).toBe('🔧')
    expect(jenisIkon(undefined)).toBe('🔧')
    expect(jenisWarna(undefined)).toBe('#737373')
  })
})

describe('durasiHari', () => {
  it('counts whole days between report and close', () => {
    expect(durasiHari('2026-03-01', '2026-03-04')).toBe(3)
  })

  it('returns 0 when closed the same day', () => {
    expect(durasiHari('2026-03-01', '2026-03-01')).toBe(0)
  })

  it('spans month and year boundaries', () => {
    expect(durasiHari('2026-02-26', '2026-03-02')).toBe(4)   // 2026 bukan kabisat
    expect(durasiHari('2025-12-30', '2026-01-02')).toBe(3)
  })

  it('is unaffected by daylight-saving style offsets', () => {
    // Dihitung lewat Date.UTC, jadi tidak ada hari yang hilang atau ganda.
    expect(durasiHari('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('returns null when not yet closed', () => {
    expect(durasiHari('2026-03-01', undefined)).toBeNull()
    expect(durasiHari('2026-03-01', '')).toBeNull()
  })

  it('returns null for a close date before the report date', () => {
    expect(durasiHari('2026-03-10', '2026-03-01')).toBeNull()
  })

  it('returns null for malformed dates', () => {
    expect(durasiHari('bukan tanggal', '2026-03-01')).toBeNull()
  })
})

describe('labelDurasi', () => {
  it('reads naturally in Indonesian', () => {
    expect(labelDurasi({ tgl: '2026-03-01', tgl_selesai: '2026-03-04' })).toBe('3 hari')
    expect(labelDurasi({ tgl: '2026-03-01', tgl_selesai: '2026-03-01' })).toBe('hari yang sama')
  })

  it('is null while still open', () => {
    expect(labelDurasi({ tgl: '2026-03-01', tgl_selesai: undefined })).toBeNull()
  })
})

describe('ringkasKeluhan', () => {
  it('formats the line the owner asked for', () => {
    expect(ringkasKeluhan(
      { kamar: '105', jenis: 'AC', tgl: '2026-03-23', deskripsi: 'AC panas' },
      fmtTgl,
    )).toBe('105 · ❄️ AC · 23 Maret 2026 · AC panas')
  })

  it('drops empty parts instead of leaving stray separators', () => {
    expect(ringkasKeluhan(
      { kamar: '106', jenis: undefined, tgl: '', deskripsi: 'lampu mati' },
      fmtTgl,
    )).toBe('106 · lampu mati')
  })
})
