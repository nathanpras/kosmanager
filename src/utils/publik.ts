import type { Kamar, Property } from '../types'

/**
 * Ringkasan kamar kosong untuk halaman publik.
 *
 * Bentuknya sengaja dibuat sebagai **daftar putih**, bukan menyalin objek lalu
 * menghapus field sensitif. Dengan cara ini, menambah field baru ke `Kamar`
 * atau `Property` tidak akan diam-diam ikut terbit ke internet — field baru
 * harus ditambahkan di sini secara sadar.
 *
 * Yang TIDAK boleh masuk, dan alasannya:
 *   Property.bank_rekening / bank_an — nomor rekening pemilik
 *   Kamar.keterangan                 — catatan internal, sering berisi hal pribadi
 *   seluruh koleksi penghuni         — nama, HP, KTP
 *   seluruh koleksi tagihan          — keuangan
 */
export interface KamarPublik {
  nomor: string
  tipe: string
  harga: number
  kategori?: string
  foto?: string
  deposit?: number
}

/** Satu petak di peta kamar. Nomor dan terisi/tidak saja — tanpa harga. */
export interface PetakDenah {
  nomor: string
  kosong: boolean
}

export interface ListingPublik {
  nama: string
  alamat: string
  wa: string
  maps_url: string
  /** Detail lengkap, hanya untuk kamar yang benar-benar ditawarkan. */
  kamar: KamarPublik[]
  /** Semua kamar, tapi minimal — cukup untuk menggambar peta hunian. */
  denah: PetakDenah[]
  /** Tambahan per orang di atas penghuni pertama, supaya halaman tidak menebak. */
  tambahan_penghuni: number
  total_kamar: number
  total_kosong: number
  diperbarui: string
}

/** Hanya kamar berstatus kosong yang ditawarkan. */
export function kamarKosong(semua: Kamar[], property_id: string): Kamar[] {
  return semua
    .filter(k => k.property_id === property_id && k.status === 'kosong')
    .sort((a, b) => a.nomor.localeCompare(b.nomor, undefined, { numeric: true }))
}

export function susunListing(
  properti: Property,
  semuaKamar: Kamar[],
  opts: { tambahanPenghuni?: number; diperbarui?: string } = {},
): ListingPublik {
  const { tambahanPenghuni = 0, diperbarui = new Date().toISOString() } = opts
  const milik = semuaKamar
    .filter(k => k.property_id === properti.id)
    .sort((a, b) => a.nomor.localeCompare(b.nomor, undefined, { numeric: true }))
  const kosong = kamarKosong(semuaKamar, properti.id)

  return {
    nama: properti.nama ?? '',
    alamat: properti.alamat ?? '',
    wa: properti.no_hp ?? '',
    maps_url: properti.maps_url ?? '',
    kamar: kosong.map(k => {
      // Dibangun field demi field, bukan sebar objek.
      const out: KamarPublik = {
        nomor: k.nomor,
        tipe: k.tipe ?? '',
        harga: Number(k.harga) || 0,
      }
      if (k.kategori) out.kategori = k.kategori
      if (k.foto) out.foto = k.foto
      if (k.deposit) out.deposit = Number(k.deposit)
      return out
    }),
    denah: milik.map(k => ({ nomor: k.nomor, kosong: k.status === 'kosong' })),
    tambahan_penghuni: Number(tambahanPenghuni) || 0,
    total_kamar: milik.length,
    total_kosong: kosong.length,
    diperbarui,
  }
}

/**
 * Apakah listing berubah, mengabaikan stempel waktu?
 *
 * Tanpa perbandingan ini, aplikasi akan menulis ke Firestore setiap kali dibuka
 * walau tidak ada yang berubah — memakan kuota tulis tanpa guna.
 */
export function listingBerubah(lama: ListingPublik | null, baru: ListingPublik): boolean {
  if (!lama) return true
  const tanpaWaktu = (l: ListingPublik) => JSON.stringify({ ...l, diperbarui: '' })
  return tanpaWaktu(lama) !== tanpaWaktu(baru)
}
