import { today } from './date'

/**
 * Lama seseorang sudah menghuni, dalam bahasa manusia.
 *
 * Tanggal ISO diurai secara tekstual, lalu dibangun ulang dari angkanya.
 * `new Date('2026-09-20')` diperlakukan sebagai UTC tengah malam, sehingga di
 * zona waktu Indonesia hasilnya bisa mundur satu hari — aturan yang sudah lama
 * berlaku di proyek ini.
 *
 * Di bawah sebulan disebut dalam hari atau minggu, karena "0 bulan" bukan
 * jawaban. Di atasnya disebut dalam bulan penuh: selisih bulan kalender,
 * dikurangi satu bila tanggalnya belum lewat — supaya 20 Agustus ke 19
 * September tidak diklaim sudah sebulan.
 */
export function lamaHuni(dari: string, sampai: string = today()): string {
  if (!dari || !sampai) return '–'

  const [y1, m1, d1] = dari.split('-').map(Number)
  const [y2, m2, d2] = sampai.split('-').map(Number)
  if (!y1 || !y2) return '–'

  const a = new Date(y1, m1 - 1, d1)
  const b = new Date(y2, m2 - 1, d2)
  if (a > b) return 'Belum mulai'

  const hari = Math.round((b.getTime() - a.getTime()) / 864e5)

  /* Selisih bulan kalender, dikoreksi bila tanggalnya belum sampai. */
  let bulan = (y2 - y1) * 12 + (m2 - m1)
  if (d2 < d1) bulan--

  if (bulan < 1) {
    const minggu = Math.floor(hari / 7)
    const sisa = hari % 7
    if (!minggu) return `${hari} hari`
    return sisa ? `${minggu} minggu ${sisa} hari` : `${minggu} minggu`
  }

  /* Sisa hari dihitung dari tanggal yang sama `bulan` bulan setelah masuk.
     Bulan pendek ditahan supaya 31 Januari + 1 bulan tidak melompat ke Maret. */
  const hariDiBulan = new Date(y1, m1 - 1 + bulan + 1, 0).getDate()
  const patokan = new Date(y1, m1 - 1 + bulan, Math.min(d1, hariDiBulan))
  const sisaHari = Math.round((b.getTime() - patokan.getTime()) / 864e5)

  return sisaHari > 0 ? `${bulan} bulan ${sisaHari} hari` : `${bulan} bulan`
}
