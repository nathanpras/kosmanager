import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import MobileShell from '../../components/mobile/MobileShell.vue'
import MobTagihanListView from '../../views/mobile/MobTagihanListView.vue'
import { useTagihanStore } from '../../stores/tagihan'
import { usePenghuniStore } from '../../stores/penghuni'
import { usePropertiesStore } from '../../stores/properties'
import { useKamarStore } from '../../stores/kamar'
import { useSettingsStore } from '../../stores/settings'
import { useLogStore } from '../../stores/log'
import type { Penghuni, Property, Tagihan } from '../../types'

const Kosong = { template: '<div />' }
let router: Router

beforeEach(() => {
  setActivePinia(createPinia())
  usePropertiesStore().items = [
    { id: 'p1', nama: 'Citra 1', alamat: '', no_hp: '', created_at: '2026-01-01' },
  ] as Property[]
  usePropertiesStore().kategori = []
  useKamarStore().items = []
  usePenghuniStore().items = [
    { id: 'h1', nama: 'Lisia', kamar: '106', hp: '0812 3456 7890', masuk: '2026-01-01', property_id: 'p1' },
  ] as Penghuni[]
  useTagihanStore().items = [
    { id: 't1', penghuni: 'Lisia', penghuni_id: 'h1', kamar: '106', bulan: 'September 2026',
      jumlah: 1_750_000, status: 'belum', jatuh_tempo: '2026-09-05',
      property_id: 'p1', createdAt: '2026-09-01' },
    { id: 't2', penghuni: 'Hizkia', kamar: '101', bulan: 'September 2026',
      jumlah: 1_800_000, status: 'lunas', jumlah_bayar: 1_800_000, tgl: '2026-09-03',
      bayar_ref: 'b1', property_id: 'p1', createdAt: '2026-09-01' },
    { id: 't3', penghuni: 'Hizkia', kamar: '101', bulan: 'Oktober 2026',
      jumlah: 1_800_000, status: 'lunas', jumlah_bayar: 1_800_000, tgl: '2026-09-03',
      bayar_ref: 'b1', property_id: 'p1', createdAt: '2026-09-01' },
  ] as Tagihan[]
  useSettingsStore().data = {}
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
        { path: 'tagihan', name: 'm-tagihan', component: MobTagihanListView },
      ],
    }],
  })
})
afterEach(() => vi.useRealTimers())

async function pasang() {
  await router.push('/m/tagihan')
  await router.isReady()
  const w = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('layar Tagihan', () => {
  it('menampilkan tagihan bulan berjalan saja', async () => {
    const w = await pasang()
    const kartu = w.findAll('.stack-v .card')
    expect(kartu).toHaveLength(2)
    expect(w.text()).toContain('Lisia')
  })

  it('ringkasan membedakan yang terkumpul dari yang ditagih', async () => {
    const w = await pasang()
    const ringkas = w.find('.summary').text()
    expect(ringkas).toContain('1.800.000')   /* terkumpul: hanya t2 */
    expect(ringkas).toContain('3.550.000')   /* total: t1 + t2 */
  })

  it('tombol yang tidak berlaku tidak dirender, bukan dinonaktifkan', async () => {
    const w = await pasang()
    const kartu = w.findAll('.stack-v .card')
    const belum = kartu.find(k => k.text().includes('Lisia'))!
    const lunas = kartu.find(k => k.text().includes('Hizkia'))!

    expect(belum.text()).toContain('Catat bayar')
    expect(belum.text()).toContain('Ingatkan')
    expect(belum.text()).not.toContain('Kuitansi')

    expect(lunas.text()).not.toContain('Catat bayar')
    expect(lunas.text()).not.toContain('Ingatkan')
    expect(lunas.text()).toContain('Kuitansi')
  })

  it('pengingat memakai nomor penghuni tagihan itu', async () => {
    const buka = vi.fn()
    vi.stubGlobal('open', buka)
    const w = await pasang()
    await w.findAll('.btn').find(b => b.text().includes('Ingatkan'))!.trigger('click')
    expect(String(buka.mock.calls[0][0])).toContain('wa.me/6281234567890')
    vi.unstubAllGlobals()
  })

  it('kuitansi memuat seluruh bulan dalam satu bayar_ref', async () => {
    /* Bayar di muka menandai beberapa bulan dengan satu bayar_ref; kuitansi
       untuk satu bulan saja akan membuat penghuni mengira sisanya belum
       tercatat. */
    const w = await pasang()
    await w.findAll('.btn').find(b => b.text().includes('Kuitansi'))!.trigger('click')
    await flushPromises()
    const inv = w.findComponent({ name: 'InvoiceDoc' })
    expect(inv.props('tagihanIds')).toEqual(['t2', 't3'])
  })

  it('mencatat pembayaran dari sini memakai jalur yang sama', async () => {
    const tulis: Array<[string, Partial<Tagihan>]> = []
    useTagihanStore().update = (async (id: string, p: Partial<Tagihan>) => { tulis.push([id, p]) }) as never

    const w = await pasang()
    await w.findAll('.btn').find(b => b.text().includes('Catat bayar'))!.trigger('click')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis[0][0]).toBe('t1')
    expect(tulis[0][1]).toMatchObject({ status: 'lunas', jumlah_bayar: 1_750_000 })
  })

  it('bulan lain bisa dipilih', async () => {
    const w = await pasang()
    await w.findAll('.filterbar .fchip').find(c => c.text() === 'Oktober 2026')!.trigger('click')
    expect(w.findAll('.stack-v .card')).toHaveLength(1)
  })
})
