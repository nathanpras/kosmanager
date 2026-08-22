export interface Kamar {
  id: string
  nomor: string
  tipe: string
  harga: number
  status: 'kosong' | 'terisi' | 'telat' | 'booked'
  property_id: string
  kategori?: string
  foto?: string
  deposit?: number
  keterangan?: string
  jmlk?: number
  nominal_tambahan?: number
  dp_nominal?: number
  dp_masuk?: string
}

export interface Penghuni {
  id: string
  nama: string
  kamar: string
  hp: string
  masuk: string
  /** @deprecated Dipakai data lama. Baca lewat tglKeluar(), tulis ke tgl_keluar. */
  kontrak_selesai?: string
  /** Tanggal penghuni keluar, inklusif. Diisi saat orangnya pamit — kos ini tidak berkontrak. */
  tgl_keluar?: string
  property_id: string
  ktp?: string
  pekerjaan?: string
  asal?: string
  keterangan?: string
  jenis_kelamin?: 'L' | 'P'
  org2_nama?: string
  org2_hp?: string
}

export interface Tagihan {
  id: string
  penghuni: string
  kamar: string
  bulan: string
  jumlah: number
  status: 'belum' | 'lunas' | 'kurang'
  property_id: string
  tgl?: string
  jumlah_bayar?: number
  jatuh_tempo?: string
  createdAt: string
  is_prorated?: boolean
  prorated_hari?: number
  /** ID penghuni penanggung tagihan ini. Kosong pada data lama. */
  penghuni_id?: string
  /** Jumlah hari yang ditagih, inklusif. */
  hari?: number
  /** Awal dan akhir masa yang ditagih (YYYY-MM-DD). */
  dari?: string
  sampai?: string
  /** ID batch pembayaran di muka — sama untuk semua bulan dalam satu setoran. */
  bayar_ref?: string
  /** Total diskon batch, disalin ke tiap tagihan agar invoice bisa merakit subtotal. */
  diskon_batch?: number
  /** Bulan yang sudah dibayar di muka tapi penghuninya keluar duluan. */
  hangus?: boolean
  /** Selisih bila hasil hitung ulang lebih kecil dari yang sudah dibayar. */
  kelebihan?: number
  invoice_no?: string
  invoice_tgl?: string
}

export interface Pengeluaran {
  id: string
  deskripsi: string
  jumlah: number
  kategori: string
  tgl: string
  property_id: string
  keterangan?: string
}

export interface Maintenance {
  id: string
  kamar: string
  deskripsi: string
  status: 'open' | 'in_progress' | 'selesai'
  prioritas: 'low' | 'medium' | 'high'
  tgl: string
  property_id: string
  catatan?: string
  foto?: string
  /** Jenis keluhan (AC, Listrik, Air, ...). Lihat utils/keluhan.ts */
  jenis?: string
  /** Nama penghuni yang melapor. Dipakai untuk balas via WhatsApp. */
  pelapor?: string
  /** Tanggal keluhan ditutup. Diisi otomatis saat status jadi 'selesai'. */
  tgl_selesai?: string
  /** Biaya perbaikan. Bisa dicatat sekalian sebagai pengeluaran. */
  biaya?: number
}

export interface LogEntry {
  id: string
  text: string
  color: 'green' | 'red' | 'amber' | 'blue'
  ts: string
  property_id: string
}

export interface Property {
  id: string
  nama: string
  alamat: string
  no_hp: string
  maps_url?: string
  bank_nama?: string
  bank_rekening?: string
  bank_an?: string
  is_default?: boolean
  created_at: string
  /** Saldo rekening pada tanggal saldo_awal_tgl. Titik awal perhitungan saldo berjalan. */
  saldo_awal?: number
  /** Tanggal saldo_awal dicatat (YYYY-MM-DD). Transaksi sejak tanggal ini dihitung. */
  saldo_awal_tgl?: string
}

export interface Kategori {
  id: string
  nama: string
  urutan: number
}

export interface TipeKamar {
  id: string
  nama: string
  urutan: number
}

export interface AppSettings {
  nama?: string
  alamat?: string
  wa?: string
  bank?: string
  rek?: string
  namarek?: string
  wa_template?: string
  tgl_jatuh_tempo?: number
  /** Tambahan per orang di atas penghuni pertama. Ditimpa Kamar.nominal_tambahan. */
  nominal_tambahan?: number
}

export interface TagihanStatus {
  status: 'lunas' | 'kurang' | 'telat' | 'belum'
  cls: string
  label: string
  dibayar: number
  sisa: number
  telat?: boolean
}
