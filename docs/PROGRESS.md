# Status proyek kosmanager

Titik masuk untuk melanjutkan kerja dari mesin mana pun.

**Terakhir diperbarui:** 27 September 2026 · `npm run test:run` 221/221 hijau

> **Kerjakan dari beberapa mesin.** Repo ini dikerjakan bergantian dari lebih
> dari satu komputer. Selalu `git pull --rebase` sebelum mulai, dan push begitu
> selesai. Jangan pernah force push.

---

## Dua jalur yang sedang jalan

| Jalur | Isi | Status |
|---|---|---|
| **A. Aplikasi** | Vue 3 + Pinia + Firestore di `src/` | Aktif dikembangkan. Tampilan desktop dianggap selesai. |
| **B. Prototype mobile** | Mockup HTML sekali pakai bergaya aplikasi **Kamaru**, di `docs/superpowers/mockups/` | Ronde 1 dan 2 selesai. Belum di-port ke `src/`. |

Jalur B **tidak menyentuh `src/` sama sekali**.

---

## Jalur A — aplikasi

### Sudah ada

- **Tagihan** — prorata per orang per hari, draft per penghuni saat ada
  pergantian di tengah bulan, jatuh tempo otomatis, generate bulan berikutnya
  setelah tanggal 15.
- **Invoice** — penomoran, perakitan data, halaman siap cetak yang
  di-`Teleport` ke `<body>` supaya cetakan tidak bergantung pada ancestor.
- **Bayar di muka** — beberapa bulan sekaligus dengan diskon yang dibagi rata,
  satu `bayar_ref` per setoran.
- **Penghuni** — keluarkan penghuni dan arsip mantan penghuni, pindah kamar
  dengan jejak `riwayat_kamar`, pemulihan utuh, penanganan kelebihan bayar.
- **Saldo** — saldo berjalan per properti, dengan penyesuaian dari Dashboard.
- **Maintenance** — jadi log keluhan penghuni, bisa dibalas lewat WhatsApp.
- **Kamar** — denah per lantai, kategori, foto, alat migrasi penomoran
  `B1 → 101` dengan pratinjau dan backup wajib.
- **Data** — cadangan lengkap dan ekspor CSV yang jalan di iOS.
- **Lain-lain** — halaman publik untuk kamar kosong, buka aplikasi dengan
  Face ID / sidik jari, PWA yang memuat ulang saat service worker baru aktif.

### Peta berkas

```
src/
  views/        satu berkas per layar (9 rute)
  stores/       Pinia, satu per koleksi Firestore
  composables/  useProperty, useToast, useWAReminder, useKeluarPenghuni
  utils/        billing, invoice, bayarDiMuka, riwayatKamar, saldo,
                nomorKamar, keluhan, kategoriPengeluaran, publik, berkas
```

Aturan yang gampang terlewat:

- Tanggal keluar dibaca lewat `tglKeluar()`, bukan langsung dari field.
  `kontrak_selesai` sudah deprecated, yang berlaku `tgl_keluar`.
- Kamar seorang penghuni dibaca lewat `kamarPada()` / `kamarDiBulan()` di
  `utils/riwayatKamar.ts`, bukan dari `Penghuni.kamar` langsung.
- Firestore memakai autentikasi anonim dengan `firestore.rules` yang ketat.
  Kalau akses tiba-tiba ditolak, jalan pemulihannya mengendurkan rules
  sementara.

### Dokumen jalur A

`docs/superpowers/specs/` berisi kontrak desain per fitur, `docs/superpowers/plans/`
berisi rencana implementasi. Yang terbaru: `2026-08-22-invoice-bayar-dimuka-prorata`
dan `2026-08-23-pindah-kamar-handoff.md`.

---

## Jalur B — prototype mobile

### Link hidup

<https://claude.ai/code/artifact/c775f041-8521-466d-98fa-5bb931ede24b>

Buka di HP; di desktop tampil dalam bingkai telepon. Link ini tetap sama setiap
kali mockup diterbitkan ulang.

### Berkas

| Berkas | Isi |
|---|---|
| `docs/superpowers/specs/2026-09-27-kosmanager-mobile-kamaru-design.md` | Kontrak desain yang sudah disetujui |
| `docs/superpowers/mockups/kosmanager-mobile.html` | Mockup, satu berkas mandiri |
| `docs/superpowers/mockups/_smoke.cjs` | 44 langkah uji di jsdom |
| `docs/superpowers/mockups/_shots.cjs` | 18 potret layar via chromium |

```
# mockup — cukup buka berkasnya, tidak perlu server
#   docs/superpowers/mockups/kosmanager-mobile.html

node docs/superpowers/mockups/_smoke.cjs    # uji
node docs/superpowers/mockups/_shots.cjs    # potret (butuh chromium Playwright)
```

Potret tersimpan di `docs/superpowers/mockups/_shots/` dan **tidak ikut
di-commit** — dibuat ulang sesuai kebutuhan.

### Keputusan yang sudah dikunci

Jangan dibahas ulang tanpa alasan baru.

| Hal | Pilihan |
|---|---|
| Fidelity | Mockup dulu, port belakangan |
| Navigasi | Persis Kamaru — 3 tab bawah: Properti / Kalender / Penghuni. Tagihan bukan tab, diakses lewat chip di beranda dan chip status di kartu kamar |
| Palet | Bentuk Kamaru, warna kosmanager: biru `#0070C0`, kuning `#FFC000` |
| Status "Lunas" | Hijau tersendiri `#0D8A5F`, **bukan** `--green` milik `src/style.css` yang sebenarnya bernilai biru. Di daftar 19 kamar, warna status harus beda dari warna merek supaya terbaca sekilas |
| Huruf | Tiga peran: Instrument Serif (judul), Instrument Sans (UI dan seluruh angka), DM Mono (label huruf-besar saja) |
| FAB | Hanya di dalam drill-down. Di layar tab bawah pakai tautan "Tambah" agar tidak bertumpuk dengan dok |

