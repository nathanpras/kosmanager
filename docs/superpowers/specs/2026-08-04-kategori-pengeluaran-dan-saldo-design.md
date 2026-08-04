# Paket 4 — Kategori Pengeluaran & Saldo Berjalan

_Date: 2026-08-04_
_Status: selesai_

---

## Ruang lingkup

1. Kategori pengeluaran diperbanyak, dengan ikon.
2. Saldo berjalan, supaya tidak hanya terlihat pemasukan dan pengeluaran per periode.

---

## Kategori pengeluaran

Sebelumnya enam kategori di-hardcode di dalam `PengeluaranView.vue`, lengkap dengan dua peta warna dan ikon di sebelahnya. Dipindahkan ke `src/utils/kategoriPengeluaran.ts` sebagai satu daftar berisi nama, ikon, dan warna.

Tambahan sesuai permintaan pemilik: Deposit Balik, Gaji Pembantu, Gaji Pengurus, Iuran, Transfer Tanah. Ditambah Pajak sebagai pelengkap yang wajar.

**Enam kategori lama dipertahankan seluruhnya.** `pengeluaran.kategori` menyimpan nama kategori sebagai teks, bukan id — menghapus satu entri akan membuat transaksi lama kehilangan ikon dan warnanya. Karena tidak ada yang dihapus, tidak ada data yang perlu dimigrasi. Kategori yang tidak dikenal tetap tampil dengan ikon dan warna default, bukan kosong.

Ikon lama untuk Listrik dan Internet diganti (`💡`→`⚡`, `📡`→`🌐`) agar konsisten dengan gaya kategori baru. Ini murni tampilan; nama kategori — satu-satunya yang tersimpan di basis data — tidak berubah.

---

## Saldo berjalan

### Yang tidak dibangun, dan alasannya

Permintaan aslinya menyebut saldo ATM BCA yang terdeteksi otomatis beserta rincian biaya admin. **Itu tidak dibangun karena tidak bisa dibangun**: BCA tidak menyediakan API publik untuk rekening pribadi, dan agregator seperti Brick atau Ayoconnect adalah produk B2B berbayar dengan proses onboarding tersendiri. Ini sudah disampaikan ke pemilik sebelum paket ini dimulai.

Yang dibangun adalah saldo yang dihitung dari data yang memang tercatat di aplikasi.

### Rumus

```
saldo = saldo_awal + Σ pembayaran masuk − Σ pengeluaran
```

Keduanya dihitung **sejak tanggal saldo awal dicatat**, inklusif.

### Saldo awal disimpan di properti, bukan di pengaturan global

Waru 23 dan Citra 1 punya rekening BCA masing-masing dengan pemilik berbeda (Jonathan dan Fanny). Satu saldo global tidak akan berarti apa-apa. `Property` karena itu mendapat `saldo_awal` dan `saldo_awal_tgl`.

Mode "Semua Properti" menjumlahkan keduanya.

### Dua kasus data yang harus ditangani

**Tagihan lunas tanpa `jumlah_bayar`.** Field itu belum tentu terisi pada tagihan lama. Bila kosong dan status `lunas`, tagihan dianggap terbayar penuh — kalau tidak, pemasukan lama hilang dari perhitungan.

**Pembayaran tanpa `tgl`.** Tanggal 1 bulan tagihan dipakai sebagai perkiraan. Membuang transaksinya akan lebih merusak saldo daripada memakai tanggal yang meleset beberapa minggu.

### Saldo awal yang belum diisi

Bila properti belum punya `saldo_awal`, seluruh riwayat dihitung dan hasilnya diberi label **"arus kas, bukan saldo rekening"** di Dashboard. Menyembunyikan kartunya akan membuat fitur ini tak terlihat; menampilkannya tanpa peringatan akan menyesatkan.

Kartu saldo **tidak mengikuti filter bulan** — ini posisi uang sekarang, bukan angka periode.

---

## Pengujian

`src/tests/utils/saldo.test.ts` — 17 tes:
- `jumlah_bayar` diutamakan; lunas tanpa `jumlah_bayar` dihitung penuh; bayar sebagian mengalahkan nilai penuh
- tanggal pembayaran: `tgl` dipakai, jatuh ke tanggal 1 bulan tagihan, `null` bila bulan tak terbaca
- transaksi sebelum tanggal saldo awal diabaikan; tepat pada tanggalnya ikut dihitung
- properti lain tidak ikut
- tanpa saldo awal: seluruh riwayat dihitung dan ditandai `belumDiatur`
- saldo bisa negatif
- penjumlahan lintas properti, termasuk daftar kosong

Verifikasi: `typecheck=0`, `build=0`, 97 tes lulus (naik dari 80).

---

## Catatan

Perhitungan saldo memakai `properties.items` langsung, bukan lewat `filterByProperty`, karena `Property` tidak punya field `property_id` — identitasnya ada di `id`.
