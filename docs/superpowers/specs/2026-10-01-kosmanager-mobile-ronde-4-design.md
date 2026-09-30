# kosmanager Mobile — Ronde 4: uang dan sewa

**Tanggal:** 2026-10-01
**Berkas:** `docs/superpowers/mockups/kosmanager-mobile.html`
**Induk:** `2026-09-27-kosmanager-mobile-kamaru-design.md` — semua batas di sana tetap berlaku.

## Kenapa ronde ini ada

Setelah Ronde 3, mockup masih punya **20 jalan buntu** — tombol yang hanya
memunculkan toast "Belum dibuat di ronde 1". Dua puluh terlalu banyak untuk satu
ronde, jadi Ronde 4 mengambil satu tema utuh: **semua yang menyangkut uang dan
kontrak sewa.** Sisanya (foto kamar, info properti, tiga menu, notifikasi, dua
kolom cari, tap tanggal kalender, uploader logo) jadi kandidat Ronde 5.

`docs/PROGRESS.md` sebelumnya hanya mencatat 13 dari 20 jalan buntu. Tujuh yang
terlewat: Pindah kamar, Hapus sewa, Ubah harga, FAB + Pengeluaran, tap tanggal
kalender, uploader Logo, dan Cari di tab Penghuni.

## Cakupan: 8 tujuan, 10 jalan buntu

| Tujuan | Pintu masuk |
|---|---|
| Sheet **Tambah transaksi** | Aksi → Tambah tagihan · Tambah deposit · Tambah biaya lain |
| Sheet **Ubah harga** | Pengaturan sewa → Ubah harga · tombol "Ubah harga kamar" di tab Harga |
| Sheet **Ubah masa tinggal** | Pengaturan sewa → Ubah masa tinggal · link "Ubah" di kartu masa tinggal |
| Sheet **Pindah kamar** | Pengaturan sewa → Pindah kamar |
| Sheet **Hapus sewa** | Pengaturan sewa → Hapus sewa |
| Sheet **Catat pengeluaran** | FAB "+ Pengeluaran" di tab Transaksi properti |

Enam sheet baru menutup sepuluh jalan buntu.

## Keputusan yang dikunci di ronde ini

| Hal | Pilihan | Alasan |
|---|---|---|
| Tiga "Tambah" jadi satu sheet | Satu sheet dengan segmen jenis di atas | Isinya nominal + tanggal + keterangan yang sama; tiga sheet berarti kode yang sama ditulis tiga kali |
| Simpan benar-benar mengubah data | Ya | Tanpa ini yang bisa dinilai di HP hanya bentuknya, bukan alurnya. Pola `dasarBasi` dari Ronde 3 dipakai ulang |
| Tagihan bukan arus kas | Tagihan dan biaya lain masuk daftar **tagihan kamar**; hanya deposit dan pengeluaran menyentuh arus kas properti | Tagihan adalah kewajiban, bukan uang yang sudah diterima. Menaruhnya di ringkasan "Masuk" akan bohong |
| "Hapus sewa" tidak menghapus orang | Penghuni di-check-out dan masuk riwayat | Aplikasi aslinya memang begitu — `Penghuni.tgl_keluar`, bukan hapus baris. Salinan teksnya menyebut ini terang-terangan |
| Pindah kamar memakai aturan aplikasi | Bulan berjalan tetap ditagih kamar lama penuh; kamar baru mulai tanggal 1 bulan berikutnya | Keputusan yang sudah diambil pemilik pada 23 Agustus dan sudah jadi kode di `utils/riwayatKamar.ts`. Mockup tidak boleh mengarang aturan lain |

## Enam sheet

Semuanya mengikuti pola yang sudah ada: state di `FORM.<nama>`, helper
`fMoney/fDate/fPick/fText/fArea`, footer `[['Batal',''],['Simpan','<toast>']]`,
penyimpan di `PENYIMPAN['sheet:<nama>']` yang mengembalikan `false` untuk menahan
sheet tetap terbuka saat validasi gagal.

### 1. Tambah transaksi — `trx:<rid>|<jenis>`

Segmen jenis di baris atas, sama bentuknya dengan segmen templat di sheet
WhatsApp: **Tagihan · Deposit · Biaya lain**. Judul dan pintasan nominal ikut
jenis yang aktif; jenis bisa diganti tanpa menutup sheet.

| Jenis | Pintasan nominal | Tujuan simpan |
|---|---|---|
| Tagihan | Sewa sebulan · Setengah · Kosongkan | `TAGIHAN[rid]`, status `belum` |
| Deposit | Sewa sebulan · Rp1.000.000 · Rp500.000 | `TXN[prop]` positif **dan** `Kamar.deposit` |
| Biaya lain | Rp50.000 · Rp150.000 · Rp300.000 | `TAGIHAN[rid]`, status `belum` |

Isian: nominal (wajib), keterangan (wajib untuk Tagihan dan Biaya lain, karena
tanpa itu barisnya tak bisa dibaca di daftar), tanggal, dan — hanya untuk
Tagihan — jatuh tempo.

Validasi: nominal harus lebih dari nol; keterangan tidak boleh kosong untuk
jenis yang mewajibkannya. Gagal → `.note bad`, sheet tetap terbuka.