### Sudah selesai

**Ronde 1 — tulang punggung.** Beranda dan daftar properti, layar hasil filter,
detail properti (Kamar / Transaksi / Lainnya), detail kamar (Penghuni / Harga /
Transaksi / Lainnya), sheet Aksi dan sub-sheet Pengaturan sewa, info penghuni
dengan blok dokumen, tab Penghuni dengan cari dan filter, tab Kalender.

**Ronde 2 — formulir.** Tambah penghuni (peringatan merah saat kamar masih
ditempati, harga terisi otomatis dari kamar yang dipilih), Properti baru dua
langkah, Tambah kamar, Catat pembayaran, pemilih nilai dan pemilih tanggal yang
kembali ke sheet induknya, kalender bisa digeser antar bulan.

### Sedang dikerjakan — Ronde 3

Rencana: `docs/superpowers/plans/2026-09-28-kosmanager-mobile-ronde-3.md`
(kontrak: butir 15–20 di kontrak desain). Centang di bawah diperbarui dan
di-push setiap satu tugas selesai; lanjutkan dari tugas pertama yang belum
dicentang.

- [x] 1. Ganti huruf ke Inter
- [x] 2. Riwayat penghuni dan profil mantan penghuni
- [x] 3. Catatan internal
- [x] 4. Edit penghuni
- [x] 5. Unggah foto dan dokumen
- [x] 6. Sheet WhatsApp
- [ ] 7. Potret, terbitkan, dokumentasi

### Berikutnya — belum dikerjakan

1. **Port ke aplikasi.** Lapis `@layer tokens` dan `@layer components` di dalam
   mockup sengaja ditulis untuk disalin utuh ke `src/style.css`; hanya lapis
   `screens` dan markup yang perlu dirakit ulang jadi komponen Vue.
2. **Ronde 3 kandidat.** Edit penghuni, riwayat penghuni, catatan internal,
   unggah foto, pengingat WhatsApp dari layar penghuni.

### Peta data Kamaru → kosmanager

Tabel di kontrak desain bertanggal 27 September ditulis dari klon yang belum
menarik pekerjaan terbaru, jadi ia menyebut beberapa hal "belum ada" padahal
sudah. **Yang berlaku adalah tabel di bawah ini.**

| Konsep Kamaru | Di aplikasi |
|---|---|
| Check-out | Ada — `Penghuni.tgl_keluar`, dibaca lewat `tglKeluar()` |
| Pindah kamar | Ada — `Penghuni.riwayat_kamar` |
| Invoice | Ada — `Tagihan.invoice_no`, `invoice_tgl` |
| Tagihan per penghuni | Ada — `Tagihan.penghuni_id`, `dari`, `sampai`, `hari` |
| Jam check-in | **Belum** |
| Tanggal tagih per penghuni | **Belum** — sekarang satu tanggal global di `AppSettings.tgl_jatuh_tempo` |
| Deposit dan biaya tambahan per penghuni | **Belum** — sekarang menempel di `Kamar` |
| Unggah foto dan berkas penghuni | **Belum** — `Penghuni.ktp` masih berupa teks |
| Logo dan jenis properti | **Belum** |

Di mockup semua yang "belum" itu masih isian dummy. Tidak ada skema Firestore
baru yang dibuat untuk prototype ini.

---

## Jebakan yang sudah pernah kena

Di jalur B, dicatat supaya tidak terulang.

- **jsdom buta terhadap tata letak.** Tiga bug lolos seluruh uji jsdom dan baru
  ketahuan setelah dipotret pakai chromium. Kalau mengubah tampilan, jalankan
  `_shots.cjs` dan lihat hasilnya, jangan hanya `_smoke.cjs`.
- **Tabrakan nama kelas.** `.mval.empty` diam-diam mewarisi
  `.empty { text-align:center; padding:38px }` milik blok empty-state. Blok itu
  kini bernama `.emptystate`.
- **Angka pada huruf serif.** Angka `1` di Instrument Serif tidak berkaki, jadi
  `Rp1.800.000` terbaca `Rpl.800.000`. DM Mono memakai nol bergaris (Ø).
  Aturannya: serif dan mono tidak pernah merender angka; helper `numify()`
  mengalihkannya ke Instrument Sans.
- **Aturan CSS bisa hilang diam-diam.** `.note` lenyap seluruhnya saat rombak
  visual; kotak peringatan merah tampil sebagai teks polos tanpa error apa pun.
  Sekarang dijaga audit statis di `_smoke.cjs`.
- **Menebak tipe dari bentuk teks.** `data-set` sempat mengubah `"101"` jadi
  angka, sehingga tak cocok lagi dengan `Kamar.no` yang bertipe teks. Kamar `A1`
  di properti kedua kebetulan lolos, jadi bugnya hanya mengenai sebagian data.
- **Penangan klik terdelegasi.** Atribut `data-*` baru harus ditambahkan ke
  daftar selektor `closest()` di penangan klik, kalau tidak kliknya tidak pernah
  tertangkap dan gagal tanpa pesan apa pun.
