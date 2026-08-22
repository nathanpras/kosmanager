import { usePenghuniStore } from '../stores/penghuni'
import { today } from '../utils/date'
import { rentangHuni } from '../utils/billing'
import type { PenghuniBulan } from '../utils/billing'
import type { Penghuni } from '../types'

/**
 * Tanggal keluar penghuni.
 *
 * Kos ini tidak berkontrak: penghuni lanjut terus sampai suatu hari pamit, jadi
 * `kontrak_selesai` sebenarnya tanggal keluar. Namanya diganti, tapi dokumen
 * lama di Firestore masih memakai nama lama — dibaca lewat sini supaya tidak
 * perlu migrasi data.
 */
export function tglKeluar(p: Pick<Penghuni, 'tgl_keluar' | 'kontrak_selesai'>): string | undefined {
  return p.tgl_keluar ?? p.kontrak_selesai
}

export function sudahKeluar(p: Penghuni, per = today()): boolean {
  const k = tglKeluar(p)
  return !!k && k < per
}

export function toPenghuniBulan(p: Penghuni): PenghuniBulan {
  return { id: p.id, nama: p.nama, masuk: p.masuk, tgl_keluar: tglKeluar(p) }
}

function masihAktif(p: Penghuni, per: string): boolean {
  const k = tglKeluar(p)
  return !k || k >= per
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

  /**
   * Semua penghuni yang punya minimal satu hari di `bulan`, termasuk yang sudah
   * keluar. Inilah yang harus dipakai untuk menghitung tagihan —
   * `penghuniDiKamar` menyaring dengan tanggal hari ini, sehingga penghuni yang
   * sudah keluar hilang dari tagihan bulan lampau.
   */
  function penghuniDiBulan(nomor: string, property_id: string, bulan: string): Penghuni[] {
    return penghuni.items
      .filter(p => p.kamar === nomor && p.property_id === property_id
        && rentangHuni(toPenghuniBulan(p), bulan) !== null)
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

  return { penghuniDiKamar, penghuniDiBulan, jumlahPenghuni, kamarMasihTerisi }
}
