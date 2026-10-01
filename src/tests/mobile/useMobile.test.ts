import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMobile, inisial } from '../../composables/useMobile'
import { useKamarStore } from '../../stores/kamar'
import { usePenghuniStore } from '../../stores/penghuni'
import { useTagihanStore } from '../../stores/tagihan'
import { usePropertiesStore } from '../../stores/properties'
import type { Kamar, Penghuni, Tagihan } from '../../types'

const kamar = (over: Partial<Kamar> & { id: string; nomor: string }): Kamar => ({
  tipe: '', harga: 1_500_000, status: 'terisi', property_id: 'p1', ...over,
})

const huni = (over: Partial<Penghuni> & { id: string }): Penghuni => ({
  nama: `Orang ${over.id}`, kamar: '101', hp: '0812', masuk: '2026-01-01',
  property_id: 'p1', ...over,
})

const tagih = (over: Partial<Tagihan> & { id: string }): Tagihan => ({
  penghuni: 'Ani', kamar: '101', bulan: 'September 2026', jumlah: 1_500_000,
  status: 'belum', property_id: 'p1', createdAt: '2026-09-01', ...over,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-20T08:00:00'))
})
afterEach(() => vi.useRealTimers())

describe('useMobile', () => {
  it('mengurutkan kamar seperti sisa aplikasi: numerik, bukan leksikografis', () => {
    useKamarStore().items = [
      kamar({ id: 'c', nomor: '10' }),
      kamar({ id: 'a', nomor: '2' }),
      kamar({ id: 'b', nomor: '9' }),
    ]
    usePropertiesStore().kategori = []
    expect(useMobile().kamarDi('p1').map(k => k.nomor)).toEqual(['2', '9', '10'])
  })

  it('memisahkan kamar bernomor sama di properti berbeda', () => {
    /* Kamar 101 ada di kedua properti — sumber ambiguitas yang sudah lama
       dicatat di proyek ini. */
    useKamarStore().items = [
      kamar({ id: 'a', nomor: '101', property_id: 'p1' }),
      kamar({ id: 'b', nomor: '101', property_id: 'p2' }),
    ]
    usePropertiesStore().kategori = []
    const { kamarDi, kamarSatu } = useMobile()
    expect(kamarDi('p1')).toHaveLength(1)
    expect(kamarSatu('p2', '101')?.id).toBe('b')
  })

  it('menyebut penghuni kedua sebagai tambahan, bukan menyembunyikannya', () => {
    useKamarStore().items = [kamar({ id: 'k', nomor: '101' })]
    usePenghuniStore().items = [
      huni({ id: 'a', nama: 'Ani', masuk: '2026-01-01' }),
      huni({ id: 'b', nama: 'Budi', masuk: '2026-02-01' }),
    ]
    expect(useMobile().namaPenghuni(useKamarStore().items[0])).toBe('Ani +1')
  })

  it('kamar tanpa penghuni tidak menampilkan nama', () => {
    useKamarStore().items = [kamar({ id: 'k', nomor: '102', status: 'kosong' })]
    expect(useMobile().namaPenghuni(useKamarStore().items[0])).toBe('')
  })

  it('tagihan kamar disaring per properti, bukan hanya per nomor', () => {
    useKamarStore().items = [kamar({ id: 'k', nomor: '101', property_id: 'p1' })]
    useTagihanStore().items = [
      tagih({ id: 'a', property_id: 'p1' }),
      tagih({ id: 'b', property_id: 'p2' }),
    ]
    expect(useMobile().tagihanKamar(useKamarStore().items[0]).map(t => t.id)).toEqual(['a'])
  })

  describe('hitungan', () => {
    beforeEach(() => {
      usePropertiesStore().kategori = []
      useKamarStore().items = [
        kamar({ id: '1', nomor: '101' }),                      // lunas
        kamar({ id: '2', nomor: '102' }),                      // telat
        kamar({ id: '3', nomor: '103' }),                      // belum
        kamar({ id: '4', nomor: '104', status: 'kosong' }),
        kamar({ id: '5', nomor: '105', status: 'booked' }),
      ]
      useTagihanStore().items = [
        tagih({ id: 'a', kamar: '101', status: 'lunas', jumlah_bayar: 1_500_000 }),
        tagih({ id: 'b', kamar: '102', jatuh_tempo: '2026-09-01' }),
        tagih({ id: 'c', kamar: '103', jatuh_tempo: '2026-09-30' }),
      ]
    })

    it('menghitung tiap status sekali, dan terisi tidak mencakup kosong/booked', () => {
      const h = useMobile().hitungan('p1')
      /* 101 lunas, 102 telat, 103 belum — jadi terisi 3, belum 1. */
      expect(h).toMatchObject({ total: 5, terisi: 3, kosong: 1, booked: 1, telat: 1, belum: 1 })
    })

    it('tiap kamar dihitung tepat sekali', () => {
      /* terisi juga mencakup yang sudah lunas — tidak ada chip "Lunas" di
         beranda, jadi lunas tidak punya hitungannya sendiri. */
      const h = useMobile().hitungan('p1')
      expect(h.terisi + h.kosong + h.booked).toBe(h.total)
      expect(h.telat + h.belum).toBeLessThanOrEqual(h.terisi)
    })

    it('check-in dan check-out dihitung per orang, bukan per kamar', () => {
      /* Dua orang bisa masuk ke kamar yang sama di hari yang sama. */
      usePenghuniStore().items = [
        huni({ id: 'a', masuk: '2026-09-20' }),
        huni({ id: 'b', masuk: '2026-09-20' }),
        huni({ id: 'c', masuk: '2026-01-01', tgl_keluar: '2026-09-20' }),
      ]
      const h = useMobile().hitungan('p1')
      expect(h.checkin).toBe(2)
      expect(h.checkout).toBe(1)
    })

    it('tanpa property_id menghitung seluruh properti', () => {
      useKamarStore().items.push(kamar({ id: '6', nomor: 'A1', property_id: 'p2' }))
      expect(useMobile().hitungan().total).toBe(6)
      expect(useMobile().hitungan('p1').total).toBe(5)
    })
  })
})

describe('inisial', () => {
  it('mengambil maksimal dua huruf', () => {
    expect(inisial('Hizkia Nogie Pratama')).toBe('HN')
    expect(inisial('Lisia')).toBe('L')
  })

  it('tahan terhadap spasi berlebih dan nama kosong', () => {
    expect(inisial('  Clara   Wijaya ')).toBe('CW')
    expect(inisial('')).toBe('')
  })
})
