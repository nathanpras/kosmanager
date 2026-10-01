import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePindahKamar, GagalPindah } from '../../composables/usePindahKamar'
import { useKamarStore } from '../../stores/kamar'
import { usePenghuniStore } from '../../stores/penghuni'
import { useLogStore } from '../../stores/log'
import { kamarDiBulan } from '../../utils/riwayatKamar'
import type { Kamar, Penghuni } from '../../types'

/**
 * Aturan pindah kamar yang dipilih pemilik 23 Agustus 2026: tidak ada prorata.
 * Bulan berjalan tetap ditagih kamar lama penuh; kamar baru mulai ditagih
 * tanggal 1 bulan berikutnya.
 *
 * Diangkat dari PenghuniView ke composable supaya shell mobile memakai aturan
 * yang sama. Uji ini mengunci agar pengangkatan itu tidak mengubah apa pun.
 */

let tulisPenghuni: Array<[string, Partial<Penghuni>]>
let tulisKamar: Array<[string, Partial<Kamar>]>

const kamar = (over: Partial<Kamar> & { id: string; nomor: string }): Kamar => ({
  tipe: '', harga: 1_500_000, status: 'terisi', property_id: 'p1', ...over,
})

const huni = (over: Partial<Penghuni> & { id: string }): Penghuni => ({
  nama: `Orang ${over.id}`, kamar: '101', hp: '0812', masuk: '2026-01-01',
  property_id: 'p1', ...over,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-20T08:00:00'))

  useKamarStore().items = [
    kamar({ id: 'k1', nomor: '101' }),
    kamar({ id: 'k2', nomor: '203', status: 'kosong', harga: 0 }),
    kamar({ id: 'k3', nomor: '101', property_id: 'p2', status: 'kosong' }),
  ]
  usePenghuniStore().items = [huni({ id: 'h1', nama: 'Henri' })]

  tulisPenghuni = []
  tulisKamar = []
  usePenghuniStore().update = (async (id: string, patch: Partial<Penghuni>) => {
    tulisPenghuni.push([id, patch])
    Object.assign(usePenghuniStore().items.find(p => p.id === id)!, patch)
  }) as never
  useKamarStore().update = (async (id: string, patch: Partial<Kamar>) => {
    tulisKamar.push([id, patch])
    Object.assign(useKamarStore().items.find(k => k.id === id)!, patch)
  }) as never
  useLogStore().add = (async () => {}) as never
})
afterEach(() => vi.useRealTimers())

const orang = () => usePenghuniStore().items[0]

describe('usePindahKamar', () => {
  it('tagihan kamar baru berlaku tanggal 1 bulan berikutnya, bukan hari pindah', async () => {
    const efektif = await usePindahKamar().pindahkan(orang(), '203', '2026-09-20')
    expect(efektif).toBe('2026-10-01')
  })

  it('bulan berjalan tetap menunjuk kamar lama', async () => {
    await usePindahKamar().pindahkan(orang(), '203', '2026-09-20')
    /* Inilah inti aturannya: yang menentukan penagihan adalah riwayat_kamar. */
    expect(kamarDiBulan(orang(), 'September 2026')).toBe('101')
    expect(kamarDiBulan(orang(), 'Oktober 2026')).toBe('203')
  })

  it('field kamar langsung menunjuk kamar baru, supaya daftar mencerminkan tempat tidurnya', async () => {
    await usePindahKamar().pindahkan(orang(), '203', '2026-09-20')
    expect(orang().kamar).toBe('203')
  })

  it('kamar lama dikosongkan dan kamar baru ditandai terisi', async () => {
    await usePindahKamar().pindahkan(orang(), '203', '2026-09-20')
    expect(tulisKamar).toContainEqual(['k1', { status: 'kosong' }])
    expect(tulisKamar).toContainEqual(['k2', { status: 'terisi' }])
  })

  it('kamar lama TIDAK dikosongkan bila masih ada roommate', async () => {
    usePenghuniStore().items.push(huni({ id: 'h2', nama: 'Teman', kamar: '101' }))
    await usePindahKamar().pindahkan(orang(), '203', '2026-09-20')
    expect(tulisKamar.map(([id]) => id)).not.toContain('k1')
    expect(tulisKamar).toContainEqual(['k2', { status: 'terisi' }])
  })

  it('menolak pindah ke kamar yang sama', async () => {
    await expect(usePindahKamar().pindahkan(orang(), '101', '2026-09-20'))
      .rejects.toBeInstanceOf(GagalPindah)
    expect(tulisPenghuni).toHaveLength(0)
  })

  it('menolak tanpa kamar tujuan, tanpa menulis apa pun', async () => {
    await expect(usePindahKamar().pindahkan(orang(), '', '2026-09-20'))
      .rejects.toBeInstanceOf(GagalPindah)
    expect(tulisPenghuni).toHaveLength(0)
    expect(tulisKamar).toHaveLength(0)
  })

  it('pindah di akhir Desember berlaku Januari tahun berikutnya', async () => {
    const efektif = await usePindahKamar().pindahkan(orang(), '203', '2026-12-31')
    expect(efektif).toBe('2027-01-01')
  })

  describe('daftar kamar tujuan', () => {
    it('hanya kamar kosong di properti yang sama', async () => {
      const { kamarTujuan } = usePindahKamar()
      const tujuan = kamarTujuan(orang())
      /* 101 di properti lain kosong, tapi beda properti — tidak boleh ikut. */
      expect(tujuan.map(k => k.id)).toEqual(['k2'])
    })

    it('kamar yang sedang ditempati tidak ikut walau statusnya aneh', async () => {
      useKamarStore().items[0].status = 'kosong'
      const tujuan = usePindahKamar().kamarTujuan(orang())
      expect(tujuan.map(k => k.nomor)).not.toContain('101')
    })
  })
})
