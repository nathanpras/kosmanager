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

describe('pindah kamar dari shell mobile', () => {
  beforeEach(() => {
    useKamarStore().items.push({
      id: 'k2', nomor: '203', tipe: '', harga: 0, status: 'kosong', property_id: 'p1',
    } as Kamar)
    usePenghuniStore().update = (async (id: string, patch: Partial<Penghuni>) => {
      Object.assign(usePenghuniStore().items.find(p => p.id === id)!, patch)
    }) as never
    useKamarStore().update = (async () => {}) as never
  })

  async function bukaPindah() {
    const w = await bukaKamar()
    await w.findAll('.link').find(b => b.text().includes('Pindah kamar'))!.trigger('click')
    return w
  }

  it('menuliskan aturan penagihan dengan nomor kamar dan bulan yang sebenarnya', async () => {
    const w = await bukaPindah()
    const nota = w.find('.sheet .note.info').text()
    expect(nota).toContain('kamar 101')
    expect(nota).toContain('1 Oktober 2026')
  })

  it('hanya menawarkan kamar kosong di properti yang sama', async () => {
    const w = await bukaPindah()
    const opsi = w.findAll('.sheet select option').map(o => o.text())
    expect(opsi).toEqual(['Pilih kamar kosong', 'Kamar 203 · kosong'])
  })

  it('menahan simpan tanpa kamar tujuan', async () => {
    const w = await bukaPindah()
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()
    expect(w.find('.sheet .note.bad').exists()).toBe(true)
    expect(usePenghuniStore().items[0].kamar).toBe('101')
  })

  it('memindahkan lewat composable yang sama dengan desktop', async () => {
    const w = await bukaPindah()
    await w.find('.sheet select').setValue('203')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    const p = usePenghuniStore().items[0]
    expect(p.kamar).toBe('203')
    /* Yang menentukan penagihan: riwayat berlaku 1 bulan berikutnya. */
    expect(p.riwayat_kamar?.at(-1)).toMatchObject({ kamar: '203', sejak: '2026-10-01' })
  })

  it('tanpa kamar kosong, sheetnya berkata jujur dan tidak punya tombol Simpan', async () => {
    useKamarStore().items = useKamarStore().items.filter(k => k.nomor !== '203')
    const w = await bukaPindah()
    expect(w.find('.sheet .note.bad').text()).toContain('Tidak ada kamar kosong')
    expect(w.findAll('.sheet-foot .btn').map(b => b.text())).toEqual(['Tutup'])
  })
})

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

describe('akhiri sewa dari shell mobile', () => {
  async function bukaKeluar() {
    const w = await bukaKamar()
    await w.findAll('.link').find(b => b.text().includes('Akhiri sewa'))!.trigger('click')
    return w
  }

  it('menyebut bahwa penghuni pindah ke riwayat, bukan dihapus', async () => {
    const w = await bukaKeluar()
    expect(w.find('.sheet .note.info').text()).toContain('bukan dihapus')
  })

  it('butuh dua ketukan — satu ketukan tidak menulis apa pun', async () => {
    const tulis: unknown[] = []
    usePenghuniStore().update = (async (...a: unknown[]) => { tulis.push(a) }) as never

    const w = await bukaKeluar()
    const tombol = () => w.findAll('.sheet .btn.block')[0]
    await tombol().trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(0)
    expect(tombol().classes()).toContain('danger')
    expect(tombol().text()).toContain('sekali lagi')
  })

  it('ketukan kedua menulis tanggal keluar lewat useKeluarPenghuni', async () => {
    const tulis: Array<[string, Partial<Penghuni>]> = []
    usePenghuniStore().update = (async (id: string, patch: Partial<Penghuni>) => {
      tulis.push([id, patch])
      Object.assign(usePenghuniStore().items.find(p => p.id === id)!, patch)
    }) as never
    useKamarStore().update = (async () => {}) as never

    const w = await bukaKeluar()
    await w.findAll('.sheet .btn.block')[0].trigger('click')
    await w.findAll('.sheet .btn.block')[0].trigger('click')
    await flushPromises()

    expect(tulis[0]).toEqual(['h1', { tgl_keluar: '2026-09-20' }])
  })
})

describe('ubah harga kamar dari shell mobile', () => {
  async function bukaHarga() {
    const w = await bukaKamar()
    await w.findAll('.ptab')[1].trigger('click')
    await w.findAll('.btn.brandsoft').find(b => b.text().includes('Ubah harga'))!.trigger('click')
    return w
  }

  it('terisi harga yang berlaku sekarang', async () => {
    const w = await bukaHarga()
    expect((w.find('.sheet .field-in').element as HTMLInputElement).value).toContain('1.800.000')
  })

  it('mengatakan bahwa tagihan yang sudah terbit tidak ikut berubah', async () => {
    const w = await bukaHarga()
    expect(w.find('.sheet .note.info').text()).toContain('tidak ikut')
  })

  it('harga nol ditahan dan tidak menulis apa pun', async () => {
    const tulis: unknown[] = []
    useKamarStore().update = (async (...a: unknown[]) => { tulis.push(a) }) as never

    const w = await bukaHarga()
    await w.find('.sheet .field-in').setValue('0')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(0)
    expect(w.find('.sheet .note.bad').exists()).toBe(true)
  })

  it('menulis harga baru ke dokumen kamar', async () => {
    const tulis: Array<[string, Partial<Kamar>]> = []
    useKamarStore().update = (async (id: string, patch: Partial<Kamar>) => {
      tulis.push([id, patch])
    }) as never

    const w = await bukaHarga()
    await w.find('.sheet .field-in').setValue('1950000')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toEqual([['k1', { harga: 1_950_000 }]])
  })
})

