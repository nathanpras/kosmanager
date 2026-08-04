import { bulanKey } from './date'
import type { Tagihan, Pengeluaran, Property } from '../types'

/**
 * Nilai uang yang benar-benar sudah diterima dari sebuah tagihan.
 *
 * `jumlah_bayar` adalah sumber utama. Tagihan lama yang ditandai lunas sebelum
 * field itu ada tidak mengisinya, jadi status 'lunas' dianggap terbayar penuh.
 */
export function nilaiDibayar(t: Tagihan): number {
  const bayar = Number(t.jumlah_bayar)
  if (Number.isFinite(bayar) && bayar > 0) return bayar
  return t.status === 'lunas' ? Number(t.jumlah) || 0 : 0
}

/**
 * Tanggal masuknya uang.
 *
 * `tgl` diisi saat pembayaran dicatat. Bila kosong (tagihan lama), tanggal 1
 * bulan tagihan dipakai — perkiraan yang cukup untuk saldo, dan lebih baik
 * daripada membuang transaksinya dari perhitungan.
 */
export function tglPembayaran(t: Tagihan): string | null {
  if (t.tgl) return t.tgl
  const kunci = bulanKey(t.bulan)
  return kunci === '0000-00' ? null : `${kunci}-01`
}

export interface RingkasSaldo {
  saldoAwal: number
  masuk: number
  keluar: number
  saldo: number
  /** true bila properti belum mengisi saldo awal — angkanya jadi arus kas, bukan saldo rekening. */
  belumDiatur: boolean
}

/**
 * Saldo berjalan sebuah properti: saldo awal, ditambah pembayaran yang masuk,
 * dikurangi pengeluaran — keduanya dihitung sejak tanggal saldo awal dicatat.
 *
 * Bukan saldo rekening bank sungguhan. Tidak ada API publik BCA untuk rekening
 * pribadi, jadi angka ini hanya seakurat data yang dicatat di aplikasi.
 */
export function hitungSaldo(
  properti: Pick<Property, 'id' | 'saldo_awal' | 'saldo_awal_tgl'>,
  tagihan: Tagihan[],
  pengeluaran: Pengeluaran[],
): RingkasSaldo {
  const saldoAwal = Number(properti.saldo_awal) || 0
  const sejak = properti.saldo_awal_tgl ?? null
  const belumDiatur = properti.saldo_awal == null && !properti.saldo_awal_tgl

  const setelahSejak = (tgl: string | null) => tgl != null && (sejak == null || tgl >= sejak)

  const masuk = tagihan
    .filter(t => t.property_id === properti.id && setelahSejak(tglPembayaran(t)))
    .reduce((s, t) => s + nilaiDibayar(t), 0)

  const keluar = pengeluaran
    .filter(p => p.property_id === properti.id && setelahSejak(p.tgl ?? null))
    .reduce((s, p) => s + (Number(p.jumlah) || 0), 0)

  return { saldoAwal, masuk, keluar, saldo: saldoAwal + masuk - keluar, belumDiatur }
}

/** Menjumlahkan saldo beberapa properti, untuk tampilan "Semua Properti". */
export function gabungSaldo(daftar: RingkasSaldo[]): RingkasSaldo {
  return daftar.reduce<RingkasSaldo>(
    (a, b) => ({
      saldoAwal: a.saldoAwal + b.saldoAwal,
      masuk: a.masuk + b.masuk,
      keluar: a.keluar + b.keluar,
      saldo: a.saldo + b.saldo,
      belumDiatur: a.belumDiatur || b.belumDiatur,
    }),
    { saldoAwal: 0, masuk: 0, keluar: 0, saldo: 0, belumDiatur: false },
  )
}
