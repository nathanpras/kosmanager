import { today } from './date'
import { nilaiDibayar } from './saldo'
import type { Tagihan } from '../types'

/**
 * Status sebuah tagihan, tanpa tampilannya.
 *
 * Diangkat dari fungsi lokal di `TagihanView.vue` saat shell mobile mulai
 * membutuhkannya juga. Aturan uang tidak boleh punya dua rumah: begitu ada dua
 * salinan, keduanya pasti berbeda suatu hari, dan yang satu akan salah tanpa
 * ada yang tahu.
 *
 * Label dan kelas CSS sengaja TIDAK ikut ke sini — itu urusan masing-masing
 * tampilan. Desktop memakai "✓ Lunas" dengan kelas `bg`, shell mobile memakai
 * chip "Lunas" dengan kelas `ok`. Yang sama hanya keputusannya.
 */
export type KodeStatusTagihan = 'lunas' | 'kurang' | 'telat' | 'belum'

export interface HasilStatusTagihan {
  status: KodeStatusTagihan
  /** Uang yang benar-benar sudah diterima. */
  dibayar: number
  /** Sisa yang masih harus dibayar. */
  sisa: number
  /** Sudah lewat jatuh tempo dan belum lunas. */
  telat: boolean
}

export function statusTagihan(t: Tagihan, per = today()): HasilStatusTagihan {
  const total = Number(t.jumlah) || 0
  const dibayar = nilaiDibayar(t)
  const telat = !!(t.jatuh_tempo && t.jatuh_tempo < per && t.status !== 'lunas')

  /* Urutan ini penting. "Kurang bayar" diperiksa sebelum "telat": uang yang
     sudah sebagian masuk adalah kabar yang lebih berguna daripada tanggalnya
     lewat, dan `telat` tetap ikut terbawa di hasilnya. */
  if (dibayar >= total && total > 0) return { status: 'lunas', dibayar, sisa: 0, telat: false }
  if (dibayar > 0 && dibayar < total) return { status: 'kurang', dibayar, sisa: total - dibayar, telat }
  if (telat) return { status: 'telat', dibayar: 0, sisa: total, telat: true }
  return { status: 'belum', dibayar: 0, sisa: total, telat: false }
}