describe('tambah tagihan dari shell mobile', () => {
  async function bukaTagihan() {
    const w = await bukaKamar()
    await w.findAll('.ptab')[2].trigger('click')
    await w.findAll('.btn.brandsoft').find(b => b.text().includes('Tambah tagihan'))!.trigger('click')
    return w
  }

  it('memperingatkan bila bulan itu sudah punya tagihan', async () => {
    const w = await bukaTagihan()
    /* t1 sudah ada untuk September atas nama h1. */
    expect(w.find('.sheet .note.info').text()).toContain('sudah punya 1 tagihan')
  })

  it('jumlah nol ditahan dan tidak menulis apa pun', async () => {
    const tulis: unknown[] = []
    useTagihanStore().add = (async (x: unknown) => { tulis.push(x) }) as never

    const w = await bukaTagihan()
    await w.findAll('.sheet .field-in')[1].setValue('0')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(0)
    expect(w.find('.sheet .note.bad').exists()).toBe(true)
  })

  it('menulis tagihan atas nama penghuni dan kamar yang benar', async () => {
    const tulis: Array<Record<string, unknown>> = []
    useTagihanStore().add = (async (x: Record<string, unknown>) => { tulis.push(x) }) as never

    const w = await bukaTagihan()
    await w.findAll('.sheet .field-in')[1].setValue('500000')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(1)
    expect(tulis[0]).toMatchObject({
      penghuni: 'Hizkia Nogie', penghuni_id: 'h1', kamar: '101',
      jumlah: 500_000, status: 'belum', property_id: 'p1',
    })
  })

  it('tombolnya tidak muncul di kamar tanpa penghuni', async () => {
    usePenghuniStore().items = []
    const w = await bukaKamar()
    await w.findAll('.ptab')[2].trigger('click')
    expect(w.findAll('.btn.brandsoft').some(b => b.text().includes('Tambah tagihan'))).toBe(false)
  })
})

describe('tambah dan ubah penghuni dari shell mobile', () => {
  beforeEach(() => {
    useKamarStore().items.push({
      id: 'k9', nomor: '109', tipe: '', harga: 1_500_000, status: 'kosong', property_id: 'p1',
    } as Kamar)
  })

  async function bukaKamarKosong() {
    await router.push('/m/prop/p1/kamar/109')
    await router.isReady()
    const w = mount(RouterView, { global: { plugins: [router] } })
    await flushPromises()
    await w.findAll('.btn').find(b => b.text().includes('Tambah penghuni'))!.trigger('click')
    return w
  }

  it('menolak nomor HP yang tidak valid tanpa menulis', async () => {
    const tulis: unknown[] = []
    usePenghuniStore().add = (async (x: unknown) => { tulis.push(x) }) as never

    const w = await bukaKamarKosong()
    await w.findAll('.sheet input')[0].setValue('Budi')
    await w.findAll('.sheet input')[1].setValue('12')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(0)
    expect(w.find('.sheet .note.bad').text()).toContain('belum valid')
  })

  it('menambah penghuni ke kamar tempat sheetnya dibuka', async () => {
    const tulis: Array<Record<string, unknown>> = []
    usePenghuniStore().add = (async (x: Record<string, unknown>) => { tulis.push(x) }) as never
    useKamarStore().update = (async () => {}) as never
    useTagihanStore().add = (async () => {}) as never

    const w = await bukaKamarKosong()
    await w.findAll('.sheet input')[0].setValue('Budi Santoso')
    await w.findAll('.sheet input')[1].setValue('0812 3456 7890')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(1)
    expect(tulis[0]).toMatchObject({ nama: 'Budi Santoso', kamar: '109', property_id: 'p1' })
  })

  it('mengatakan bahwa tagihan bulan masuk ikut dibuat', async () => {
    const w = await bukaKamarKosong()
    expect(w.find('.sheet .note.info').text()).toContain('bulan masuk')
  })

  it('ubah data terisi dari penghuni yang ada', async () => {
    const w = await bukaKamar()
    await w.findAll('.link').find(b => b.text().includes('Ubah data'))!.trigger('click')
    expect((w.findAll('.sheet input')[0].element as HTMLInputElement).value).toBe('Hizkia Nogie')
  })
})
