import { MONTHS_FULL } from './format'

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

/** Tanggal 1 bulan tersebut, format YYYY-MM-DD. */
function tglAwalBulan(bulan: string, hari: number): string {
  const [nama, tahun] = bulan.split(' ')
  const idx = MONTHS_FULL.indexOf(nama)
  return `${tahun}-${String(idx + 1).padStart(2, '0')}-${String(hari).padStart(2, '0')}`
}

/** Apakah tanggal ISO `tgl` berada di dalam label `bulan`. */
function masukDiBulanIni(tgl: string | undefined, bulan: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl ?? '')
  if (!m) return null
  const [nama, tahun] = (bulan ?? '').split(' ')
  const idx = MONTHS_FULL.indexOf(nama)
  if (idx === -1) return null
  if (m[1] !== tahun || parseInt(m[2], 10) !== idx + 1) return null
  return parseInt(m[3], 10)
}

export interface HitungTagihanInput {
  bulan: string
  harga: number
  jumlahPenghuni: number
  nominalTambahan?: number
  /** Tanggal masuk penghuni. Prorata hanya aktif bila jatuh di dalam `bulan`. */
  masuk?: string
  /** Tanggal jatuh tempo untuk bulan biasa. */
  tglJatuhTempo?: number
}

export interface HasilTagihan {
  jumlah: number
  jatuh_tempo: string
  is_prorated?: boolean
  prorated_hari?: number
}

/**
 * Menghitung satu tagihan bulanan untuk sebuah kamar.
 *
 * Bulan masuk ditagih pro rata: tarif dibagi jumlah hari dalam bulan, dikalikan
 * sisa hari terhitung inklusif dari tanggal masuk sampai akhir bulan. Tambahan
 * penghuni ikut diprorata karena sudah termasuk di dalam tarif.
 *
 * Jatuh tempo bulan masuk memakai tanggal masuk itu sendiri — memaksanya ke
 * tanggal 1 akan membuat tagihan langsung berstatus telat begitu dibuat.
 */
export function hitungTagihan(input: HitungTagihanInput): HasilTagihan {
  const {
    bulan, harga, jumlahPenghuni,
    nominalTambahan = DEFAULT_NOMINAL_TAMBAHAN,
    masuk,
    tglJatuhTempo = DEFAULT_TGL_JATUH_TEMPO,
  } = input

  const tarif = tarifBulanan(harga, jumlahPenghuni, nominalTambahan)
  const totalHari = hariDalamBulan(bulan)
  const tglMasuk = masukDiBulanIni(masuk, bulan)

  // Bulan biasa: tarif penuh, jatuh tempo mengikuti pengaturan.
  if (tglMasuk === null || totalHari === 0 || tglMasuk <= 1) {
    const hari = Math.min(Math.max(1, tglJatuhTempo), totalHari || 28)
    return { jumlah: tarif, jatuh_tempo: tglAwalBulan(bulan, hari) }
  }

  const hariDitagih = totalHari - tglMasuk + 1
  return {
    jumlah: Math.round(tarif / totalHari * hariDitagih),
    jatuh_tempo: masuk!,
    is_prorated: true,
    prorated_hari: hariDitagih,
  }
}
