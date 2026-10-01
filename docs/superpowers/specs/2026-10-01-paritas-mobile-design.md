# Paritas penuh shell mobile dengan desktop

**Tanggal:** 2026-10-01
**Induk:** `2026-10-01-port-mobile-ke-aplikasi-design.md`

## Perubahan tujuan

Rencana port semula berhenti di "alur inti setara". Pemilik meminta lebih:
**setiap fitur yang ada di desktop harus ada di tampilan mobile.** Dokumen ini
memetakan seluruhnya dan mengunci di mana masing-masing tinggal.

## Masalah yang harus diselesaikan dulu

Kontrak desain 27 September mengunci **tiga tab**: Properti / Kalender /
Penghuni. Laporan, Keluhan, Riwayat aktivitas, dan Pengaturan tidak punya rumah
di sana, dan semuanya wajib ada demi paritas.

**Keputusan: tidak menambah tab keempat.** Dok empat tab membuat tiap tab lebih
sempit dan mengubah keseimbangan yang sudah dinilai di HP. Sebagai gantinya,
beranda mendapat **menu ⋮** di bilah atas — tempat Kamaru menaruh hal-hal yang
bukan pekerjaan harian. Navigasi utamanya tetap utuh; yang jarang dipakai tidak
menuntut sepertiga lebar layar.

## Peta lengkap

| Desktop | Di shell mobile | Status |
|---|---|---|
| **Dashboard** — metrik, saldo, perbandingan properti | Beranda: chip statistik + kartu saldo | chip ada; saldo belum |
| **Kamar** — daftar, denah, foto, kategori | Detail properti → tab Kamar | daftar ada; tambah kamar, foto belum |
| **Penghuni** — daftar, tambah, ubah, keluarkan, pindah | Tab Penghuni + detail kamar | daftar/pindah/keluar ada; tambah & ubah belum |
| **Tagihan** — per bulan, bayar, tambah, invoice, WA | Detail kamar + layar Tagihan dari menu | bayar & tambah ada; daftar per bulan, invoice, WA belum |
| **Pengeluaran** — daftar, tambah, ubah, hapus | Detail properti → tab Transaksi | tambah ada; ubah & hapus belum |
| **Laporan** — tiga bagan + rincian | Layar dari menu ⋮ | belum |
| **Maintenance** — keluhan, status, balas WA | Layar dari menu ⋮ | belum |
| **Log** — riwayat aktivitas | Layar dari menu ⋮ | belum |
| **Pengaturan** — 5 tab | Layar dari menu ⋮, satu daftar | belum |

### Isi Pengaturan desktop yang harus ikut

| Tab desktop | Isi |
|---|---|
| Umum | Informasi Kos (nama, alamat, WA, bank), Buka Aplikasi (PIN, Face ID), Cadangan Data, Informasi Aplikasi |
| Properti | daftar properti, tambah/ubah/hapus |
| Kategori | kategori kamar |
| Tipe Kamar | tipe kamar |
| Migrasi Nomor | alat ganti penomoran, dengan pratinjau dan backup wajib |

**Migrasi penomoran tidak diport ke layar HP.** Alat itu mengubah nomor seluruh
kamar sekaligus, mewajibkan backup, dan menampilkan pratinjau baris-per-baris
sebelum dijalankan. Layar selebar telapak tangan bukan tempat untuk keputusan
yang tak bisa dibatalkan itu. Layar Pengaturan mobile **menyebutkannya** dan
mengarahkan ke desktop — bukan menyembunyikannya seolah tidak ada.

Aturan yang sama berlaku untuk **saldo awal** properti, yang sudah lebih dulu
diputuskan begitu.

## Urutan kerja

1. **Menu ⋮ dan kerangka rute** — Laporan, Keluhan, Riwayat, Pengaturan.
2. **Pengaturan** — yang paling dirasakan hilang.
3. **Keluhan (Maintenance)** — termasuk balas WhatsApp.
4. **Laporan** — bagan dipakai ulang dari `components/charts`.
5. **Riwayat aktivitas (Log)**.
6. **Tagihan per bulan** — daftar, invoice, pengingat WhatsApp.
7. **Yang masih kurang di layar yang sudah ada** — tambah properti/kamar/
   penghuni, ubah penghuni, ubah/hapus pengeluaran, saldo di beranda.

## Batas yang tetap berlaku

- `src/style.css` tidak diubah; semua gaya mobile di `.kmob`.
- Aturan yang hidup di dalam view desktop **diangkat jadi composable dulu**,
  baru dipakai dua tampilan. Sudah empat kali dilakukan dan tiap kali menemukan
  duplikasi yang memang sudah ada.
- Tidak ada tombol yang dirender tanpa tujuan.
- Tidak ada dependensi baru.
