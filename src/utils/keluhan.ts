import type { Maintenance } from '../types'

export interface JenisKeluhan {
  nama: string
  ikon: string
  warna: string
}

/**
 * Jenis keluhan yang biasa masuk dari penghuni.
 *
 * Disimpan sebagai teks di `maintenance.jenis`, sama seperti kategori
 * pengeluaran — menambah entri aman, menghapus entri membuat laporan lama
 * kehilangan ikonnya.
 */
export const JENIS_KELUHAN: JenisKeluhan[] = [
  { nama: 'AC',           ikon: '❄️', warna: '#0891B2' },
  { nama: 'Listrik',      ikon: '💡', warna: '#B38600' },
  { nama: 'Air',          ikon: '🚿', warna: '#3B7BF5' },
  { nama: 'WiFi',         ikon: '📶', warna: '#7C3AED' },
  { nama: 'Pintu/Kunci',  ikon: '🔑', warna: '#D97706' },
  { nama: 'Kamar Mandi',  ikon: '🚽', warna: '#059669' },
  { nama: 'Perabot',      ikon: '🪑', warna: '#92400E' },
  { nama: 'Kebersihan',   ikon: '🧹', warna: '#16A34A' },
  { nama: 'Lainnya',      ikon: '🔧', warna: '#737373' },
]

const PETA = new Map(JENIS_KELUHAN.map(j => [j.nama, j]))

export const NAMA_JENIS = JENIS_KELUHAN.map(j => j.nama)

export function jenisIkon(nama: string | undefined): string {
  return PETA.get(nama ?? '')?.ikon ?? '🔧'
}

export function jenisWarna(nama: string | undefined): string {
  return PETA.get(nama ?? '')?.warna ?? '#737373'
}

/**
 * Berapa hari sebuah keluhan ditangani. `null` bila belum selesai atau
 * tanggalnya tidak terbaca.
 *
 * Dihitung tekstual lewat Date.UTC agar tidak tergeser zona waktu — sama
 * seperti alasan di bulanFromTgl.
 */
export function durasiHari(tgl: string | undefined, tglSelesai: string | undefined): number | null {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl ?? '')
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tglSelesai ?? '')
  if (!a || !b) return null
  const ms = Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3])
  const hari = Math.round(ms / 86_400_000)
  return hari < 0 ? null : hari
}

/** "3 hari", "hari yang sama", atau null bila belum selesai. */
export function labelDurasi(m: Pick<Maintenance, 'tgl' | 'tgl_selesai'>): string | null {
  const h = durasiHari(m.tgl, m.tgl_selesai)
  if (h === null) return null
  return h === 0 ? 'hari yang sama' : `${h} hari`
}

/**
 * Baris ringkas seperti yang diminta pemilik:
 * "105 · ❄️ AC · 23 Maret 2026 · AC panas"
 */
export function ringkasKeluhan(
  m: Pick<Maintenance, 'kamar' | 'jenis' | 'tgl' | 'deskripsi'>,
  fmtTanggal: (s: string) => string,
): string {
  const bagian = [
    m.kamar,
    m.jenis ? `${jenisIkon(m.jenis)} ${m.jenis}` : null,
    m.tgl ? fmtTanggal(m.tgl) : null,
    m.deskripsi,
  ].filter(Boolean)
  return bagian.join(' · ')
}
