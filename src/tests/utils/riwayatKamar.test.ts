import { describe, it, expect } from 'vitest'
import {
  kamarPada, kamarDiBulan, awalBulanBerikutnya, catatPindah, koreksiKamar,
} from '../../utils/riwayatKamar'
import type { PunyaKamar } from '../../utils/riwayatKamar'

function orang(over: Partial<PunyaKamar> = {}): PunyaKamar {
  return { kamar: '105', masuk: '2026-01-10', ...over }
}

describe('kamarPada', () => {
  it('memakai penghuni.kamar bila riwayat kosong', () => {
    expect(kamarPada(orang(), '2020-01-01')).toBe('105')
    expect(kamarPada(orang({ riwayat_kamar: [] }), '2030-01-01')).toBe('105')
  })

  it('memilih entri terakhir yang sudah berlaku', () => {
    const p = orang({
      kamar: '201',
      riwayat_kamar: [
        { kamar: '105', sejak: '2026-01-10' },
        { kamar: '201', sejak: '2026-09-01' },
      ],
    })
    expect(kamarPada(p, '2026-08-31')).toBe('105')
    expect(kamarPada(p, '2026-09-01')).toBe('201')
    expect(kamarPada(p, '2027-05-05')).toBe('201')
  })

  it('tanggal sebelum entri pertama memakai kamar awal, bukan kamar sekarang', () => {
    const p = orang({
      kamar: '201',
      riwayat_kamar: [
        { kamar: '105', sejak: '2026-01-10' },
        { kamar: '201', sejak: '2026-09-01' },
      ],
    })
    expect(kamarPada(p, '2025-12-01')).toBe('105')
  })

  it('tahan terhadap riwayat yang tersimpan tidak terurut', () => {
    const p = orang({
      kamar: '201',
      riwayat_kamar: [
        { kamar: '201', sejak: '2026-09-01' },
        { kamar: '105', sejak: '2026-01-10' },
      ],
    })
    expect(kamarPada(p, '2026-08-31')).toBe('105')
  })
})

describe('kamarDiBulan', () => {
  const p = orang({
    kamar: '201',
    riwayat_kamar: [
      { kamar: '105', sejak: '2026-01-10' },
      { kamar: '201', sejak: '2026-09-01' },
    ],
  })

  it('bulan pindah masih ditagih kamar lama, bulan berikutnya kamar baru', () => {
    expect(kamarDiBulan(p, 'Agustus 2026')).toBe('105')
    expect(kamarDiBulan(p, 'September 2026')).toBe('201')
  })

  it('label bulan tak dikenal jatuh ke kamar sekarang', () => {
    expect(kamarDiBulan(p, 'bukan bulan')).toBe('201')
  })
})

describe('awalBulanBerikutnya', () => {
  it('menggeser satu bulan', () => {
    expect(awalBulanBerikutnya('2026-08-15')).toBe('2026-09-01')
    expect(awalBulanBerikutnya('2026-01-31')).toBe('2026-02-01')
  })

  it('menyeberangi tahun', () => {
    expect(awalBulanBerikutnya('2026-12-02')).toBe('2027-01-01')
  })

  it('mengembalikan string kosong untuk input yang bukan tanggal', () => {
    expect(awalBulanBerikutnya('')).toBe('')
  })
})

describe('catatPindah', () => {
  it('menjangkar kamar asal sejak tanggal masuk saat riwayat masih kosong', () => {
    expect(catatPindah(orang(), '201', '2026-09-01')).toEqual([
      { kamar: '105', sejak: '2026-01-10' },
      { kamar: '201', sejak: '2026-09-01' },
    ])
  })

  it('pindah kedua di bulan yang sama menimpa pindahan yang belum berlaku', () => {
    const p = orang({
      kamar: '201',
      riwayat_kamar: [
        { kamar: '105', sejak: '2026-01-10' },
        { kamar: '201', sejak: '2026-09-01' },
      ],
    })
    expect(catatPindah(p, '301', '2026-09-01')).toEqual([
      { kamar: '105', sejak: '2026-01-10' },
      { kamar: '301', sejak: '2026-09-01' },
    ])
  })

  it('batal pindah — kembali ke kamar asal tidak meninggalkan entri', () => {
    const p = orang({
      kamar: '201',
      riwayat_kamar: [
        { kamar: '105', sejak: '2026-01-10' },
        { kamar: '201', sejak: '2026-09-01' },
      ],
    })
    expect(catatPindah(p, '105', '2026-09-01')).toEqual([
      { kamar: '105', sejak: '2026-01-10' },
    ])
  })

  it('pindah ketiga kalinya menumpuk, bukan menghapus yang sudah lewat', () => {
    const p = orang({
      kamar: '201',
      riwayat_kamar: [
        { kamar: '105', sejak: '2026-01-10' },
        { kamar: '201', sejak: '2026-09-01' },
      ],
    })
    expect(catatPindah(p, '301', '2026-11-01')).toEqual([
      { kamar: '105', sejak: '2026-01-10' },
      { kamar: '201', sejak: '2026-09-01' },
      { kamar: '301', sejak: '2026-11-01' },
    ])
  })
})

describe('koreksiKamar', () => {
  it('tidak membuat riwayat untuk penghuni yang belum pernah pindah', () => {
    expect(koreksiKamar(orang(), '106')).toEqual([])
  })

  it('menulis ulang entri terakhir, tanpa menambah pindahan palsu', () => {
    const p = orang({
      kamar: '201',
      riwayat_kamar: [
        { kamar: '105', sejak: '2026-01-10' },
        { kamar: '201', sejak: '2026-09-01' },
      ],
    })
    expect(koreksiKamar(p, '202')).toEqual([
      { kamar: '105', sejak: '2026-01-10' },
      { kamar: '202', sejak: '2026-09-01' },
    ])
  })
})
