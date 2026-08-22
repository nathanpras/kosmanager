import { describe, it, expect } from 'vitest'
import { bulanBerurutan, bagiDiskon } from '../../utils/bayarDiMuka'

describe('bulanBerurutan', () => {
  it('membuat deret bulan dan menyeberang tahun', () => {
    expect(bulanBerurutan('Agustus 2026', 6)).toEqual([
      'Agustus 2026', 'September 2026', 'Oktober 2026',
      'November 2026', 'Desember 2026', 'Januari 2027',
    ])
  })

  it('mengembalikan array kosong untuk label yang tidak dikenal', () => {
    expect(bulanBerurutan('bukan bulan', 3)).toEqual([])
  })
})

describe('bagiDiskon', () => {
  it('membagi diskon rata dan membuang sisa pembulatan ke bulan terakhir', () => {
    const hasil = bagiDiskon(Array(6).fill(2_000_000), 1_000_000)
    expect(hasil).toEqual([1_833_333, 1_833_333, 1_833_333, 1_833_333, 1_833_333, 1_833_335])
    expect(hasil.reduce((s, x) => s + x, 0)).toBe(11_000_000)
  })

  it('menjaga total persis sama dengan uang yang diterima untuk pembagian apa pun', () => {
    for (const diskon of [0, 1, 333_333, 750_000, 1_000_000]) {
      const total = 6 * 2_000_000 - diskon
      expect(bagiDiskon(Array(6).fill(2_000_000), diskon).reduce((s, x) => s + x, 0)).toBe(total)
    }
  })

  it('tetap benar saat nominal bulanan tidak sama (bulan pertama prorata)', () => {
    const hasil = bagiDiskon([822_581, 1_500_000, 1_500_000], 300_000)
    expect(hasil.reduce((s, x) => s + x, 0)).toBe(822_581 + 3_000_000 - 300_000)
  })

  it('mengembalikan nominal apa adanya tanpa diskon', () => {
    expect(bagiDiskon([1_000_000, 2_000_000], 0)).toEqual([1_000_000, 2_000_000])
  })
})
