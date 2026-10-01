import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView, type Router } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import MobileShell from '../../components/mobile/MobileShell.vue'
import MobPropertiView from '../../views/mobile/MobPropertiView.vue'
import MobPropDetailView from '../../views/mobile/MobPropDetailView.vue'
import MobKamarDetailView from '../../views/mobile/MobKamarDetailView.vue'
import { useKamarStore } from '../../stores/kamar'
import { usePenghuniStore } from '../../stores/penghuni'
import { useTagihanStore } from '../../stores/tagihan'
import { usePengeluaranStore } from '../../stores/pengeluaran'
import { usePropertiesStore } from '../../stores/properties'
import { useSettingsStore } from '../../stores/settings'
import { useLogStore } from '../../stores/log'
import type { Kamar, Penghuni, Property, Tagihan } from '../../types'

/**
 * Tahap 2 port: layar baca memakai store sungguhan.
 *
 * Yang diuji bukan rupanya, melainkan bahwa angkanya berasal dari data dan
 * tidak ada tombol yang menuju ke mana-mana — pelajaran dari ronde 5 mockup.
 */

const BULAN = 'September 2026'

function isiData() {
  usePropertiesStore().items = [
    { id: 'p1', nama: 'Raffles Kost Citra 1', alamat: 'Kalideres', no_hp: '0851',
      created_at: '2026-01-01' },
    { id: 'p2', nama: 'Raffles Kost Waru 23', alamat: 'Cengkareng', no_hp: '0852',
      created_at: '2026-01-01' },
  ] as Property[]
  usePropertiesStore().kategori = []

  useKamarStore().items = [
    { id: 'k1', nomor: '101', tipe: 'Mandi dalam', harga: 1_800_000, status: 'terisi', property_id: 'p1' },
    { id: 'k2', nomor: '102', tipe: '', harga: 1_700_000, status: 'terisi', property_id: 'p1' },
    { id: 'k3', nomor: '103', tipe: '', harga: 0, status: 'kosong', property_id: 'p1' },
    /* Nomor yang sama di properti lain — tidak boleh tercampur */
    { id: 'k4', nomor: '101', tipe: '', harga: 1_400_000, status: 'terisi', property_id: 'p2' },
  ] as Kamar[]

  usePenghuniStore().items = [
    { id: 'h1', nama: 'Hizkia Nogie', kamar: '101', hp: '0812', masuk: '2026-01-01', property_id: 'p1' },
    { id: 'h2', nama: 'Maria Goreti', kamar: '102', hp: '0813', masuk: '2026-02-01', property_id: 'p1' },
    { id: 'h3', nama: 'Yoga Pratama', kamar: '101', hp: '0814', masuk: '2026-03-01', property_id: 'p2' },
  ] as Penghuni[]

  useTagihanStore().items = [
    { id: 't1', penghuni: 'Hizkia Nogie', kamar: '101', bulan: BULAN, jumlah: 1_800_000,
      status: 'lunas', jumlah_bayar: 1_800_000, tgl: '2026-09-05', property_id: 'p1',
      createdAt: '2026-09-01' },
    { id: 't2', penghuni: 'Maria Goreti', kamar: '102', bulan: BULAN, jumlah: 1_700_000,
      status: 'belum', jatuh_tempo: '2026-09-01', property_id: 'p1', createdAt: '2026-09-01' },
  ] as Tagihan[]

  usePengeluaranStore().items = [
    { id: 'x1', deskripsi: 'Token listrik', jumlah: 450_000, kategori: 'Listrik',
      tgl: '2026-09-10', property_id: 'p1' },
  ]

  useSettingsStore().data = { nama: 'Jonathan' }
}

function buatRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
    { path: '/', name: 'dashboard', component: { template: '<div>lama</div>' } },
    {
      path: '/m',
      component: MobileShell,
      children: [
        { path: '', name: 'm-properti', component: MobPropertiView },
        { path: 'prop/:id', name: 'm-prop', component: MobPropDetailView },
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

async function pasang(ke: string) {
  await router.push(ke)
  await router.isReady()
  const w = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('beranda mobile', () => {
  it('menyapa dengan nama pemilik dari pengaturan', async () => {
    const w = await pasang('/m')
    expect(w.text()).toContain('Jonathan')
  })

  it('menampilkan kedua properti dengan hitungan terisi masing-masing', async () => {
    const w = await pasang('/m')
    const kartu = w.findAll('.stack-v .lrow')
    expect(kartu).toHaveLength(2)
    expect(kartu[0].text()).toContain('Raffles Kost Citra 1')
    expect(kartu[0].text()).toContain('2/3 terisi')
    expect(kartu[1].text()).toContain('1/1 terisi')
  })

  it('chip telat hanya muncul pada properti yang memang punya', async () => {
    const w = await pasang('/m')
    const kartu = w.findAll('.stack-v .lrow')
    expect(kartu[0].text()).toContain('1 telat')
    expect(kartu[1].text()).not.toContain('telat')
  })

  it('tidak merender satu pun tombol yang tidak menuju ke mana-mana', async () => {
    const w = await pasang('/m')
    /* Chip statistik sengaja bukan tombol selama layar filternya belum diport. */
    expect(w.findAll('.statgrid button')).toHaveLength(0)
    expect(w.findAll('.statgrid .statchip').length).toBeGreaterThan(0)
  })

  it('punya jalan keluar ke tampilan lama', async () => {
    /* Selama /m belum jadi bawaan, orang bisa mendarat di sini tanpa riwayat
       navigasi. Tanpa tombol ini mereka terjebak. */
    const w = await pasang('/m')
    const keluar = w.findAll('.topbar .iconbtn')
      .find(b => b.attributes('aria-label')?.includes('tampilan lama'))
    expect(keluar).toBeTruthy()
    await keluar!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('mengetuk properti masuk ke detailnya', async () => {
    const w = await pasang('/m')
    await w.findAll('.stack-v .lrow')[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('m-prop')
    expect(router.currentRoute.value.params.id).toBe('p1')
  })
})

describe('detail properti', () => {
  it('hanya menampilkan kamar milik properti itu', async () => {
    const w = await pasang('/m/prop/p1')
    const baris = w.findAll('[class*="lrow"] .roomno')
    expect(baris.map(b => b.text())).toEqual(['101', '102', '103'])
  })

  it('chip status kamar diturunkan dari tagihan, bukan dari field kamar', async () => {
    const w = await pasang('/m/prop/p1')
    const teks = w.text()
    expect(teks).toContain('Lunas')   /* 101 dibayar penuh */
    expect(teks).toContain('Telat')   /* 102 lewat jatuh tempo */
    expect(teks).toContain('Kosong')  /* 103 */
  })

  it('tab Transaksi memakai uang yang diterima, bukan yang ditagih', async () => {
    const w = await pasang('/m/prop/p1')
    await w.findAll('.ptab')[1].trigger('click')
    /* Hanya t1 yang sudah dibayar; t2 belum, jadi tidak masuk pemasukan. */
    expect(w.text()).toContain('Token listrik')
    expect(w.text()).toContain('Hizkia Nogie')
    expect(w.text()).not.toContain('Maria Goreti')
  })

  it('tab Lainnya menampilkan keterangan, bukan baris mati', async () => {
    const w = await pasang('/m/prop/p1')
    await w.findAll('.ptab')[2].trigger('click')
    expect(w.text()).toContain('Kalideres')
    expect(w.findAll('.ptab')).toHaveLength(3)
  })

  it('mengetuk kamar masuk ke detail kamar yang benar', async () => {
    const w = await pasang('/m/prop/p1')
    await w.findAll('.card.tap')[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('m-kamar')
    expect(router.currentRoute.value.params).toMatchObject({ id: 'p1', nomor: '101' })
  })
})

describe('detail kamar', () => {
  it('menampilkan penghuni aktif kamar itu saja', async () => {
    const w = await pasang('/m/prop/p1/kamar/101')
    expect(w.text()).toContain('Hizkia Nogie')
    /* Penghuni kamar 101 di properti lain tidak boleh ikut */
    expect(w.text()).not.toContain('Yoga Pratama')
  })

  it('kamar kosong menampilkan keadaan kosong, bukan kartu penghuni palsu', async () => {
    const w = await pasang('/m/prop/p1/kamar/103')
    expect(w.text()).toContain('Kamar ini kosong')
  })

  it('tab Harga membaca angka dari dokumen kamar', async () => {
    const w = await pasang('/m/prop/p1/kamar/101')
    await w.findAll('.ptab')[1].trigger('click')
    expect(w.text()).toContain('Mandi dalam')
    expect(w.text()).toContain('1.800.000')
  })

  it('tab Transaksi hanya memuat tagihan kamar itu', async () => {
    const w = await pasang('/m/prop/p1/kamar/101')
    await w.findAll('.ptab')[2].trigger('click')
    const baris = w.findAll('.card.flush.divide .lrow')
    expect(baris).toHaveLength(1)
    expect(baris[0].text()).toContain(BULAN)
  })

  it('dok turun di layar drill-down', async () => {
    const w = await pasang('/m/prop/p1/kamar/101')
    expect(w.find('.dock').classes()).toContain('is-hidden')
  })
})

describe('catat pengeluaran dari detail properti', () => {
  it('FAB mengikuti tab: Kamar menambah kamar, Transaksi menambah pengeluaran', async () => {
    const w = await pasang('/m/prop/p1')
    expect(w.find('.fab').text()).toContain('Kamar')

    await w.findAll('.ptab')[1].trigger('click')
    expect(w.find('.fab').text()).toContain('Pengeluaran')

    /* Tab Lainnya hanya keterangan — tidak ada yang ditambahkan dari sana. */
    await w.findAll('.ptab')[2].trigger('click')
    expect(w.find('.fab').exists()).toBe(false)
  })

  it('menahan simpan tanpa nominal dan tanpa keterangan', async () => {
    const tulis: unknown[] = []
    usePengeluaranStore().add = (async (x: unknown) => { tulis.push(x) }) as never

    const w = await pasang('/m/prop/p1')
    await w.findAll('.ptab')[1].trigger('click')
    await w.find('.fab').trigger('click')

    const simpan = () => w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!
    await simpan().trigger('click')
    expect(w.find('.sheet .note.bad').text()).toContain('Nominal')

    await w.findAll('.sheet .field-in')[0].setValue('480000')
    await simpan().trigger('click')
    expect(w.find('.sheet .note.bad').text()).toContain('Keterangan')

    expect(tulis).toHaveLength(0)
  })

  it('menulis pengeluaran ke properti yang sedang dibuka', async () => {
    const tulis: Array<Record<string, unknown>> = []
    usePengeluaranStore().add = (async (x: Record<string, unknown>) => { tulis.push(x) }) as never
    useLogStore().add = (async () => {}) as never

    const w = await pasang('/m/prop/p1')
    await w.findAll('.ptab')[1].trigger('click')
    await w.find('.fab').trigger('click')

    const isian = w.findAll('.sheet .field-in')
    await isian[0].setValue('480000')
    await w.findAll('.sheet .field-in').at(-1)!.setValue('Token listrik blok A')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(1)
    expect(tulis[0]).toMatchObject({
      deskripsi: 'Token listrik blok A', jumlah: 480_000, property_id: 'p1',
    })
  })
})

describe('ubah data kos dari detail properti', () => {
  async function bukaUbah() {
    const w = await pasang('/m/prop/p1')
    await w.findAll('.ptab')[2].trigger('click')
    await w.findAll('.link').find(b => b.text() === 'Ubah')!.trigger('click')
    return w
  }

  it('terisi data properti yang sedang dibuka', async () => {
    const w = await bukaUbah()
    const isian = w.findAll('.sheet input')
    expect((isian[0].element as HTMLInputElement).value).toBe('Raffles Kost Citra 1')
    expect((isian[1].element as HTMLInputElement).value).toBe('Kalideres')
  })

  it('nama kosong ditahan dan tidak menulis apa pun', async () => {
    const tulis: unknown[] = []
    usePropertiesStore().updateProperty = (async (...a: unknown[]) => { tulis.push(a) }) as never

    const w = await bukaUbah()
    await w.findAll('.sheet input')[0].setValue('')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(0)
    expect(w.find('.sheet .note.bad').exists()).toBe(true)
  })

  it('menulis perubahan ke properti yang benar', async () => {
    const tulis: Array<[string, Record<string, unknown>]> = []
    usePropertiesStore().updateProperty = (async (id: string, d: Record<string, unknown>) => {
      tulis.push([id, d])
    }) as never

    const w = await bukaUbah()
    await w.findAll('.sheet input')[1].setValue('Cengkareng Barat')
    await w.findAll('.sheet input')[3].setValue('BCA')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(1)
    expect(tulis[0][0]).toBe('p1')
    expect(tulis[0][1]).toMatchObject({ alamat: 'Cengkareng Barat', bank_nama: 'BCA' })
  })

  it('tidak menawarkan saldo awal — tempatnya di desktop, dan sheet mengatakannya', async () => {
    const w = await bukaUbah()
    const label = w.findAll('.sheet .field-lbl').map(l => l.text())
    expect(label.some(l => l.toLowerCase().includes('saldo'))).toBe(false)
    expect(w.find('.sheet .note.info').text()).toContain('desktop')
  })
})

describe('tambah kamar dari detail properti', () => {
  it('menolak nomor kosong dan harga nol tanpa menulis', async () => {
    const tulis: unknown[] = []
    useKamarStore().add = (async (x: unknown) => { tulis.push(x) }) as never

    const w = await pasang('/m/prop/p1')
    await w.find('.fab').trigger('click')
    const simpan = () => w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!

    await simpan().trigger('click')
    expect(w.find('.sheet .note.bad').text()).toContain('Nomor kamar')

    await w.findAll('.sheet input')[0].setValue('208')
    await simpan().trigger('click')
    expect(w.find('.sheet .note.bad').text()).toContain('Harga sewa')

    expect(tulis).toHaveLength(0)
  })

  it('menulis kamar baru ke properti yang sedang dibuka, berstatus kosong', async () => {
    const tulis: Array<Record<string, unknown>> = []
    useKamarStore().add = (async (x: Record<string, unknown>) => { tulis.push(x) }) as never
    useLogStore().add = (async () => {}) as never

    const w = await pasang('/m/prop/p1')
    await w.find('.fab').trigger('click')
    await w.findAll('.sheet input')[0].setValue('208')
    await w.findAll('.sheet input')[1].setValue('1600000')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis).toHaveLength(1)
    expect(tulis[0]).toMatchObject({
      nomor: '208', harga: 1_600_000, property_id: 'p1', status: 'kosong',
    })
  })
})

describe('saldo di beranda', () => {
  it('menjumlahkan saldo seluruh properti', async () => {
    usePropertiesStore().items[0] = {
      ...usePropertiesStore().items[0], saldo_awal: 5_000_000, saldo_awal_tgl: '2026-09-01',
    }
    const w = await pasang('/m')
    /* 5.000.000 + 1.800.000 masuk − 450.000 keluar */
    expect(w.text()).toContain('6.350.000')
  })

  it('menandai properti yang belum mengatur saldo awal, bukan diam-diam nol', async () => {
    const w = await pasang('/m')
    expect(w.text()).toContain('belum mengatur saldo awal')
  })
})

describe('ubah pengeluaran dari tab Transaksi', () => {
  it('baris pengeluaran bisa diketuk, baris pemasukan tidak', async () => {
    const w = await pasang('/m/prop/p1')
    await w.findAll('.ptab')[1].trigger('click')
    const baris = w.findAll('[data-tabbody] .lrow, .card.flush.divide .lrow')
    const keluar = baris.find(b => b.text().includes('Token listrik'))!
    const masuk = baris.find(b => b.text().includes('Hizkia'))!
    expect(keluar.element.tagName).toBe('BUTTON')
    expect(masuk.element.tagName).toBe('DIV')
  })

  it('hapus butuh dua ketukan', async () => {
    const dihapus: string[] = []
    usePengeluaranStore().remove = (async (id: string) => { dihapus.push(id) }) as never
    useLogStore().add = (async () => {}) as never

    const w = await pasang('/m/prop/p1')
    await w.findAll('.ptab')[1].trigger('click')
    await w.findAll('.lrow').find(b => b.text().includes('Token listrik'))!.trigger('click')

    const tombol = () => w.findAll('.sheet .btn.block')[0]
    await tombol().trigger('click')
    expect(dihapus).toHaveLength(0)
    expect(tombol().classes()).toContain('danger')

    await tombol().trigger('click')
    await flushPromises()
    expect(dihapus).toEqual(['x1'])
  })

  it('menyimpan perubahan pengeluaran', async () => {
    const tulis: Array<[string, Record<string, unknown>]> = []
    usePengeluaranStore().update = (async (id: string, d: Record<string, unknown>) => {
      tulis.push([id, d])
    }) as never

    const w = await pasang('/m/prop/p1')
    await w.findAll('.ptab')[1].trigger('click')
    await w.findAll('.lrow').find(b => b.text().includes('Token listrik'))!.trigger('click')
    await w.findAll('.sheet input')[0].setValue('500000')
    await w.findAll('.sheet-foot .btn').find(b => b.text() === 'Simpan')!.trigger('click')
    await flushPromises()

    expect(tulis[0][0]).toBe('x1')
    expect(tulis[0][1]).toMatchObject({ jumlah: 500_000 })
  })
})
