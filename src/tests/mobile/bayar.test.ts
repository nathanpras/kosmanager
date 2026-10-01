import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import MobileShell from '../../components/mobile/MobileShell.vue'
import MobKamarDetailView from '../../views/mobile/MobKamarDetailView.vue'
import { useKamarStore } from '../../stores/kamar'
import { usePenghuniStore } from '../../stores/penghuni'
import { useTagihanStore } from '../../stores/tagihan'
import { usePropertiesStore } from '../../stores/properties'
import { useLogStore } from '../../stores/log'
import type { Kamar, Penghuni, Property, Tagihan } from '../../types'

/**
 * Tahap 4 port: aksi uang pertama yang benar-benar menulis.
 *
 * Yang diuji di sini bukan rupanya, melainkan bahwa tulisannya lewat jalur
 * yang sama dengan desktop dan tidak menulis apa pun saat masukannya tak sah.
 */

const BULAN = 'September 2026'
const Kosong = { template: '<div />' }

let updateDipanggil: Array<[string, Partial<Tagihan>]>
let logDipanggil: number

function isiData() {
  usePropertiesStore().items = [
    { id: 'p1', nama: 'Citra 1', alamat: '', no_hp: '', created_at: '2026-01-01' },
  ] as Property[]
  usePropertiesStore().kategori = []

  useKamarStore().items = [
    { id: 'k1', nomor: '101', tipe: '', harga: 1_800_000, status: 'terisi', property_id: 'p1' },
  ] as Kamar[]

  usePenghuniStore().items = [
    { id: 'h1', nama: 'Hizkia Nogie', kamar: '101', hp: '0812', masuk: '2026-01-01', property_id: 'p1' },
  ] as Penghuni[]

  useTagihanStore().items = [
    { id: 't1', penghuni: 'Hizkia Nogie', penghuni_id: 'h1', kamar: '101', bulan: BULAN,
      jumlah: 1_800_000, status: 'belum', jatuh_tempo: '2026-09-25',
      property_id: 'p1', createdAt: '2026-09-01' },
  ] as Tagihan[]

  /* Store asli menulis ke Firestore; di sini penulisannya dicegat. */
  updateDipanggil = []
  logDipanggil = 0
  useTagihanStore().update = (async (id: string, patch: Partial<Tagihan>) => {
    updateDipanggil.push([id, patch])
  }) as never
  useLogStore().add = (async () => { logDipanggil++ }) as never
}

function buatRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{
      path: '/m',
      component: MobileShell,
      children: [
        { path: '', name: 'm-properti', component: Kosong },
        { path: 'prop/:id/kamar/:nomor', name: 'm-kamar', component: MobKamarDetailView },
      ],
    }],
  })
}

let router: Router

beforeEach(() => {
  setActivePinia(createPinia())
  isiData()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-20T08:00:00'))
  router = buatRouter()
})
afterEach(() => vi.useRealTimers())

async function bukaKamar() {
  await router.push('/m/prop/p1/kamar/101')
  await router.isReady()
  const w = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

async function bukaSheet() {
  const w = await bukaKamar()
  await w.findAll('.bill button').find(b => b.text().includes('Catat pembayaran'))!.trigger('click')
  return w
}

describe('catat pembayaran dari shell mobile', () => {
  it('tombolnya hanya muncul untuk tagihan yang belum lunas', async () => {
    const w = await bukaKamar()
    expect(w.findAll('.bill button').length).toBe(1)

    useTagihanStore().items[0].status = 'lunas'
    useTagihanStore().items[0].jumlah_bayar = 1_800_000
    const w2 = await bukaKamar()
    expect(w2.findAll('.bill button').length).toBe(0)
  })

  it('sheet terisi penuh sebesar sisa tagihan', async () => {
    const w = await bukaSheet()
    const isian = w.find('.sheet .field-in')
    expect((isian.element as HTMLInputElement).value).toContain('1.800.000')
  })

  it('menyimpan menulis jumlah, tanggal, dan status lunas', async () => {
    const w = await bukaSheet()
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(updateDipanggil).toHaveLength(1)
    const [id, patch] = updateDipanggil[0]
    expect(id).toBe('t1')
    expect(patch).toMatchObject({ jumlah_bayar: 1_800_000, status: 'lunas', tgl: '2026-09-20' })
  })

  it('pembayaran sebagian ditulis sebagai kurang, bukan lunas', async () => {
    const w = await bukaSheet()
    await w.find('.sheet .field-in').setValue('500000')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(updateDipanggil[0][1]).toMatchObject({ jumlah_bayar: 500_000, status: 'kurang' })
  })

  it('pintasan Setengah mengisi separuh sisa', async () => {
    const w = await bukaSheet()
    await w.findAll('.sheet .fchip').find(b => b.text() === 'Setengah')!.trigger('click')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(updateDipanggil[0][1].jumlah_bayar).toBe(900_000)
  })

  it('jumlah nol ditahan dan tidak menulis apa pun', async () => {
    const w = await bukaSheet()
    await w.findAll('.sheet .fchip').find(b => b.text() === 'Kosongkan')!.trigger('click')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(updateDipanggil).toHaveLength(0)
    expect(w.find('.sheet .note.bad').exists()).toBe(true)
    /* Sheet tetap terbuka supaya yang salah bisa dibetulkan di tempat. */
    expect(w.find('.sheet').exists()).toBe(true)
  })

  it('mencatat ke log, sama seperti desktop', async () => {
    const w = await bukaSheet()
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()
    expect(logDipanggil).toBe(1)
  })

  it('Batal menutup tanpa menulis', async () => {
    const w = await bukaSheet()
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Batal')!.trigger('click')
    await flushPromises()
    expect(updateDipanggil).toHaveLength(0)
    expect(w.find('.sheet').exists()).toBe(false)
  })

  it('mengetuk latar gelap juga menutup', async () => {
    const w = await bukaSheet()
    await w.find('.scrim').trigger('click')
    await flushPromises()
    expect(w.find('.sheet').exists()).toBe(false)
    expect(updateDipanggil).toHaveLength(0)
  })
})
