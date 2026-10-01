import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import MobileShell from '../../components/mobile/MobileShell.vue'
import MobPropertiView from '../../views/mobile/MobPropertiView.vue'
import MobPengaturanView from '../../views/mobile/MobPengaturanView.vue'
import { useSettingsStore } from '../../stores/settings'
import { usePropertiesStore } from '../../stores/properties'
import { useKamarStore } from '../../stores/kamar'
import type { Property } from '../../types'

/** Paritas: Pengaturan harus bisa dicapai dan diubah dari shell mobile. */

const Kosong = { template: '<div />' }
let router: Router

function buatRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: Kosong },
      {
        path: '/m',
        component: MobileShell,
        children: [
          { path: '', name: 'm-properti', component: MobPropertiView },
          /* Seluruh tujuan menu harus ada di sini. Kalau menu bertambah dan
             rutenya lupa didaftarkan, uji di bawah menangkapnya — bukan
             membiarkannya jadi penolakan async yang tak terlihat. */
          { path: 'notif', name: 'm-notif', component: Kosong },
          { path: 'cari', name: 'm-cari', component: Kosong },
          { path: 'tagihan', name: 'm-tagihan', component: Kosong },
          { path: 'keluhan', name: 'm-keluhan', component: Kosong },
          { path: 'laporan', name: 'm-laporan', component: Kosong },
          { path: 'log', name: 'm-log', component: Kosong },
          { path: 'pengaturan', name: 'm-pengaturan', component: MobPengaturanView },
        ],
      },
    ],
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  usePropertiesStore().items = [
    { id: 'p1', nama: 'Citra 1', alamat: 'Kalideres', no_hp: '', created_at: '2026-01-01' },
  ] as Property[]
  usePropertiesStore().kategori = [{ id: 'kat1', nama: 'Lantai 1', urutan: 0 }]
  useKamarStore().items = []
  useSettingsStore().data = { nama: 'Raffles Kos', tgl_jatuh_tempo: 5 }
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-20T08:00:00'))
  router = buatRouter()
})
afterEach(() => vi.useRealTimers())

