import { usePenghuniStore } from '../stores/penghuni'
import { today } from '../utils/date'
import type { Penghuni } from '../types'

function masihAktif(p: Penghuni, per: string): boolean {
  return !p.kontrak_selesai || p.kontrak_selesai >= per
}

/**
 * Hunian kamar diturunkan dari koleksi `penghuni`, bukan ditulis manual.
 *
 * Sebelumnya status kamar di-flip di beberapa tempat sekaligus (tambah penghuni,
 * pindah kamar, keluarkan penghuni) dan sebagian mencari kamar tanpa menyaring
 * `property_id`. Begitu satu kamar boleh diisi dua orang, cara itu ikut
 * mengosongkan kamar yang roommate-nya masih tinggal.
 */
export function useOccupancy() {
  const penghuni = usePenghuniStore()

  /** Penghuni aktif di sebuah kamar, urut tanggal masuk (terlama dulu). */
  function penghuniDiKamar(nomor: string, property_id: string, per = today()): Penghuni[] {
    return penghuni.items
      .filter(p => p.kamar === nomor && p.property_id === property_id && masihAktif(p, per))
      .sort((a, b) => (a.masuk ?? '').localeCompare(b.masuk ?? ''))
  }

  function jumlahPenghuni(nomor: string, property_id: string, per = today()): number {
    return penghuniDiKamar(nomor, property_id, per).length
  }

  /**
   * Apakah kamar masih dihuni bila penghuni `kecualiId` dikeluarkan?
   * Dipakai sebelum menandai kamar kosong, supaya roommate tidak ikut terhapus.
   */
  function kamarMasihTerisi(nomor: string, property_id: string, kecualiId?: string): boolean {
    return penghuniDiKamar(nomor, property_id).some(p => p.id !== kecualiId)
  }

  return { penghuniDiKamar, jumlahPenghuni, kamarMasihTerisi }
}
