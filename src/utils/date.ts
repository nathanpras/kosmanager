import { MONTHS_FULL } from './format'

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function bulanIni(): string {
  const d = new Date()
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * "Maret 2026" -> "2026-03", supaya daftar bulan bisa diurutkan dengan
 * perbandingan string biasa. Mengurutkan nama bulan secara langsung menghasilkan
 * urutan alfabetis (Agustus, April, Desember, ...), bukan kronologis.
 * Nama bulan yang tidak dikenal jatuh ke "0000-00" agar tersingkir ke belakang.
 */
export function bulanKey(bln: string): string {
  const [nama, tahun] = (bln ?? '').split(' ')
  const idx = MONTHS_FULL.indexOf(nama)
  if (idx === -1 || !/^\d{4}$/.test(tahun ?? '')) return '0000-00'
  return `${tahun}-${String(idx + 1).padStart(2, '0')}`
}

/**
 * "2026-03-15" -> "Maret 2026".
 *
 * Diurai secara tekstual, bukan lewat `new Date()`: string ISO tanggal saja
 * diurai sebagai UTC, lalu getter waktu lokal menggesernya mundur di zona waktu
 * negatif — tanggal 1 bisa terbaca sebagai bulan sebelumnya.
 */
export function bulanFromTgl(tgl: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(tgl ?? '')
  if (!m) return null
  const idx = parseInt(m[2], 10) - 1
  if (idx < 0 || idx > 11) return null
  return `${MONTHS_FULL[idx]} ${m[1]}`
}

/** Terbaru dulu. */
export function sortBulanDesc(list: string[]): string[] {
  return [...list].sort((a, b) => bulanKey(b).localeCompare(bulanKey(a)))
}

export function monthsBack(n: number): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(`${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`)
  }
  return result
}
