import { MONTHS_FULL } from './format'
import { bulanKey } from './date'

export const DEFAULT_NOMINAL_TAMBAHAN = 300_000
export const DEFAULT_TGL_JATUH_TEMPO = 1

/** Jumlah hari dalam "Maret 2026". 0 bila label bulannya tidak dikenal. */
export function hariDalamBulan(bulan: string): number {
  const [nama, tahun] = (bulan ?? '').split(' ')
  const idx = MONTHS_FULL.indexOf(nama)
  if (idx === -1 || !/^\d{4}$/.test(tahun ?? '')) return 0
  // Tanggal 0 bulan berikutnya = hari terakhir bulan ini.
  return new Date(parseInt(tahun, 10), idx + 1, 0).getDate()
}

/**
 * Tarif sebulan penuh untuk satu kamar.
 *
 * Tambahan dikenakan **per orang di atas penghuni pertama**: dua orang menambah
 * satu kali, tiga orang menambah dua kali.
 *
 * Tidak dipakai produksi lagi — hitungBagian() yang merakit tagihan. Dipertahankan
 * sebagai pembanding independen di tes: totalnya harus persis sama dengan jumlah
 * seluruh bagian ketika semua orang menghuni sebulan penuh.
 */
export function tarifBulanan(
  harga: number,
  jumlahPenghuni: number,
  nominalTambahan: number,
): number {
  const dasar = Number(harga) || 0
  const extra = Math.max(0, (Number(jumlahPenghuni) || 0) - 1)
  return dasar + extra * (Number(nominalTambahan) || 0)
}

/** Tanggal ke-`hari` pada label bulan tersebut, format YYYY-MM-DD. */
export function tglDiBulan(bulan: string, hari: number): string {
  const [nama, tahun] = (bulan ?? '').split(' ')
  const idx = MONTHS_FULL.indexOf(nama)
  return `${tahun}-${String(idx + 1).padStart(2, '0')}-${String(hari).padStart(2, '0')}`
}

export interface PenghuniBulan {
  id: string
  nama: string
  masuk: string
  /** Tanggal keluar, inklusif. Kosong berarti masih tinggal. */
  tgl_keluar?: string
}

export interface RentangHuni {
  dari: number
  sampai: number
  hari: number
}

export interface BagianTagihan {
  penghuni_id: string
  nama: string
  dari: number
  sampai: number
  hari: number
  jumlah: number
  /** 'penanggung' bila ia menanggung harga kamar minimal satu hari. */
  peran: 'penanggung' | 'tambahan'
}

/**
 * Potongan rentang huni seseorang di dalam satu bulan, inklusif di kedua ujung.
 * null bila ia tidak punya satu hari pun di bulan itu.
 */
export function rentangHuni(p: PenghuniBulan, bulan: string): RentangHuni | null {
  const totalHari = hariDalamBulan(bulan)
  if (totalHari === 0) return null
  const kunci = bulanKey(bulan)
  const awal = `${kunci}-01`
  const akhir = `${kunci}-${String(totalHari).padStart(2, '0')}`

  const mulai   = p.masuk && p.masuk > awal ? p.masuk : awal
  const selesai = p.tgl_keluar && p.tgl_keluar < akhir ? p.tgl_keluar : akhir
  // Perbandingan string ISO cukup: rentang yang jatuh di luar bulan ini
  // menghasilkan mulai > selesai.
  if (mulai > selesai) return null

  const dari = parseInt(mulai.slice(8, 10), 10)
  const sampai = parseInt(selesai.slice(8, 10), 10)
  return { dari, sampai, hari: sampai - dari + 1 }
}

/**
 * Membagi tagihan sebuah kamar dalam satu bulan menjadi bagian per penghuni.
 *
 * Untuk setiap hari, penghuni dengan tanggal masuk terlama di antara yang hadir
 * hari itu menanggung harga kamar; setiap orang lain yang hadir menanggung satu
 * nominal tambahan. Dengan begitu penghuni yang keluar atau masuk di tengah
 * bulan hanya membayar hari yang benar-benar ia tempati, dan tambahan ikut
 * diprorata — dua hal yang tidak bisa diungkapkan oleh satu tagihan per kamar.
 *
 * Nominal dihitung sekali dari total hari (`tarif * hari / totalHari`), bukan
 * dengan menjumlahkan pembulatan harian, supaya tidak ada selisih rupiah yang
 * menumpuk.
 */
export function hitungBagian(input: {
  bulan: string
  harga: number
  nominalTambahan: number
  penghuni: PenghuniBulan[]
}): BagianTagihan[] {
  const totalHari = hariDalamBulan(input.bulan)
  if (totalHari === 0) return []
  const harga = Number(input.harga) || 0
  const tambahan = Number(input.nominalTambahan) || 0

  const hadir = input.penghuni
    .map(p => ({ p, r: rentangHuni(p, input.bulan) }))
    .filter((x): x is { p: PenghuniBulan; r: RentangHuni } => x.r !== null)
    // Terlama dulu. Tanggal masuk sama diurut id supaya hasilnya deterministik.
    .sort((a, b) => (a.p.masuk ?? '').localeCompare(b.p.masuk ?? '') || a.p.id.localeCompare(b.p.id))

  const hariPenanggung = hadir.map(() => 0)
  const hariTambahan = hadir.map(() => 0)

  for (let d = 1; d <= totalHari; d++) {
    const adaHariIni: number[] = []
    for (let i = 0; i < hadir.length; i++) {
      if (hadir[i].r.dari <= d && d <= hadir[i].r.sampai) adaHariIni.push(i)
    }
    if (adaHariIni.length === 0) continue
    hariPenanggung[adaHariIni[0]]++
    for (const i of adaHariIni.slice(1)) hariTambahan[i]++
  }

  return hadir.map(({ p, r }, i) => ({
    penghuni_id: p.id,
    nama: p.nama,
    dari: r.dari,
    sampai: r.sampai,
    hari: r.hari,
    jumlah: Math.round(harga * hariPenanggung[i] / totalHari)
      + Math.round(tambahan * hariTambahan[i] / totalHari),
    peran: hariPenanggung[i] > 0 ? 'penanggung' as const : 'tambahan' as const,
  }))
}
