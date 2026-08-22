import { MONTHS_SHORT } from './format'
import type { Tagihan, Penghuni, Property } from '../types'

export interface BarisInvoice {
  keterangan: string
  periode: string
  jumlah: number
}

export interface DataInvoice {
  no: string
  tgl: string
  namaKos: string
  alamat: string
  hp: string
  bank: string
  rekening: string
  an: string
  nama: string
  kamar: string
  hpPenghuni: string
  baris: BarisInvoice[]
  subtotal: number
  diskon: number
  total: number
  lunas: boolean
  tglBayar?: string
}

/**
 * Nomor invoice berikutnya, urut per tahun: INV/RK/2026/08/0001.
 *
 * Urutan diambil dari nomor tertinggi yang sudah tersimpan, bukan dari
 * penghitung terpisah — tidak ada tempat untuk menyimpan penghitung yang aman
 * dari dua perangkat, dan aplikasi ini dipakai satu orang.
 */
export function nomorInvoiceBerikutnya(nomorTerpakai: (string | undefined)[], tgl: string): string {
  const [tahun, bulan] = tgl.split('-')
  const tertinggi = nomorTerpakai.reduce((maks, s) => {
    const m = /^INV\/RK\/(\d{4})\/\d{2}\/(\d{4})$/.exec(s ?? '')
    return m && m[1] === tahun ? Math.max(maks, parseInt(m[2], 10)) : maks
  }, 0)
  return `INV/RK/${tahun}/${bulan}/${String(tertinggi + 1).padStart(4, '0')}`
}

/** "2026-03-01" + "2026-03-10" -> "1–10 Mar 2026". */
function rentangTeks(dari: string, sampai: string): string {
  const d1 = parseInt(dari.slice(8, 10), 10)
  const d2 = parseInt(sampai.slice(8, 10), 10)
  const bln = MONTHS_SHORT[parseInt(sampai.slice(5, 7), 10) - 1]
  return `${d1}–${d2} ${bln} ${sampai.slice(0, 4)}`
}

export function rakitInvoice(input: {
  tagihan: Tagihan[]
  penghuni: Penghuni | null
  properti: Property | null
  no: string
  tgl: string
}): DataInvoice {
  const { tagihan, penghuni, properti, no, tgl } = input
  const baris: BarisInvoice[] = tagihan.map(t => ({
    keterangan: `Sewa kamar ${t.kamar}`,
    periode: t.is_prorated && t.dari && t.sampai
      ? `${rentangTeks(t.dari, t.sampai)} (${t.hari ?? 0} hari)`
      : t.bulan,
    jumlah: Number(t.jumlah) || 0,
  }))
  const total = baris.reduce((s, b) => s + b.jumlah, 0)
  // diskon_batch disalin ke tiap tagihan dalam satu batch, jadi ambil satu saja.
  const diskon = Number(tagihan.find(t => t.diskon_batch)?.diskon_batch) || 0
  const dibayar = tagihan.filter(t => t.status === 'lunas')

  return {
    no, tgl,
    namaKos: properti?.nama ?? '',
    alamat: properti?.alamat ?? '',
    hp: properti?.no_hp ?? '',
    bank: properti?.bank_nama ?? '',
    rekening: properti?.bank_rekening ?? '',
    an: properti?.bank_an ?? '',
    nama: penghuni?.nama ?? tagihan[0]?.penghuni ?? '',
    kamar: penghuni?.kamar ?? tagihan[0]?.kamar ?? '',
    hpPenghuni: penghuni?.hp ?? '',
    baris,
    subtotal: total + diskon,
    diskon,
    total,
    lunas: tagihan.length > 0 && dibayar.length === tagihan.length,
    tglBayar: dibayar[0]?.tgl,
  }
}
