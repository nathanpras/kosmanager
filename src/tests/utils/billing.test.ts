import { describe, it, expect } from 'vitest'
import {
  hariDalamBulan, tarifBulanan,
  rentangHuni, hitungBagian, tglDiBulan,
} from '../../utils/billing'

describe('hariDalamBulan', () => {
  it('handles 31-, 30-, and 28-day months', () => {
    expect(hariDalamBulan('Maret 2026')).toBe(31)
    expect(hariDalamBulan('April 2026')).toBe(30)
    expect(hariDalamBulan('Februari 2026')).toBe(28)
  })

  it('handles a leap February', () => {
    expect(hariDalamBulan('Februari 2028')).toBe(29)
  })

  it('returns 0 for unrecognised labels', () => {
    expect(hariDalamBulan('bukan bulan')).toBe(0)
    expect(hariDalamBulan('')).toBe(0)
  })
})

describe('tarifBulanan', () => {
  it('charges only the room price for a single occupant', () => {
    expect(tarifBulanan(1_500_000, 1, 300_000)).toBe(1_500_000)
  })

  it('adds the surcharge once for a second occupant', () => {
    expect(tarifBulanan(1_500_000, 2, 300_000)).toBe(1_800_000)
  })

  it('adds the surcharge per extra occupant', () => {
    expect(tarifBulanan(1_500_000, 3, 300_000)).toBe(2_100_000)
    expect(tarifBulanan(1_500_000, 4, 300_000)).toBe(2_400_000)
  })

  it('never goes below the room price for an empty room', () => {
    expect(tarifBulanan(1_500_000, 0, 300_000)).toBe(1_500_000)
  })
})

function orang(id: string, masuk: string, tgl_keluar?: string) {
  return { id, nama: `Orang ${id}`, masuk, tgl_keluar }
}

const KAMAR = { bulan: 'Maret 2026', harga: 1_500_000, nominalTambahan: 300_000 }

describe('rentangHuni', () => {
  it('memotong rentang ke dalam bulan yang diminta', () => {
    expect(rentangHuni(orang('a', '2026-01-01'), 'Maret 2026'))
      .toEqual({ dari: 1, sampai: 31, hari: 31 })
    expect(rentangHuni(orang('a', '2026-03-15'), 'Maret 2026'))
      .toEqual({ dari: 15, sampai: 31, hari: 17 })
    expect(rentangHuni(orang('a', '2026-01-01', '2026-03-10'), 'Maret 2026'))
      .toEqual({ dari: 1, sampai: 10, hari: 10 })
    expect(rentangHuni(orang('a', '2026-03-05', '2026-03-20'), 'Maret 2026'))
      .toEqual({ dari: 5, sampai: 20, hari: 16 })
  })

  it('mengembalikan null bila tidak beririsan dengan bulan itu', () => {
    expect(rentangHuni(orang('a', '2026-05-01'), 'Maret 2026')).toBeNull()
    expect(rentangHuni(orang('a', '2026-01-01', '2026-02-28'), 'Maret 2026')).toBeNull()
    expect(rentangHuni(orang('a', '2026-01-01'), 'bukan bulan')).toBeNull()
  })
})

describe('hitungBagian', () => {
  it('menagih satu penghuni sebulan penuh sebesar harga kamar', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01')] })
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ penghuni_id: 'a', hari: 31, jumlah: 1_500_000, peran: 'penanggung' })
  })

  it('membebankan tambahan ke penghuni kedua, bukan ke penanggung', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01'), orang('b', '2026-02-01')] })
    expect(b.map(x => x.jumlah)).toEqual([1_500_000, 300_000])
    expect(b.map(x => x.peran)).toEqual(['penanggung', 'tambahan'])
  })

  it('menjumlah persis sama dengan tarifBulanan saat semua penuh', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01'), orang('b', '2026-01-01'), orang('c', '2026-01-01')] })
    expect(b.reduce((s, x) => s + x.jumlah, 0)).toBe(tarifBulanan(1_500_000, 3, 300_000))
  })

  it('memprorata penghuni yang masuk tengah bulan', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-03-15')] })
    expect(b[0]).toMatchObject({ hari: 17, jumlah: 822_581 })
  })

  it('memprorata penghuni yang keluar tengah bulan', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01', '2026-03-10')] })
    expect(b[0]).toMatchObject({ hari: 10, jumlah: 483_871 })
  })

  it('memprorata tambahan untuk penghuni kedua yang masuk tengah bulan', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01'), orang('b', '2026-03-15')] })
    expect(b.map(x => x.jumlah)).toEqual([1_500_000, 164_516])
  })

  it('memberi tiap orang bagiannya sendiri saat ada pergantian di bulan yang sama', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01', '2026-03-10'), orang('b', '2026-03-15')] })
    expect(b.map(x => x.penghuni_id)).toEqual(['a', 'b'])
    expect(b.map(x => x.jumlah)).toEqual([483_871, 822_581])
    expect(b.map(x => x.peran)).toEqual(['penanggung', 'penanggung'])
  })

  it('menghitung Februari kabisat dan non-kabisat', () => {
    const nonKabisat = hitungBagian({ ...KAMAR, bulan: 'Februari 2026', penghuni: [orang('a', '2026-02-15')] })
    expect(nonKabisat[0]).toMatchObject({ hari: 14, jumlah: 750_000 })
    const kabisat = hitungBagian({ ...KAMAR, bulan: 'Februari 2028', penghuni: [orang('a', '2028-02-15')] })
    expect(kabisat[0]).toMatchObject({ hari: 15, jumlah: 775_862 })
  })

  it('membuang penghuni yang tidak punya hari di bulan itu', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01'), orang('b', '2026-09-01')] })
    expect(b.map(x => x.penghuni_id)).toEqual(['a'])
  })

  it('mengembalikan array kosong untuk kamar tanpa penghuni', () => {
    expect(hitungBagian({ ...KAMAR, penghuni: [] })).toEqual([])
  })
})

describe('tglDiBulan', () => {
  it('merakit tanggal ISO dari label bulan', () => {
    expect(tglDiBulan('Maret 2026', 1)).toBe('2026-03-01')
    expect(tglDiBulan('Desember 2026', 25)).toBe('2026-12-25')
  })
})
