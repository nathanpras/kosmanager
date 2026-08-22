import { describe, it, expect } from 'vitest'
import { reconcileTagihanKamar } from '../../composables/useKeluarPenghuni'
import type { DraftTagihan } from '../../composables/useTagihanCalc'
import type { Tagihan } from '../../types'

function tag(over: Partial<Tagihan> & { id: string }): Tagihan {
  return {
    penghuni: 'Andi', kamar: '101', bulan: 'Maret 2026', jumlah: 1_800_000,
    status: 'belum', property_id: 'p1', createdAt: '2026-03-01T00:00:00.000Z',
    ...over,
  }
}

function draft(over: Partial<DraftTagihan> & { penghuni: string; penghuni_id: string }): DraftTagihan {
  return {
    kamar: '101', bulan: 'Maret 2026', jumlah: 1_500_000, jatuh_tempo: '2026-03-01',
    hari: 31, dari: '2026-03-01', sampai: '2026-03-31',
    ...over,
  }
}

// Kasus utama: kamar 101 dihuni Andi (penanggung, masuk lebih dulu) dan Budi.
// Selama tidak ada yang keluar, kamar ini cuma punya SATU tagihan gabungan atas
// nama Andi — Budi tidak punya tagihan atas namanya sendiri.
describe('reconcileTagihanKamar', () => {
  it('menulis ulang tagihan gabungan yang belum dibayar ke draft penanggung', () => {
    const r = reconcileTagihanKamar({
      existing: [tag({ id: 't1', penghuni: 'Andi', penghuni_id: 'a', jumlah: 1_800_000 })],
      draft: [draft({ penghuni: 'Andi', penghuni_id: 'a', jumlah: 1_500_000 })],
      setelahKeluar: false,
    })
    expect(r.hapus).toEqual([])
    expect(r.buat).toEqual([])
    expect(r.perbarui).toHaveLength(1)
    expect(r.perbarui[0]).toMatchObject({ id: 't1' })
    expect(r.perbarui[0].data).toMatchObject({
      penghuni: 'Andi', penghuni_id: 'a', jumlah: 1_500_000, hari: 31,
      dari: '2026-03-01', sampai: '2026-03-31',
    })
  })

  it('membuatkan tagihan prorata untuk roommate yang keluar walau ia belum punya tagihan', () => {
    const budi = draft({
      penghuni: 'Budi', penghuni_id: 'b', jumlah: 96_774,
      hari: 10, dari: '2026-03-01', sampai: '2026-03-10',
      is_prorated: true, prorated_hari: 10,
    })
    const r = reconcileTagihanKamar({
      existing: [tag({ id: 't1', penghuni: 'Andi', penghuni_id: 'a', jumlah: 1_800_000 })],
      draft: [draft({ penghuni: 'Andi', penghuni_id: 'a', jumlah: 1_500_000 }), budi],
      setelahKeluar: false,
    })
    expect(r.perbarui.map(u => u.id)).toEqual(['t1'])
    expect(r.buat).toEqual([budi])
  })

  it('menghapus tagihan tanpa uang yang tidak punya draft lagi', () => {
    const r = reconcileTagihanKamar({
      existing: [tag({ id: 't1', penghuni: 'Budi', penghuni_id: 'b', status: 'belum' })],
      draft: [draft({ penghuni: 'Andi', penghuni_id: 'a' })],
      setelahKeluar: true,
    })
    expect(r.hapus).toEqual(['t1'])
    expect(r.perbarui).toEqual([])
    expect(r.buat.map(d => d.penghuni_id)).toEqual(['a'])
  })

  it('tidak menurunkan nominal tagihan yang sudah dibayar, hanya mencatat kelebihan', () => {
    const r = reconcileTagihanKamar({
      existing: [tag({
        id: 't1', penghuni: 'Andi', penghuni_id: 'a',
        jumlah: 1_800_000, jumlah_bayar: 1_800_000, status: 'lunas',
      })],
      draft: [draft({ penghuni: 'Andi', penghuni_id: 'a', jumlah: 1_500_000 })],
      setelahKeluar: false,
    })
    expect(r.hapus).toEqual([])
    expect(r.perbarui).toEqual([{ id: 't1', data: { kelebihan: 300_000 } }])
  })

  it('memperlakukan tagihan kurang bayar sebagai tagihan berisi uang', () => {
    const r = reconcileTagihanKamar({
      existing: [tag({
        id: 't1', penghuni: 'Budi', penghuni_id: 'b',
        jumlah: 1_800_000, jumlah_bayar: 500_000, status: 'kurang',
      })],
      draft: [],
      setelahKeluar: true,
    })
    expect(r.hapus).toEqual([])
    expect(r.perbarui).toEqual([{ id: 't1', data: { hangus: true } }])
  })

  it('menandai hangus bulan setelah keluar yang sudah dibayar di muka', () => {
    const r = reconcileTagihanKamar({
      existing: [tag({
        id: 't1', bulan: 'April 2026', penghuni: 'Budi', penghuni_id: 'b',
        jumlah: 1_500_000, jumlah_bayar: 1_500_000, status: 'lunas',
      })],
      draft: [],
      setelahKeluar: true,
    })
    expect(r.perbarui).toEqual([{ id: 't1', data: { hangus: true } }])
  })

  it('tidak menandai hangus di bulan keluar itu sendiri', () => {
    const r = reconcileTagihanKamar({
      existing: [tag({ id: 't1', penghuni: 'Budi', jumlah_bayar: 900_000, status: 'kurang' })],
      draft: [],
      setelahKeluar: false,
    })
    expect(r).toEqual({ perbarui: [], hapus: [], buat: [] })
  })

  it('mencocokkan tagihan lama tanpa penghuni_id lewat namanya', () => {
    const r = reconcileTagihanKamar({
      // Dokumen lama: tidak punya penghuni_id sama sekali.
      existing: [tag({ id: 't1', penghuni: 'Andi', jumlah: 1_800_000 })],
      draft: [draft({ penghuni: 'Andi', penghuni_id: 'a', jumlah: 1_500_000 })],
      setelahKeluar: false,
    })
    expect(r.hapus).toEqual([])
    expect(r.buat).toEqual([])
    expect(r.perbarui[0].data).toMatchObject({ penghuni_id: 'a', jumlah: 1_500_000 })
  })

  it('memasangkan tiap tagihan dengan draft yang berbeda', () => {
    const r = reconcileTagihanKamar({
      existing: [
        tag({ id: 't1', penghuni: 'Andi', penghuni_id: 'a', jumlah: 1_500_000 }),
        tag({ id: 't2', penghuni: 'Budi', penghuni_id: 'b', jumlah: 300_000 }),
      ],
      draft: [
        draft({ penghuni: 'Andi', penghuni_id: 'a', jumlah: 1_483_871 }),
        draft({ penghuni: 'Budi', penghuni_id: 'b', jumlah: 96_774 }),
      ],
      setelahKeluar: false,
    })
    expect(r.hapus).toEqual([])
    expect(r.buat).toEqual([])
    expect(r.perbarui.map(u => [u.id, u.data.jumlah]))
      .toEqual([['t1', 1_483_871], ['t2', 96_774]])
  })
})
