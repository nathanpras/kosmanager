# Halaman publik — raffleskos23

Halaman untuk calon penghuni: <https://raffleskos23.pages.dev> (Cloudflare Pages).

Satu berkas statis, tanpa build. Untuk memperbarui: unggah `index.html` ke
Cloudflare Pages.

## Dari mana datanya

Satu permintaan tanpa autentikasi ke koleksi **`publik`** di Firestore:

```
GET https://firestore.googleapis.com/v1/projects/kos-manager-93c43/databases/(default)/documents/publik
```

`publik` adalah satu-satunya koleksi yang boleh dibaca tanpa login — lihat
`firestore.rules` di akar repo. Koleksi lain (`penghuni`, `tagihan`,
`properties`, …) mengembalikan 403 bagi siapa pun yang belum sign-in.

## Kenapa tidak membaca `kamar` langsung

Versi sebelumnya membaca `properties`, `kamar`, dan `settings` secara langsung.
Cara itu berhenti bekerja begitu aturan Firestore diperketat — dan memang
seharusnya berhenti: membuka jalur itu untuk halaman publik berarti membuka juga
nama penghuni, nomor HP, nomor KTP, seluruh riwayat tagihan, dan nomor rekening
pemilik kepada siapa pun yang membuka halaman ini.

Dokumen `publik` disusun lewat **daftar putih** di `src/utils/publik.ts` — field
dibangun satu per satu, bukan menyalin dokumen lalu menghapus yang sensitif.
Konsekuensinya: menambah field baru ke `Kamar` atau `Property` **tidak** akan
diam-diam ikut terbit; harus ditambahkan di daftar putih secara sadar.

Nomor rekening sengaja tidak ditampilkan. Halaman ini terbuka untuk umum, dan
memampang rekening memudahkan penipu meniru kos ini dengan rekening lain.

## Siapa yang mengisi `publik`

Aplikasi utama, otomatis. `useSinkronPublik` berjalan di akhir rangkaian rutin
saat aplikasi dimuat — setelah status kamar dimutakhirkan, supaya yang terbit
bukan data basi. Penulisan hanya terjadi bila isinya benar-benar berubah, jadi
membuka aplikasi berkali-kali tidak memakan kuota tulis.

**Artinya halaman ini baru terisi setelah aplikasi utama dibuka sekali.**

## Bentuk dokumen

```jsonc
{
  "nama": "Raffles Kos 23 (Waru Raya)",
  "alamat": "…", "wa": "0817…", "maps_url": "…",
  "kamar": [                      // hanya yang kosong, detail lengkap
    { "nomor": "101", "tipe": "Standard", "harga": 1500000,
      "foto": "…", "deposit": 500000, "kategori": "…" }
  ],
  "denah":  [                     // semua kamar, minimal — untuk peta hunian
    { "nomor": "101", "kosong": true }
  ],
  "tambahan_penghuni": 300000,    // supaya halaman tidak menebak harga berdua
  "total_kamar": 21, "total_kosong": 3,
  "diperbarui": "2026-08-04T…"
}
```

Penomoran lantai dibaca dari nomor kamar dan memahami dua gaya sekaligus —
`101` → lantai 1, dan `B1` → lantai 1 — sehingga tetap benar sebelum maupun
sesudah migrasi penomoran dijalankan.
