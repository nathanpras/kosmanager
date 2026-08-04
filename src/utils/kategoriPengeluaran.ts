export interface KategoriPengeluaran {
  nama: string
  ikon: string
  warna: string
}

/**
 * Kategori pengeluaran beserta ikon dan warnanya.
 *
 * Enam kategori pertama adalah daftar lama dan **tidak boleh dihapus** —
 * `pengeluaran.kategori` menyimpan nama kategori sebagai teks, jadi menghapus
 * satu entri akan membuat transaksi lama kehilangan ikon dan warnanya.
 * Menambah entri baru selalu aman.
 */
export const KATEGORI_PENGELUARAN: KategoriPengeluaran[] = [
  // --- daftar lama, dipertahankan ---
  { nama: 'Listrik',        ikon: '⚡', warna: '#0070C0' },
  { nama: 'Air',            ikon: '💧', warna: '#3B7BF5' },
  { nama: 'Internet',       ikon: '🌐', warna: '#7C3AED' },
  { nama: 'Kebersihan',     ikon: '🧹', warna: '#059669' },
  { nama: 'Perbaikan',      ikon: '🔧', warna: '#B38600' },
  // --- tambahan ---
  { nama: 'Deposit Balik',  ikon: '💵', warna: '#DC4A4A' },
  { nama: 'Gaji Pembantu',  ikon: '🧺', warna: '#0891B2' },
  { nama: 'Gaji Pengurus',  ikon: '👔', warna: '#4F46E5' },
  { nama: 'Iuran',          ikon: '🏘️', warna: '#D97706' },
  { nama: 'Transfer Tanah', ikon: '🏦', warna: '#065F46' },
  { nama: 'Pajak',          ikon: '📄', warna: '#9333EA' },
  { nama: 'Lainnya',        ikon: '📦', warna: '#737373' },
]

const PETA = new Map(KATEGORI_PENGELUARAN.map(k => [k.nama, k]))

export const NAMA_KATEGORI = KATEGORI_PENGELUARAN.map(k => k.nama)

/** Kategori tak dikenal tetap tampil rapi, bukan kosong. */
export function katIkon(nama: string): string {
  return PETA.get(nama)?.ikon ?? '📦'
}

export function katWarna(nama: string): string {
  return PETA.get(nama)?.warna ?? '#737373'
}
