import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import MobileShell from '../../components/mobile/MobileShell.vue'
import MobPenghuniView from '../../views/mobile/MobPenghuniView.vue'
import MobKalenderView from '../../views/mobile/MobKalenderView.vue'
import { useKamarStore } from '../../stores/kamar'
import { usePenghuniStore } from '../../stores/penghuni'
import { useTagihanStore } from '../../stores/tagihan'
import { usePropertiesStore } from '../../stores/properties'
import { useMobile } from '../../composables/useMobile'
import type { Kamar, Penghuni, Property, Tagihan } from '../../types'

/** Tahap 3 port: tab Penghuni dan Kalender. */

const BULAN = 'September 2026'
const Kosong = { template: '<div />' }

function isiData() {
  usePropertiesStore().items = [
    { id: 'p1', nama: 'Citra 1', alamat: 'Kalideres', no_hp: '', created_at: '2026-01-01' },
    { id: 'p2', nama: 'Waru 23', alamat: 'Cengkareng', no_hp: '', created_at: '2026-01-01' },
  ] as Property[]
  usePropertiesStore().kategori = []

  useKamarStore().items = [
    { id: 'k1', nomor: '101', tipe: '', harga: 1_800_000, status: 'terisi', property_id: 'p1' },
    { id: 'k2', nomor: '102', tipe: '', harga: 1_700_000, status: 'terisi', property_id: 'p1' },
    { id: 'k3', nomor: '101', tipe: '', harga: 1_400_000, status: 'terisi', property_id: 'p2' },
  ] as Kamar[]

  usePenghuniStore().items = [
    { id: 'h1', nama: 'Hizkia Nogie', kamar: '101', hp: '0812', masuk: '2026-03-01', property_id: 'p1' },
    { id: 'h2', nama: 'Maria Goreti', kamar: '102', hp: '0813', masuk: '2026-09-20', property_id: 'p1' },
    { id: 'h3', nama: 'Yoga Pratama', kamar: '101', hp: '0814', masuk: '2026-05-01', property_id: 'p2' },
    /* Sudah keluar — tidak boleh muncul di tab Penghuni */
    { id: 'h4', nama: 'Mantan Orang', kamar: '102', hp: '0815', masuk: '2025-01-01',
      tgl_keluar: '2026-08-31', property_id: 'p1' },
  ] as Penghuni[]

  useTagihanStore().items = [
    { id: 't1', penghuni: 'Hizkia Nogie', penghuni_id: 'h1', kamar: '101', bulan: BULAN,
      jumlah: 1_800_000, status: 'lunas', jumlah_bayar: 1_800_000,
      jatuh_tempo: '2026-09-05', property_id: 'p1', createdAt: '2026-09-01' },
    { id: 't2', penghuni: 'Maria Goreti', penghuni_id: 'h2', kamar: '102', bulan: BULAN,
      jumlah: 1_700_000, status: 'belum', jatuh_tempo: '2026-09-10',
      property_id: 'p1', createdAt: '2026-09-01' },
    { id: 't3', penghuni: 'Yoga Pratama', penghuni_id: 'h3', kamar: '101', bulan: BULAN,
      jumlah: 1_400_000, status: 'belum', jatuh_tempo: '2026-09-25',
      property_id: 'p2', createdAt: '2026-09-01' },
  ] as Tagihan[]
}

function buatRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{
      path: '/m',
      component: MobileShell,
      children: [
        { path: '', name: 'm-properti', component: Kosong },
        { path: 'penghuni', name: 'm-penghuni', component: MobPenghuniView },
        { path: 'kalender', name: 'm-kalender', component: MobKalenderView },
        { path: 'prop/:id/kamar/:nomor', name: 'm-kamar', component: Kosong },
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

async function pasang(ke: string) {
  await router.push(ke)
  await router.isReady()
  const w = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('tab Penghuni', () => {
  it('hanya memuat penghuni yang masih menghuni', async () => {
    const w = await pasang('/m/penghuni')
    expect(w.text()).toContain('Hizkia Nogie')
    expect(w.text()).not.toContain('Mantan Orang')
  })

  it('menyebut properti, karena nomor kamar saja tidak cukup', async () => {
    /* Kamar 101 ada di kedua properti. */
    const w = await pasang('/m/penghuni')
    const baris = w.findAll('.stack-v .lrow')
    expect(baris.map(b => b.text()).join(' ')).toContain('Citra 1')
    expect(baris.map(b => b.text()).join(' ')).toContain('Waru 23')
  })

  it('status tiap penghuni diturunkan dari tagihannya sendiri', async () => {
    const w = await pasang('/m/penghuni')
    const teks = w.findAll('.stack-v .lrow').map(b => b.text())
    expect(teks.find(t => t.includes('Hizkia'))).toContain('Lunas')
    expect(teks.find(t => t.includes('Maria'))).toContain('Telat')
    expect(teks.find(t => t.includes('Yoga'))).toContain('Belum')
  })

  it('cari menyaring per nama, kamar, dan nomor HP', async () => {
    const w = await pasang('/m/penghuni')
    const kolom = w.find('.search input')

    await kolom.setValue('yoga')
    expect(w.findAll('.stack-v .lrow')).toHaveLength(1)

    await kolom.setValue('102')
    expect(w.find('.stack-v').text()).toContain('Maria')

    await kolom.setValue('0814')
    expect(w.find('.stack-v').text()).toContain('Yoga')
  })

  it('cari yang tidak ketemu memunculkan keadaan kosong, bukan daftar kosong', async () => {
    const w = await pasang('/m/penghuni')
    await w.find('.search input').setValue('zzzz')
    expect(w.text()).toContain('Tidak ditemukan')
    expect(w.findAll('.stack-v .lrow')).toHaveLength(0)
  })

  it('filter menyaring dan angkanya cocok dengan isinya', async () => {
    const w = await pasang('/m/penghuni')
    const chip = w.findAll('.filterbar .fchip')
    expect(chip.map(c => c.text())).toEqual(['Semua3', 'Lunas1', 'Jatuh tempo1', 'Telat1'])

    await chip[1].trigger('click')
    const baris = w.findAll('.stack-v .lrow')
    expect(baris).toHaveLength(1)
    expect(baris[0].text()).toContain('Hizkia')
  })

  it('mengetuk penghuni membuka kamarnya di properti yang benar', async () => {
    const w = await pasang('/m/penghuni')
    const yoga = w.findAll('.stack-v .lrow').find(b => b.text().includes('Yoga'))!
    await yoga.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.params).toMatchObject({ id: 'p2', nomor: '101' })
  })
})

describe('tab Kalender', () => {
  it('menampilkan bulan berjalan', async () => {
    const w = await pasang('/m/kalender')
    expect(w.text()).toContain('September 2026')
    expect(w.findAll('.cal-day:not(.blank)')).toHaveLength(30)
  })

  it('menandai hari ini', async () => {
    const w = await pasang('/m/kalender')
    const hariIni = w.findAll('.cal-day.today')
    expect(hariIni).toHaveLength(1)
    expect(hariIni[0].text()).toContain('20')
  })

  it('agenda awal adalah hari ini', async () => {
    const w = await pasang('/m/kalender')
    expect(w.text()).toContain('Agenda hari ini')
    /* Maria masuk 20 September */
    expect(w.find('.stack-v').text()).toContain('Maria Goreti')
  })

  it('mengetuk tanggal mengganti agendanya, mengetuk lagi mengembalikannya', async () => {
    const w = await pasang('/m/kalender')
    const tgl10 = w.findAll('.cal-day:not(.blank)')[9]

    await tgl10.trigger('click')
    expect(w.text()).toContain('Agenda 10 September 2026')
    expect(w.findAll('.cal-day.is-sel')).toHaveLength(1)

    await tgl10.trigger('click')
    expect(w.text()).toContain('Agenda hari ini')
    expect(w.findAll('.cal-day.is-sel')).toHaveLength(0)
  })

  it('pindah bulan membatalkan tanggal terpilih', async () => {
    const w = await pasang('/m/kalender')
    await w.findAll('.cal-day:not(.blank)')[9].trigger('click')
    expect(w.findAll('.cal-day.is-sel')).toHaveLength(1)

    await w.findAll('.iconbtn')[1].trigger('click')
    expect(w.text()).toContain('Oktober 2026')
    expect(w.findAll('.cal-day.is-sel')).toHaveLength(0)
  })

  it('setiap tanggal bertitik punya agenda — penanda tidak boleh berbohong', async () => {
    const w = await pasang('/m/kalender')
    const { agendaTanggal } = useMobile()
    const bertitik = w.findAll('.cal-day:not(.blank)')
      .filter(b => b.find('.cal-dots').exists())
    expect(bertitik.length).toBeGreaterThan(0)
    for (const b of bertitik) {
      const d = String(b.text()).trim().split(/\s/)[0].padStart(2, '0')
      expect(agendaTanggal(`2026-09-${d}`).length).toBeGreaterThan(0)
    }
  })

  it('tagihan yang sudah lunas tidak ditandai jatuh tempo', async () => {
    /* t1 jatuh tempo 5 September tapi sudah dibayar. */
    const { agendaTanggal } = useMobile()
    expect(agendaTanggal('2026-09-05')).toHaveLength(0)
  })

  it('tagihan lewat tempo yang belum dibayar ditandai telat', async () => {
    const { agendaTanggal } = useMobile()
    const a = agendaTanggal('2026-09-10')
    expect(a).toHaveLength(1)
    expect(a[0].jenis).toBe('telat')
  })

  it('jatuh tempo yang belum lewat ditandai tempo, bukan telat', async () => {
    const { agendaTanggal } = useMobile()
    expect(agendaTanggal('2026-09-25')[0].jenis).toBe('tempo')
  })
})
