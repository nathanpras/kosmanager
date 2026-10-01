import { useTagihanStore } from '../stores/tagihan'
import { useLogStore } from '../stores/log'
import { deleteField } from '../firebase'
import type { Tagihan } from '../types'

/**
 * Mencatat dan membatalkan pembayaran sebuah tagihan.
 *
 * Diangkat dari TagihanView saat shell mobile butuh menulis hal yang sama.
 * Aturan "berapa yang dibayar menentukan statusnya" harus satu, bukan dua
 * salinan yang kebetulan setara hari ini.
 *
 * Toast tidak diurus di sini: desktop dan shell mobile memberi kabar dengan
 * cara masing-masing. Yang dibagi hanya penulisannya.
 */
export function useBayarTagihan() {
  const tagihan = useTagihanStore()
  const log = useLogStore()

  /**
   * @returns status baru tagihan setelah pembayaran dicatat.
   */
  async function catat(t: Tagihan, jumlah_bayar: number, tgl: string): Promise<Tagihan['status']> {
    /* Lunas hanya bila menutup seluruh tagihan. Lebih bayar tetap lunas —
       kelebihannya urusan rekonsiliasi, bukan status. */
    const status: Tagihan['status'] = jumlah_bayar >= t.jumlah ? 'lunas' : 'kurang'
    await tagihan.update(t.id, { jumlah_bayar, tgl, status })
    await log.add(
      `${t.penghuni} bayar kamar ${t.kamar} ${t.bulan}`, 'green', t.property_id)
    return status
  }

  async function batalkan(t: Tagihan): Promise<void> {
    /* `tgl` dihapus, bukan dikosongkan: string kosong akan terbaca sebagai
       tanggal yang pernah ada dan ikut masuk perhitungan saldo. */
    await tagihan.update(t.id, {
      status: 'belum', jumlah_bayar: 0,
      tgl: deleteField() as unknown as string,
    })
  }

  return { catat, batalkan }
}
