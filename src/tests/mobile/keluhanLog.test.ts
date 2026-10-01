import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import MobileShell from '../../components/mobile/MobileShell.vue'
import MobKeluhanView from '../../views/mobile/MobKeluhanView.vue'
import MobLogView from '../../views/mobile/MobLogView.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { usePenghuniStore } from '../../stores/penghuni'
import { usePropertiesStore } from '../../stores/properties'
import { useLogStore } from '../../stores/log'
import type { Maintenance, Penghuni, Property } from '../../types'

const Kosong = { template: '<div />' }
let router: Router
let tulisStatus: Array<[string, Partial<Maintenance>]>

beforeEach(() => {
  setActivePinia(createPinia())
  usePropertiesStore().items = [
    { id: 'p1', nama: 'Citra 1', alamat: '', no_hp: '', created_at: '2026-01-01' },
  ] as Property[]
  usePenghuniStore().items = [
    { id: 'h1', nama: 'Lisia', kamar: '106', hp: '0812 3456 7890', masuk: '2026-01-01', property_id: 'p1' },
  ] as Penghuni[]
  useMaintenanceStore().items = [
    { id: 'm1', kamar: '106', deskripsi: 'AC tidak dingin', status: 'open',
      prioritas: 'high', tgl: '2026-09-18', property_id: 'p1', jenis: 'AC', pelapor: 'Lisia' },
    { id: 'm2', kamar: '101', deskripsi: 'Keran bocor', status: 'selesai',
      prioritas: 'low', tgl: '2026-09-01', tgl_selesai: '2026-09-03', property_id: 'p1', jenis: 'Air' },
  ] as Maintenance[]
  useLogStore().items = [
    { id: 'l1', text: 'Lisia bayar kamar 106', color: 'green', ts: '2026-09-18T09:00:00', property_id: 'p1' },
    { id: 'l2', text: 'Pengeluaran listrik', color: 'red', ts: '2026-09-19T10:00:00', property_id: 'p1' },
  ]

  tulisStatus = []
  useMaintenanceStore().update = (async (id: string, patch: Partial<Maintenance>) => {
    tulisStatus.push([id, patch])
    Object.assign(useMaintenanceStore().items.find(m => m.id === id)!, patch)
  }) as never
  useLogStore().add = (async () => {}) as never

  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-20T08:00:00'))

  router = createRouter({
    history: createMemoryHistory(),
    routes: [{
      path: '/m',
      component: MobileShell,
      children: [
        { path: '', name: 'm-properti', component: Kosong },
        { path: 'keluhan', name: 'm-keluhan', component: MobKeluhanView },
        { path: 'log', name: 'm-log', component: MobLogView },
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

describe('layar Keluhan', () => {
  it('filter Aktif menyembunyikan yang sudah selesai', async () => {
    const w = await pasang('/m/keluhan')
    expect(w.text()).toContain('AC tidak dingin')
    expect(w.text()).not.toContain('Keran bocor')
  })

  it('angka di tiap filter cocok dengan isinya', async () => {
    const w = await pasang('/m/keluhan')
    expect(w.findAll('.filterbar .fchip').map(c => c.text()))
      .toEqual(['Aktif1', 'Semua2', 'Selesai1'])
  })

  it('status dimajukan langsung dari kartunya', async () => {
    const w = await pasang('/m/keluhan')
    await w.findAll('.btn.brandsoft')[0].trigger('click')
    await flushPromises()
    expect(tulisStatus[0]).toEqual(['m1', { status: 'in_progress' }])
  })

  it('menandai selesai ikut mengisi tanggal selesai', async () => {
    useMaintenanceStore().items[0].status = 'in_progress'
    const w = await pasang('/m/keluhan')
    await w.findAll('.btn.brandsoft')[0].trigger('click')
    await flushPromises()
    expect(tulisStatus[0][1]).toMatchObject({ status: 'selesai', tgl_selesai: '2026-09-20' })
  })

  it('membuka kembali keluhan selesai ikut mengosongkan tanggal selesainya', async () => {
    const w = await pasang('/m/keluhan')
    await w.findAll('.filterbar .fchip')[2].trigger('click')
    await w.findAll('.btn.brandsoft')[0].trigger('click')
    await flushPromises()
    expect(tulisStatus[0][1]).toMatchObject({ status: 'open', tgl_selesai: '' })
  })

  it('balas WA memakai nomor penghuni kamar itu', async () => {
    const buka = vi.fn()
    vi.stubGlobal('open', buka)
    const w = await pasang('/m/keluhan')
    await w.findAll('.btn.sm').find(b => b.text().includes('Balas'))!.trigger('click')
    expect(buka).toHaveBeenCalled()
    expect(String(buka.mock.calls[0][0])).toContain('wa.me/6281234567890')
    vi.unstubAllGlobals()
  })
})

describe('layar Riwayat', () => {
  it('menampilkan aktivitas, terbaru dulu', async () => {
    const w = await pasang('/m/log')
    const baris = w.findAll('.lrow')
    expect(baris[0].text()).toContain('Pengeluaran listrik')
    expect(baris[1].text()).toContain('Lisia bayar kamar 106')
  })

  it('kosong saat belum ada aktivitas', async () => {
    useLogStore().items = []
    const w = await pasang('/m/log')
    expect(w.text()).toContain('Belum ada aktivitas')
  })
})
