import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLaporan } from '../../composables/useLaporan'
import { useTagihanStore } from '../../stores/tagihan'
import { usePengeluaranStore } from '../../stores/pengeluaran'
import { useKamarStore } from '../../stores/kamar'
import { usePenghuniStore } from '../../stores/penghuni'
import type { Kamar, Penghuni, Tagihan } from '../../types'

/**
 * Diangkat dari LaporanView supaya shell mobile memakai angka yang sama.
 * Lingkup properti dikirim sebagai argumen, bukan dibaca dari store app.
 */

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-20T08:00:00'))
})
afterEach(() => vi.useRealTimers())

const tagih = (o: Partial<Tagihan> & { id: string }): Tagihan => ({
  penghuni: 'Ani', kamar: '101', bulan: 'September 2026', jumlah: 1_000_000,
  status: 'belum', property_id: 'p1', createdAt: '2026-09-01', ...o,
})

describe('useLaporan', () => {
  it('pemasukan menghitung uang yang diterima, bukan yang ditagih', () => {
    useTagihanStore().items = [
      tagih({ id: 'a', status: 'lunas', jumlah_bayar: 1_000_000 }),
      tagih({ id: 'b' }),                                   // belum dibayar
      tagih({ id: 'c', jumlah_bayar: 400_000 }),            // sebagian
    ]
    const nilai = useLaporan().pemasukanPerBulan()
    /* September ada di posisi terakhir dari enam bulan terakhir. */
    expect(nilai.at(-1)).toBe(1_400_000)
  })

  it('tagihan lama berstatus lunas tanpa jumlah_bayar tetap terhitung', () => {
    useTagihanStore().items = [tagih({ id: 'a', status: 'lunas' })]
    expect(useLaporan().pemasukanPerBulan().at(-1)).toBe(1_000_000)
  })

  it('lingkup properti menyaring, dan "all" tidak', () => {
    useTagihanStore().items = [
      tagih({ id: 'a', status: 'lunas', jumlah_bayar: 1_000_000, property_id: 'p1' }),
      tagih({ id: 'b', status: 'lunas', jumlah_bayar: 500_000, property_id: 'p2' }),
    ]
    const { pemasukanPerBulan } = useLaporan()
    expect(pemasukanPerBulan('p1').at(-1)).toBe(1_000_000)
    expect(pemasukanPerBulan('all').at(-1)).toBe(1_500_000)
    expect(pemasukanPerBulan().at(-1)).toBe(1_500_000)
  })

  it('pengeluaran dijumlahkan per kategori', () => {
    usePengeluaranStore().items = [
      { id: '1', deskripsi: 'a', jumlah: 100_000, kategori: 'Listrik', tgl: '2026-09-01', property_id: 'p1' },
      { id: '2', deskripsi: 'b', jumlah: 50_000, kategori: 'Listrik', tgl: '2026-09-02', property_id: 'p1' },
      { id: '3', deskripsi: 'c', jumlah: 70_000, kategori: 'Air', tgl: '2026-09-03', property_id: 'p1' },
    ]
    const { labels, values } = useLaporan().pengeluaranPerKategori()
    expect(labels).toEqual(['Listrik', 'Air'])
    expect(values).toEqual([150_000, 70_000])
  })

  describe('hunian', () => {
    beforeEach(() => {
      useKamarStore().items = [
        { id: 'k1', nomor: '101', tipe: '', harga: 0, status: 'terisi', property_id: 'p1' },
        { id: 'k2', nomor: '102', tipe: '', harga: 0, status: 'kosong', property_id: 'p1' },
      ] as Kamar[]
    })

    it('penghuni yang sudah keluar tidak terhitung selamanya', () => {
      /* Alur arsip hanya menulis tgl_keluar; membaca kontrak_selesai saja
         membuat grafiknya merangkak lewat 100%. */
      usePenghuniStore().items = [
        { id: 'h1', nama: 'A', kamar: '101', hp: '', masuk: '2026-01-01',
          tgl_keluar: '2026-05-31', property_id: 'p1' },
      ] as Penghuni[]
      expect(useLaporan().hunianPerBulan().at(-1)).toBe(0)
    })

    it('tidak pernah melewati seratus persen pada data yang wajar', () => {
      usePenghuniStore().items = [
        { id: 'h1', nama: 'A', kamar: '101', hp: '', masuk: '2026-01-01', property_id: 'p1' },
        { id: 'h2', nama: 'B', kamar: '102', hp: '', masuk: '2026-01-01', property_id: 'p1' },
      ] as Penghuni[]
      expect(useLaporan().hunianPerBulan().every(v => v <= 100)).toBe(true)
      expect(useLaporan().hunianPerBulan().at(-1)).toBe(100)
    })

    it('tanpa kamar sama sekali tidak membagi dengan nol', () => {
      useKamarStore().items = []
      usePenghuniStore().items = []
      expect(useLaporan().hunianPerBulan().every(Number.isFinite)).toBe(true)
    })
  })
})