async function pasang(ke: string) {
  await router.push(ke)
  await router.isReady()
  const w = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

async function bukaMenu(w: ReturnType<typeof mount>) {
  await w.findAll('.topbar .iconbtn')
    .find(b => b.attributes('aria-label') === 'Menu')!.trigger('click')
}

describe('menu di beranda', () => {
  it('setiap tujuan di menu punya rutenya — tidak ada jalan buntu', async () => {
    /* Menu yang menampilkan layar yang belum jadi persis jalan buntu yang
       dihabiskan di ronde 5 mockup. */
    const w = await pasang('/m')
    await bukaMenu(w)
    const item = w.findAll('.sheet .aitem')
    expect(item.length).toBeGreaterThan(0)

    const namaRute = router.getRoutes().map(r => r.name)
    for (let i = 0; i < item.length; i++) {
      const w2 = await pasang('/m')
      await bukaMenu(w2)
      const judul = w2.findAll('.sheet .aitem')[i].text()
      await w2.findAll('.sheet .aitem')[i].trigger('click')
      await flushPromises()
      /* Rute yang tidak terdaftar membuat router menolak secara asinkron dan
         rutenya tidak berpindah — diperiksa di sini, bukan dibiarkan lewat. */
      expect(router.currentRoute.value.name, `menu "${judul}" tidak menuju rute mana pun`)
        .not.toBe('m-properti')
      expect(namaRute).toContain(router.currentRoute.value.name)
      expect(String(router.currentRoute.value.name)).toMatch(/^m-/)
    }
  })

  it('Pengaturan bisa dibuka dari menu', async () => {
    const w = await pasang('/m')
    await bukaMenu(w)
    const pengaturan = w.findAll('.sheet .aitem').find(i => i.text().includes('Pengaturan'))
    expect(pengaturan).toBeTruthy()
    await pengaturan!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('m-pengaturan')
  })
})

describe('layar Pengaturan', () => {
  it('menampilkan nama kos yang tersimpan', async () => {
    const w = await pasang('/m/pengaturan')
    expect(w.text()).toContain('Raffles Kos')
  })

  it('mendaftar properti yang ada', async () => {
    const w = await pasang('/m/pengaturan')
    expect(w.text()).toContain('Citra 1')
  })

  it('menolak tanggal jatuh tempo di luar 1-28 tanpa menulis', async () => {
    const tulis: unknown[] = []
    useSettingsStore().save = (async (x: unknown) => { tulis.push(x) }) as never

    const w = await pasang('/m/pengaturan')
    await w.findAll('.card.tap')[0].trigger('click')
    const tempo = w.findAll('.sheet input[type="number"]')[0]
    await tempo.setValue('31')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(0)
    expect(w.find('.sheet .note.bad').text()).toContain('1 dan 28')
  })

  it('menyimpan informasi kos lewat settings.save', async () => {
    const tulis: Array<Record<string, unknown>> = []
    useSettingsStore().save = (async (x: Record<string, unknown>) => { tulis.push(x) }) as never

    const w = await pasang('/m/pengaturan')
    await w.findAll('.card.tap')[0].trigger('click')
    await w.findAll('.sheet input')[0].setValue('Raffles Kos 23')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(1)
    expect(tulis[0]).toMatchObject({ nama: 'Raffles Kos 23' })
  })

  it('bisa menambah dan menghapus kategori kamar', async () => {
    const ditambah: string[] = []
    const dihapus: string[] = []
    usePropertiesStore().addKategori = (async (n: string) => { ditambah.push(n) }) as never
    usePropertiesStore().removeKategori = (async (id: string) => { dihapus.push(id) }) as never

    const w = await pasang('/m/pengaturan')
    await w.findAll('.card.tap').find(b => b.text().includes('Kategori'))!.trigger('click')

    await w.find('.sheet input').setValue('Lantai 2')
    await w.findAll('.sheet .btn').find(b => b.text().includes('Tambah kategori'))!.trigger('click')
    await flushPromises()
    expect(ditambah).toEqual(['Lantai 2'])

    await w.find('.sheet .lrow .iconbtn').trigger('click')
    await flushPromises()
    expect(dihapus).toEqual(['kat1'])
  })

  it('mengatakan apa yang hanya ada di desktop, bukan menyembunyikannya', async () => {
    const w = await pasang('/m/pengaturan')
    const nota = w.findAll('.note.info').map(n => n.text()).join(' ')
    expect(nota).toContain('penomoran kamar')
    expect(nota).toContain('saldo awal')
  })
})

describe('tambah properti dari Pengaturan', () => {
  it('nama kosong ditahan tanpa menulis', async () => {
    const tulis: unknown[] = []
    usePropertiesStore().addProperty = (async (x: unknown) => { tulis.push(x) }) as never

    const w = await pasang('/m/pengaturan')
    await w.findAll('.link').find(b => b.text() === 'Tambah')!.trigger('click')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(0)
    expect(w.find('.sheet .note.bad').exists()).toBe(true)
  })

  it('properti baru ditulis dengan tanggal pembuatan', async () => {
    const tulis: Array<Record<string, unknown>> = []
    usePropertiesStore().addProperty = (async (x: Record<string, unknown>) => { tulis.push(x) }) as never

    const w = await pasang('/m/pengaturan')
    await w.findAll('.link').find(b => b.text() === 'Tambah')!.trigger('click')
    await w.findAll('.sheet input')[0].setValue('Raffles Kos 24')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(1)
    expect(tulis[0]).toMatchObject({ nama: 'Raffles Kos 24' })
    expect(tulis[0].created_at).toBeTruthy()
  })

  it('sheet properti baru tidak menyinggung saldo awal — belum ada apa pun untuk diatur', async () => {
    const w = await pasang('/m/pengaturan')
    await w.findAll('.link').find(b => b.text() === 'Tambah')!.trigger('click')
    expect(w.find('.sheet').text()).not.toContain('Saldo awal')
  })
})
