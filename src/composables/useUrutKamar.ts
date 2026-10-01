import { useKamarStore } from '../stores/kamar'
import { usePropertiesStore } from '../stores/properties'
import type { Kamar } from '../types'

/**
 * Urutan kamar yang dipakai seluruh aplikasi.
 *
 * Kamar diurut per kategori dulu — mengikuti urutan kategori yang ditetapkan
 * pemilik — baru per nomor secara numerik, supaya "10" jatuh setelah "9" dan
 * bukan setelah "1". Kategori yang tidak dikenal dilempar ke belakang alih-alih
 * ke depan: `indexOf` mengembalikan -1, dan tanpa penjagaan itu kamar tak
 * berkategori akan selalu tampil paling atas.
 *
 * Sebelumnya fungsi ini ada tiga salinan — di TagihanView, PenghuniView, dan
 * LaporanView — dan sudah mulai berbeda satu sama lain (yang satu menjaga
 * `kamar` yang kosong, dua lainnya tidak). Shell mobile butuh urutan yang sama,
 * dan salinan keempat hanya akan memperbesar selisihnya.
 */
export function useUrutKamar() {
  const kamarStore = useKamarStore()
  const properties = usePropertiesStore()

  function indeksKategori(nomor: string, property_id: string): number {
    const daftar = [...properties.kategori.map(k => k.nama), 'Lainnya']
    const k = kamarStore.items.find(x => x.nomor === nomor && x.property_id === property_id)
    const i = daftar.indexOf(k?.kategori ?? 'Lainnya')
    return i === -1 ? 999 : i
  }

  function banding(
    a: { nomor: string; property_id: string },
    b: { nomor: string; property_id: string },
  ): number {
    const ia = indeksKategori(a.nomor, a.property_id)
    const ib = indeksKategori(b.nomor, b.property_id)
    if (ia !== ib) return ia - ib
    return (a.nomor ?? '').localeCompare(b.nomor ?? '', undefined, { numeric: true })
  }

  /** Untuk apa pun yang menyimpan nomor kamar di field `kamar` — tagihan, penghuni. */
  function urutkan<T extends { kamar: string; property_id: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => banding(
      { nomor: a.kamar, property_id: a.property_id },
      { nomor: b.kamar, property_id: b.property_id },
    ))
  }

  /** Untuk dokumen Kamar sendiri, yang nomornya ada di field `nomor`. */
  function urutkanKamar(items: Kamar[]): Kamar[] {
    return [...items].sort(banding)
  }

  return { urutkan, urutkanKamar }
}