### 2. Ubah harga — `harga:<rid>`

Nominal baru (wajib, lebih dari nol) dengan `help` berisi harga sekarang, lalu
"Berlaku dari" yang default-nya tanggal 1 bulan berikutnya. `.note info`
menjelaskan bahwa periode yang sedang berjalan tetap memakai harga lama.

Simpan mengubah `Kamar.harga`, sehingga kartu kamar, tab Harga, dan blok harga
di tab Penghuni langsung ikut berubah.

### 3. Ubah masa tinggal — `masa:<rid>`

Check-in (tanggal + jam), check-out yang berupa dua radio **Terbuka** /
**Bertanggal** — bertanggal memunculkan pemilih tanggal — dan jumlah orang.

Validasi: check-out tidak boleh mendahului check-in.

Simpan mengubah `masuk`, `jam`, `keluar`, dan `orang`. Kartu masa tinggal yang
sebelumnya menulis "Terbuka · tanpa batas" secara tetap kini membaca
`Kamar.keluar`.

### 4. Pindah kamar — `pindah:<rid>`

Hanya kamar **kosong di properti yang sama** yang boleh jadi tujuan; daftarnya
dari `LISTS.kamarKosong`. Kalau properti itu tidak punya kamar kosong sama
sekali, yang tampil `.note bad` dan tombol Simpan mati.

`.note info` menuliskan aturan penagihannya dengan angka yang sebenarnya:
bulan berjalan tetap ditagih kamar lama penuh, kamar baru mulai ditagih tanggal
1 bulan berikutnya.

Simpan memindahkan seluruh data penghuni ke kamar tujuan, mengosongkan kamar
asal, dan menulis satu entri riwayat di kamar asal dengan penanda `pindahKe`.
Entri itu tampil sebagai "Pindah ke kamar X" dan chip-nya berbunyi **Pindah
kamar**, bukan "Mantan penghuni" — orangnya masih menghuni, hanya tidak di kamar
itu lagi.

### 5. Hapus sewa — `hapus:<rid>`

Konfirmasi dua langkah di dalam sheet, sama seperti hapus catatan di Ronde 3 —
`confirm()` diblokir di dalam artifact. Teksnya menyebut apa yang sebenarnya
terjadi: penghuni pindah ke riwayat, datanya tidak hilang.

Simpan mengosongkan kamar dan menambahkan penghuni ke riwayat kamar itu dengan
tanggal keluar hari ini.

### 6. Catat pengeluaran — `keluar:<pid>`

Nominal (wajib), kategori, tanggal, dan keterangan (wajib). Kategorinya
**dua belas nama yang sama** dengan `KATEGORI_PENGELUARAN` di
`src/utils/kategoriPengeluaran.ts`, supaya yang dinilai di HP adalah daftar yang
nanti benar-benar dipakai.

Simpan menambahkan baris negatif ke `TXN[pid]`, terurut tanggal terbaru di atas,
sehingga ringkasan "Keluar" di tab Transaksi ikut berubah. Properti kedua yang
tadinya kosong jadi punya isi — sekaligus menguji jalur dari `.emptystate` ke
daftar yang terisi.

## Data baru di mockup

```
TAGIHAN[rid] = [{ id, jenis, ket, nominal, tgl, tempo, status }]
RIWAYAT_TAMBAHAN     entri riwayat yang lahir dari Pindah kamar dan Hapus sewa
```

Tidak ada skema Firestore baru. Semuanya hanya di memori dan hilang saat halaman
dimuat ulang, sama seperti berkas unggahan di Ronde 3.

Tab Transaksi kamar yang sebelumnya hanya memperlihatkan tiga baris sewa bulanan
bikinan kini menampilkan tagihan tambahan di atas baris-baris itu, dengan chip
status.

## Cara memverifikasi

    node docs/superpowers/mockups/_smoke.cjs
    node docs/superpowers/mockups/_shots.cjs

Uji baru yang harus ada, satu per keputusan di atas:

- nominal nol menahan simpan; keterangan kosong menahan simpan
- ganti jenis di dalam sheet mengganti pintasan nominal
- tagihan masuk daftar tagihan kamar, **tidak** masuk ringkasan "Masuk"
- deposit masuk arus kas properti dan mengubah `Kamar.deposit`
- ubah harga mengubah angka di tab Harga dan di kartu kamar
- check-out mendahului check-in menahan simpan
- pindah kamar mengosongkan kamar asal, mengisi kamar tujuan, dan meninggalkan
  entri "Pindah ke kamar X"
- properti tanpa kamar kosong mematikan tombol Simpan di sheet Pindah kamar
- hapus sewa butuh dua ketukan dan menaruh penghuni di riwayat
- pengeluaran mengubah ringkasan "Keluar" dan mengisi properti yang tadinya kosong

Dua audit statis yang sudah ada tetap jalan: setiap ikon yang dipanggil harus
terdefinisi, dan setiap class yang pernah dirender harus punya aturan CSS.

jsdom buta terhadap tata letak — `_shots.cjs` wajib dijalankan dan hasilnya
dilihat, bukan hanya `_smoke.cjs`.
