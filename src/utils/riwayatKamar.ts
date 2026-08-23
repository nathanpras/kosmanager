import { bulanKey } from './date'

/**
 * Satu baris riwayat kamar: penghuni menempati `kamar` terhitung sejak `sejak`
 * (format YYYY-MM-DD, inklusif) sampai entri berikutnya.
 */
export interface EntriKamar {
  kamar: string
  sejak: string
}

/** Bentuk minimal yang dibutuhkan resolver — supaya bisa diuji tanpa store. */
export interface PunyaKamar {
  kamar: string
  masuk?: string
  riwayat_kamar?: EntriKamar[]
}

/**
 * Riwayat yang sudah bersih: dibuang yang kosong, diurutkan naik.
 *
 * Firestore tidak menjamin urutan array setelah patch parsial, jadi jangan
 * pernah berasumsi tersimpan terurut.
 */
function terurut(p: PunyaKamar): EntriKamar[] {
  return (p.riwayat_kamar ?? [])
    .filter(e => !!e?.kamar && !!e?.sejak)
    .slice()
    .sort((a, b) => a.sejak.localeCompare(b.sejak))
}

/**
 * Kamar yang ditempati penghuni pada tanggal tertentu.
 *
 * Tanpa riwayat, jawabannya `penghuni.kamar` — itu yang membuat fitur ini
 * kompatibel mundur tanpa skrip migrasi: seluruh data lama berperilaku persis
 * seperti sebelumnya. Tanggal sebelum entri pertama memakai kamar awal, bukan
 * kamar sekarang, supaya bulan lampau tidak ikut berpindah.
 */
export function kamarPada(p: PunyaKamar, tgl: string): string {
  const r = terurut(p)
  if (r.length === 0) return p.kamar
  let hasil = r[0].kamar
  for (const e of r) if (e.sejak <= tgl) hasil = e.kamar
  return hasil
}

/**
 * Kamar yang ditagihkan untuk sebuah bulan ("Maret 2026").
 *
 * Dipatok ke tanggal 1: pemilik memutuskan pindah tengah bulan tetap ditagih
 * kamar lama sebulan penuh, kamar baru mulai ditagih tanggal 1 bulan berikutnya.
 * Aturan itu jadi benar dengan sendirinya karena entri pindah selalu ditulis
 * dengan `sejak` = tanggal 1.
 */
export function kamarDiBulan(p: PunyaKamar, bulan: string): string {
  const key = bulanKey(bulan)
  if (key === '0000-00') return p.kamar
  return kamarPada(p, `${key}-01`)
}

/** "2026-08-15" -> "2026-09-01". Diurai tekstual, bukan lewat new Date(). */
export function awalBulanBerikutnya(tgl: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(tgl ?? '')
  if (!m) return ''
  let tahun = parseInt(m[1], 10)
  let bulan = parseInt(m[2], 10) + 1
  if (bulan > 12) { bulan = 1; tahun += 1 }
  return `${tahun}-${String(bulan).padStart(2, '0')}-01`
}

/** Entri berurutan dengan kamar sama tidak menambah informasi apa pun. */
function rapikan(r: EntriKamar[]): EntriKamar[] {
  return r.filter((e, i) => i === 0 || e.kamar !== r[i - 1].kamar)
}

/**
 * Riwayat baru setelah penghuni pindah ke `kamarBaru` terhitung `efektif`.
 *
 * Riwayat yang masih kosong diisi dulu dengan kamar asal sejak tanggal masuk —
 * tanpa jangkar itu, bulan-bulan sebelum pindahan ikut terbaca sebagai kamar
 * baru. Pindahan lain yang `sejak`-nya sama atau lebih baru ditimpa, supaya
 * pindah dua kali dalam bulan yang sama tidak meninggalkan entri hantu.
 */
export function catatPindah(p: PunyaKamar, kamarBaru: string, efektif: string): EntriKamar[] {
  const dasar = terurut(p)
  const awal: EntriKamar[] = dasar.length > 0
    ? dasar
    : [{ kamar: p.kamar, sejak: p.masuk ?? efektif }]
  const sebelum = awal.filter(e => e.sejak < efektif)
  return rapikan([...sebelum, { kamar: kamarBaru, sejak: efektif }])
}

/**
 * Riwayat setelah kamar dikoreksi lewat form Edit.
 *
 * Mengganti kamar di form adalah **pembetulan salah input**, bukan pindahan:
 * entri terakhir ditulis ulang sehingga tidak ada jejak kamar yang sebenarnya
 * tidak pernah ditempati. Pindahan sungguhan lewat catatPindah().
 */
export function koreksiKamar(p: PunyaKamar, kamarBaru: string): EntriKamar[] {
  const r = terurut(p)
  if (r.length === 0) return []
  return rapikan([...r.slice(0, -1), { kamar: kamarBaru, sejak: r[r.length - 1].sejak }])
}
