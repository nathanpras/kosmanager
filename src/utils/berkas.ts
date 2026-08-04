/**
 * Menyimpan berkas dari dalam browser.
 *
 * `<a download>` tidak bisa diandalkan di iOS Safari — sering tidak terjadi
 * apa-apa yang terlihat, sehingga alur yang menunggu unduhan selesai akan macet
 * selamanya di HP. Web Share API adalah jalur yang benar di sana: memunculkan
 * lembar berbagi sehingga berkas bisa disimpan ke Files, dikirim ke WhatsApp,
 * atau ke iCloud Drive.
 *
 * Urutannya: coba Web Share dulu (kalau perangkat sanggup berbagi berkas),
 * baru jatuh ke unduhan biasa.
 *
 * @returns cara yang akhirnya dipakai, supaya pemanggil bisa memberi petunjuk
 *          yang sesuai — "cek folder Unduhan" vs "pilih tempat menyimpan".
 */
export type CaraSimpan = 'share' | 'unduh'

export async function simpanBerkas(
  namaBerkas: string,
  isi: string,
  tipe = 'application/json',
): Promise<CaraSimpan> {
  const blob = new Blob([isi], { type: tipe })

  const file = new File([blob], namaBerkas, { type: tipe })
  // canShare({files}) harus dicek — beberapa browser punya navigator.share
  // tapi menolak berkas, dan share() akan melempar setelah terlanjur dipanggil.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: namaBerkas })
      return 'share'
    } catch (e) {
      // Pengguna membatalkan lembar berbagi — itu bukan kegagalan, dan tidak
      // boleh diam-diam berubah jadi unduhan yang tak diminta.
      if (e instanceof DOMException && e.name === 'AbortError') throw e
      // Kegagalan lain: lanjut ke unduhan biasa.
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaBerkas
  a.click()
  // Pencabutan ditunda: Safari membutuhkan URL-nya masih hidup saat unduhan mulai.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'unduh'
}

/** Satu sel CSV, aman untuk koma, tanda kutip, dan baris baru. */
export function selCsv(nilai: unknown): string {
  if (nilai == null) return ''
  const s = String(nilai)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Mengubah daftar objek menjadi CSV.
 *
 * Diawali BOM UTF-8 supaya Excel di Windows tidak merusak huruf beraksen dan
 * tanda rupiah — tanpa itu berkasnya terbaca sebagai teks kacau.
 */
export function keCsv<T extends Record<string, unknown>>(
  baris: T[],
  kolom: { kunci: keyof T; judul: string }[],
): string {
  const kepala = kolom.map(k => selCsv(k.judul)).join(',')
  const isi = baris.map(r => kolom.map(k => selCsv(r[k.kunci])).join(','))
  return '﻿' + [kepala, ...isi].join('\r\n')
}
