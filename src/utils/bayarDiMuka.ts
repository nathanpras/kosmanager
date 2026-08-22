import { MONTHS_FULL } from './format'

/** Deret label bulan berturut-turut mulai dari `mulai`, sebanyak `n`. */
export function bulanBerurutan(mulai: string, n: number): string[] {
  const [nama, tahun] = (mulai ?? '').split(' ')
  const idx = MONTHS_FULL.indexOf(nama)
  if (idx === -1 || !/^\d{4}$/.test(tahun ?? '')) return []
  const th = parseInt(tahun, 10)
  return Array.from({ length: Math.max(0, n) }, (_, i) => {
    const m = idx + i
    return `${MONTHS_FULL[m % 12]} ${th + Math.floor(m / 12)}`
  })
}

/**
 * Membagi diskon bayar di muka rata ke seluruh bulan dalam batch.
 *
 * Sisa pembulatan dibebankan ke bulan terakhir supaya jumlah seluruh tagihan
 * **persis** sama dengan uang yang diterima — kalau meleset satu rupiah pun,
 * salah satu bulan akan terlihat kurang bayar selamanya.
 */
export function bagiDiskon(jumlah: number[], diskon: number): number[] {
  const n = jumlah.length
  const d = Number(diskon) || 0
  if (n === 0 || d === 0) return [...jumlah]
  const per = Math.round(d / n)
  const hasil = jumlah.map(j => j - per)
  hasil[n - 1] += per * n - d
  return hasil
}
