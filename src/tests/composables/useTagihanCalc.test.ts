import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTagihanCalc } from '../../composables/useTagihanCalc'
import type { DraftTagihan } from '../../composables/useTagihanCalc'
import { usePenghuniStore } from '../../stores/penghuni'
import { useKamarStore } from '../../stores/kamar'
import { useSettingsStore } from '../../stores/settings'
import type { Penghuni, Kamar } from '../../types'

function huni(over: Partial<Penghuni> & { id: string }): Penghuni {
  return {
    nama: `Orang ${over.id}`, kamar: '101', hp: '08123456789', masuk: '2026-01-01',
    property_id: 'p1', ...over,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  useKamarStore().items = [
    { id: 'k1', nomor: '101', tipe: 'A', harga: 1_500_000, status: 'terisi', property_id: 'p1' },
    { id: 'k2', nomor: '201', tipe: 'B', harga: 2_000_000, status: 'kosong', property_id: 'p1' },
  ] as Kamar[]
  useSettingsStore().data = { tgl_jatuh_tempo: 1, nominal_tambahan: 300_000 }
})

describe('tagihanUntukKamar', () => {
  it('menggabung dua penghuni sebulan penuh menjadi satu tagihan', () => {
    usePenghuniStore().items = [huni({ id: 'a' }), huni({ id: 'b', masuk: '2026-02-01' })]
    const draft: DraftTagihan[] = useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')
    expect(draft).toHaveLength(1)
    expect(draft[0]).toMatchObject({
      penghuni: 'Orang a', penghuni_id: 'a', kamar: '101', bulan: 'Maret 2026',
      jumlah: 1_800_000, jatuh_tempo: '2026-03-01',
    })
    expect(draft[0].is_prorated).toBeFalsy()
  })

  it('tetap satu tagihan saat penghuni kedua masuk tengah bulan', () => {
    usePenghuniStore().items = [huni({ id: 'a' }), huni({ id: 'b', masuk: '2026-03-15' })]
    const draft = useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')
    expect(draft).toHaveLength(1)
    expect(draft[0].jumlah).toBe(1_664_516)
  })

  it('memecah per orang saat ada yang keluar tengah bulan', () => {
    usePenghuniStore().items = [
      huni({ id: 'a', tgl_keluar: '2026-03-10' }),
      huni({ id: 'b', masuk: '2026-03-15' }),
    ]
    const draft = useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')
    expect(draft).toHaveLength(2)
    expect(draft.map(d => d.penghuni_id)).toEqual(['a', 'b'])
    expect(draft.map(d => d.jumlah)).toEqual([483_871, 822_581])
    expect(draft[0]).toMatchObject({ dari: '2026-03-01', sampai: '2026-03-10', hari: 10, is_prorated: true })
    expect(draft[1]).toMatchObject({ dari: '2026-03-15', sampai: '2026-03-31', hari: 17, jatuh_tempo: '2026-03-15' })
  })

  it('memakai tanggal masuk sebagai jatuh tempo di bulan masuk', () => {
    usePenghuniStore().items = [huni({ id: 'a', masuk: '2026-03-15' })]
    const draft = useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')
    expect(draft[0].jatuh_tempo).toBe('2026-03-15')
    expect(draft[0].is_prorated).toBe(true)
  })

  it('mengembalikan array kosong untuk kamar kosong di bulan itu', () => {
    usePenghuniStore().items = [huni({ id: 'a', masuk: '2026-06-01' })]
    expect(useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')).toEqual([])
  })

  it('memakai nominal_tambahan milik kamar bila diisi', () => {
    useKamarStore().items[0].nominal_tambahan = 500_000
    usePenghuniStore().items = [huni({ id: 'a' }), huni({ id: 'b' })]
    expect(useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')[0].jumlah).toBe(2_000_000)
  })
})

// Aturan pindah yang dipilih pemilik: bulan berjalan ditagih kamar lama PENUH,
// kamar baru mulai ditagih tanggal 1 bulan berikutnya, sisa hari di kamar baru
// tidak ditagih sama sekali. Tidak ada prorata karena pindah.
describe('tagihanUntukKamar setelah pindah kamar', () => {
  const pindah = huni({
    id: 'a', kamar: '201', masuk: '2026-01-01',
    riwayat_kamar: [
      { kamar: '101', sejak: '2026-01-01' },
      { kamar: '201', sejak: '2026-04-01' },
    ],
  })

  it('bulan pindahan ditagih kamar lama sebulan penuh, bukan prorata', () => {
    usePenghuniStore().items = [pindah]
    const { tagihanUntukKamar } = useTagihanCalc()
    const lama = tagihanUntukKamar('101', 'p1', 'Maret 2026')
    expect(lama).toHaveLength(1)
    expect(lama[0]).toMatchObject({ kamar: '101', jumlah: 1_500_000, hari: 31 })
    expect(lama[0].is_prorated).toBeFalsy()
    expect(tagihanUntukKamar('201', 'p1', 'Maret 2026')).toEqual([])
  })

  it('bulan berikutnya ditagih kamar baru dengan harga kamar baru', () => {
    usePenghuniStore().items = [pindah]
    const { tagihanUntukKamar } = useTagihanCalc()
    expect(tagihanUntukKamar('101', 'p1', 'April 2026')).toEqual([])
    expect(tagihanUntukKamar('201', 'p1', 'April 2026')[0]).toMatchObject({
      kamar: '201', jumlah: 2_000_000,
    })
  })

  it('kamar lama yang ditinggalkan tetap menagih roommate yang masih tinggal', () => {
    usePenghuniStore().items = [pindah, huni({ id: 'b', kamar: '101', masuk: '2026-02-01' })]
    const { tagihanUntukKamar } = useTagihanCalc()
    // Maret: berdua di 101 -> satu tagihan gabungan atas nama penanggung.
    expect(tagihanUntukKamar('101', 'p1', 'Maret 2026')[0].jumlah).toBe(1_800_000)
    // April: si pindahan sudah pergi, tinggal satu orang -> tanpa tambahan.
    expect(tagihanUntukKamar('101', 'p1', 'April 2026')[0]).toMatchObject({
      penghuni_id: 'b', jumlah: 1_500_000,
    })
  })
})
