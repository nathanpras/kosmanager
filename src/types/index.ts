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
  no_hp: string
  masuk: string
  kontrak_selesai?: string
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
}

export interface TagihanStatus {
  status: 'lunas' | 'kurang' | 'telat' | 'belum'
  cls: string
  label: string
  dibayar: number
  sisa: number
  telat?: boolean
}
