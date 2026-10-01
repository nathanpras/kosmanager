import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import MobileShell from '../../components/mobile/MobileShell.vue'
import MobRiwayatView from '../../views/mobile/MobRiwayatView.vue'
import MobNotifView from '../../views/mobile/MobNotifView.vue'
import MobCariView from '../../views/mobile/MobCariView.vue'
import { useKamarStore } from '../../stores/kamar'
import { usePenghuniStore } from '../../stores/penghuni'
import { useTagihanStore } from '../../stores/tagihan'
import { useMaintenanceStore } from '../../stores/maintenance'
import { usePropertiesStore } from '../../stores/properties'
import type { Kamar, Maintenance, Penghuni, Property, Tagihan } from '../../types'

const Kosong = { template: '<div />' }
let router: Router

beforeEach(() => {
  setActivePinia(createPinia())
  usePropertiesStore().items = [
    { id: 'p1', nama: 'Citra 1', alamat: 'Kalideres', no_hp: '', created_at: '2026-01-01' },
  ] as Property[]
  usePropertiesStore().kategori = []
  useKamarStore().items = [
    { id: 'k1', nomor: '101', tipe: '', harga: 1_800_000, status: 'terisi', property_id: 'p1' },
    { id: 'k2', nomor: '203', tipe: '', harga: 1_700_000, status: 'kosong', property_id: 'p1' },
  ] as Kamar[]
  usePenghuniStore().items = [
    { id: 'h1', nama: 'Hizkia Nogie', kamar: '101', hp: '0812', masuk: '2026-01-01', property_id: 'p1' },
    /* Keluar dari 101 */
    { id: 'x1', nama: 'Andreas Siregar', kamar: '101', hp: '0857', masuk: '2025-03-01',
      tgl_keluar: '2026-08-25', property_id: 'p1' },
    /* Pernah pindah 101 → 203, lalu keluar dari 203 */
    { id: 'x2', nama: 'Fajar Nugraha', kamar: '203', hp: '0858', masuk: '2025-01-12',
      tgl_keluar: '2026-07-31', property_id: 'p1',
      riwayat_kamar: [{ kamar: '101', sejak: '2025-01-12' }, { kamar: '203', sejak: '2026-03-01' }] },
  ] as Penghuni[]
  useTagihanStore().items = [
    { id: 't1', penghuni: 'Hizkia Nogie', kamar: '101', bulan: 'September 2026',
      jumlah: 1_800_000, status: 'belum', jatuh_tempo: '2026-09-05',
      property_id: 'p1', createdAt: '2026-09-01' },
  ] as Tagihan[]
  useMaintenanceStore().items = [
    { id: 'm1', kamar: '101', deskripsi: 'AC bocor', status: 'open', prioritas: 'high',
      tgl: '2026-09-18', property_id: 'p1', jenis: 'AC' },
  ] as Maintenance[]

  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-20T08:00:00'))

  router = createRouter({
    history: createMemoryHistory(),
    routes: [{
      path: '/m',
      component: MobileShell,
      children: [
        { path: '', name: 'm-properti', component: Kosong },
        { path: 'notif', name: 'm-notif', component: MobNotifView },
        { path: 'cari', name: 'm-cari', component: MobCariView },
        { path: 'keluhan', name: 'm-keluhan', component: Kosong },
        { path: 'prop/:id', name: 'm-prop', component: Kosong },
        { path: 'prop/:id/kamar/:nomor', name: 'm-kamar', component: Kosong },
        { path: 'prop/:id/riwayat', name: 'm-riwayat-prop', component: MobRiwayatView },
        { path: 'prop/:id/kamar/:nomor/riwayat', name: 'm-riwayat-kamar', component: MobRiwayatView },
      ],
    }],
  })
})
afterEach(() => vi.useRealTimers())

async function pasang(ke: string) {
  await router.push(ke)
  await router.isReady()
  const w = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('riwayat penghuni', () => {
  it('riwayat properti memuat semua yang sudah keluar', async () => {
    const w = await pasang('/m/prop/p1/riwayat')
    expect(w.text()).toContain('Andreas Siregar')
    expect(w.text()).toContain('Fajar Nugraha')
    /* Yang masih menghuni tidak boleh ikut */
    expect(w.text()).not.toContain('Hizkia')
  })

  it('riwayat kamar memakai kamar pada TANGGAL KELUAR, bukan field kamar', async () => {
    /* Fajar pernah di 101 lalu pindah ke 203 sebelum keluar — ia milik riwayat
       203, bukan 101. */
    const w101 = await pasang('/m/prop/p1/kamar/101/riwayat')
    expect(w101.text()).toContain('Andreas Siregar')
    expect(w101.text()).not.toContain('Fajar Nugraha')

    const w203 = await pasang('/m/prop/p1/kamar/203/riwayat')
    expect(w203.text()).toContain('Fajar Nugraha')
  })

  it('terbaru keluar lebih dulu', async () => {
    const w = await pasang('/m/prop/p1/riwayat')
    const baris = w.findAll('.lrow')
    expect(baris[0].text()).toContain('Andreas')   /* keluar 25 Agu */
    expect(baris[1].text()).toContain('Fajar')     /* keluar 31 Jul */
  })

  it('kamar tanpa riwayat menampilkan keadaan kosong', async () => {
    usePenghuniStore().items = usePenghuniStore().items.filter(p => !p.tgl_keluar)
    const w = await pasang('/m/prop/p1/riwayat')
    expect(w.text()).toContain('Belum ada riwayat')
  })
})

describe('notifikasi', () => {
  it('memuat tagihan belum lunas dan keluhan yang belum ditutup', async () => {
    const w = await pasang('/m/notif')
    expect(w.text()).toContain('Pembayaran telat')
    expect(w.text()).toContain('Keluhan terbuka')
  })

  it('kosong begitu semuanya beres — bukan daftar tersimpan yang basi', async () => {
    useTagihanStore().items[0].status = 'lunas'
    useTagihanStore().items[0].jumlah_bayar = 1_800_000
    useMaintenanceStore().items[0].status = 'selesai'
    const w = await pasang('/m/notif')
    expect(w.text()).toContain('Tidak ada notifikasi')
  })

  it('mengetuk notifikasi tagihan membuka kamarnya', async () => {
    const w = await pasang('/m/notif')
    await w.find('.card.tap').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.params).toMatchObject({ id: 'p1', nomor: '101' })
  })
})

describe('cari', () => {
  it('kosong memberi petunjuk, bukan seluruh isi database', async () => {
    const w = await pasang('/m/cari')
    expect(w.text()).toContain('Mau cari apa?')
    expect(w.findAll('.card.tap')).toHaveLength(0)
  })

  it('menemukan properti, kamar, dan penghuni', async () => {
    const w = await pasang('/m/cari')
    await w.find('.search input').setValue('citra')
    expect(w.text()).toContain('Citra 1')

    await w.find('.search input').setValue('203')
    expect(w.text()).toContain('Kamar 203')

    await w.find('.search input').setValue('hizkia')
    expect(w.text()).toContain('Hizkia Nogie')
  })

  it('kamar dicocokkan ke nomornya saja, bukan nama propertinya', async () => {
    /* Kalau nama properti ikut, "citra" akan mengembalikan seluruh kamar. */
    const w = await pasang('/m/cari')
    await w.find('.search input').setValue('citra')
    expect(w.text()).not.toContain('Kamar 203')
  })

  it('yang tidak ketemu memunculkan keadaan kosong', async () => {
    const w = await pasang('/m/cari')
    await w.find('.search input').setValue('zzzz')
    expect(w.text()).toContain('Tidak ditemukan')
  })
})
