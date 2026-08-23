# Handoff — lanjutan sesi KosManager (23 Agustus 2026)

Dokumen ini ditulis supaya kerja bisa dilanjutkan setelah `/clear` tanpa mengulang
penjelajahan. Baca ini dulu sebelum melakukan apa pun.

Repo: `/Users/jonathanprasetyo/Website Established/kosmanager-v2`
Branch: `feat/invoice-prorata-hari-orang` (jangan bikin branch baru)

## 1. Yang SUDAH selesai, sudah di-commit, sudah di-push

Sembilan commit di atas `de15a41`, semuanya sudah ada di `origin`:

| SHA | Isi |
|---|---|
| `11c8a8d` | Fix 1 — rekonsiliasi tagihan per kamar (`src/composables/useKeluarPenghuni.ts`, baru, + 9 tes) |
| `a0fcbde` | Fix 2 — bayar di muka & prefill Tambah Tagihan pakai tagihan kamar |
| `1c92dc0` | Fix 3 — Sesuaikan Saldo pakai saldo awal hari |
| `7cafc89` | Fix 4 — `tglKeluar()` di Laporan/Kamar/Dashboard + saring `hangus` |
| `a83d6c5` | Fix 5/6/7 — satu jalur keluar, `pulihkan()` utuh, `kelebihan` tampil |
| `6fe6e61` | Buang `hitungTagihan()` & `jumlahPenghuni()`, komentar, CSS cetak |
| `d254407` | Placeholder "Masih menghuni" |
| `fbc6f05` | Invoice di-`Teleport` ke `<body>`; cetak tidak lagi bergantung ancestor |
| `8173b33` | Dropdown penghuni diurut per nomor kamar + `<optgroup>` per properti |

Verifikasi terakhir: `npm run test:run` 198/198 hijau, `npm run typecheck` bersih,
`npm run build` exit 0. Laporan lengkap ada di
`.superpowers/sdd/2026-08-22-invoice-bayar-dimuka-prorata/final-fix-report.md` (untracked).

**Tidak ada PR.** Remote cuma punya `master` (di `21cdc6f`) dan `html-redesign`.
`gh` CLI tidak terpasang di mesin ini.

## 2. Fakta data asli (dibaca read-only dari aplikasi yang sedang jalan)

- Dua properti: **Raffles Kos 23 (Waru Raya)** 21 kamar, **Raffles Kos (Citra 1)** 8 kamar.
- 20 penghuni aktif: 19 di Waru Raya, 1 di Citra 1. Tidak ada yang tersaring `sudahKeluar`.
- **Kamar 101–107 ada di KEDUA properti** — sumber ambiguitas di mode "Semua Properti".
- Harga contoh (Waru Raya): `201` = Rp 1.500.000, `101` = Rp 1.500.000, `105` = Rp 2.000.000.
- Dev server: jalan di **port 5173** (`npm run dev`, dijalankan sesi ini). Tab Chrome lama
  masih menunjuk 5174 yang sudah mati. Aplikasi minta PIN saat dimuat ulang — PIN milik
  pengguna, jangan diketikkan oleh agen.

## 3. Pekerjaan BERIKUTNYA: fitur pindah kamar penghuni

Belum ada kode sama sekali. Masih di tahap desain (skill `superpowers:brainstorming`,
gate-nya: jangan menulis kode sebelum desain disetujui pengguna).

### Keputusan yang SUDAH diambil pengguna

**Semantik penagihan (dijawab eksplisit): opsi C.**
> "kalo misalkan dari kamar 1,5 pindah ke kamar 2.1 di pertengahan bulan, ya gpp nanti
> diitung nya tanggal 1 bulan depan 2.1, sisanya gak diitung"

Artinya: pindah tengah bulan → **bulan berjalan tetap ditagih kamar lama, penuh**;
kamar baru mulai ditagih **tanggal 1 bulan berikutnya**; sisa hari di kamar baru pada
bulan berjalan **tidak ditagih sama sekali**. Tidak ada prorata saat pindah.

### Pertanyaan yang MASIH terbuka

Apakah aplikasi perlu menyimpan **riwayat kamar**?

- **A. Ya** — tiap pindahan dicatat "kamar X sejak tanggal Y". Hitung ulang, laporan, dan
  rekonsiliasi bulan lampau tetap menunjuk kamar yang benar. Tahan untuk pindah berkali-kali.
- **B. Tidak** — cukup ganti `penghuni.kamar`.

Rekomendasi agen: **A**. Pengguna sempat menjawab "lanjut" setelah pertanyaan ini
diajukan — **ambigu**, bisa berarti "pakai rekomendasimu". **Konfirmasi ulang sebelum
menulis kode.**

### Kenapa riwayat itu penting (temuan teknis, jangan hilang)

Penagihan selalu dihitung dari `penghuni.kamar` yang **sekarang**, lewat
`useOccupancy().penghuniDiBulan(nomor, property_id, bulan)`. Begitu field itu diganti ke
kamar baru, aplikasi menganggap orang itu **selalu** di kamar baru — termasuk untuk
bulan-bulan lampau.

Bahaya konkret, akibat Fix 1 yang baru saja dibuat: bila di bulan yang sama ada roommate
di **kamar lama** yang dikeluarkan, `useKeluarPenghuni().keluarkan()` merekonsiliasi
seluruh tagihan kamar lama bulan itu. Si pindahan tidak lagi terdaftar di kamar lama,
jadi tagihannya tidak punya draft pasangan → **dihapus bila belum ada uangnya**.
(Yang sudah ada uangnya tidak pernah dihapus — invarian itu dijaga `nilaiDibayar()`.)

Ini berlaku untuk ketiga opsi semantik, termasuk C.

### Rancangan yang sedang dipertimbangkan (belum disetujui)

Kalau A dipilih: tambahkan `riwayat_kamar?: { kamar: string; sejak: string }[]` di
`Penghuni`, terurut naik. Kamar untuk sebuah bulan = entri terakhir yang `sejak <=`
tanggal 1 bulan itu; kalau kosong, pakai `penghuni.kamar` (kompatibel mundur, tanpa
migrasi — pola yang sama dengan `tglKeluar()`). Pindah = tulis entri baru dengan
`sejak` = tanggal 1 bulan berikutnya, sesuai keputusan C.

Yang perlu ikut disentuh: `penghuniDiBulan()`, `useTagihanCalc.tagihanUntukKamar()`,
`useKeluarPenghuni`, pemilih kamar di `PenghuniView`, dan tampilan kamar di `KamarView`.

## 4. Aturan yang mengikat (dari brief awal, masih berlaku)

- Komentar dan teks UI **bahasa Indonesia**.
- Label bulan `"Maret 2026"`; tanggal ISO `YYYY-MM-DD`. Jangan pakai `new Date()` untuk
  mengambil hari/bulan dari string ISO — urai secara tekstual.
- **Tagihan yang sudah ada uangnya tidak pernah diturunkan nominalnya dan tidak pernah
  dihapus proses otomatis.** Ujinya `nilaiDibayar()` di `src/utils/saldo.ts`, bukan status.
- `hitungSaldo()` dan semantik inklusif `tgl >= sejak` tidak boleh berubah.
- Kompatibel mundur tanpa skrip migrasi.
- Tanpa dependensi baru.
- `npm run test:run`, `npm run typecheck`, `npm run build` harus hijau sebelum tiap commit.
- Commit per bagian logis. Push hanya bila diminta.
