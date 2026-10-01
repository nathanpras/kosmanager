# Port shell mobile ke aplikasi

**Tanggal:** 2026-10-01
**Induk:** `2026-09-27-kosmanager-mobile-kamaru-design.md` dan kontrak ronde 4–5.
**Sumber:** `docs/superpowers/mockups/kosmanager-mobile.html` (ronde 1–5, 95/95 uji hijau)

## Tujuan

Memindahkan shell mobile bergaya Kamaru dari mockup ke aplikasi sungguhan,
dengan data Firestore yang asli, **tanpa menyentuh tampilan desktop.**

Ini pekerjaan besar dan bertahap. Dokumen ini mengunci cara hidupnya
berdampingan dan urutan kerjanya, supaya tiap tahap bisa dikirim sendiri dan
aplikasi tidak pernah dalam keadaan setengah jadi di tangan pengguna.

## Fakta yang menentukan strategi

Diukur, bukan ditebak:

| | Jumlah |
|---|---|
| Class CSS di `src/style.css` | 172 |
| Class CSS di mockup | 199 |
| **Bentrok** | **11** — `badge brand btn card danger filled org primary toast topbar w3` |
| **Token bentrok** | **0** |

Nol token bentrok berarti palet dan irama gerak mockup bisa masuk tanpa
mengganggu apa pun. Sebelas class yang bentrok semuanya inti — `.card`, `.btn`,
`.topbar`, `.toast`, `.badge` — jadi menyalin `@layer components` mentah-mentah
akan merusak desktop.

**Lapisan CSS tidak bisa dipakai untuk melindungi diri di sini.** Aturan tanpa
lapisan menang atas aturan berlapis apa pun, dan seluruh `src/style.css` tidak
berlapis. Jadi `@layer components .card` milik mockup justru akan kalah oleh
`.card` milik aplikasi — kebalikan dari yang dibutuhkan.

## Keputusan yang dikunci

| Hal | Pilihan | Alasan |
|---|---|---|
| Pemisahan CSS | Seluruh CSS mockup diturunkan ke `src/style.mobile.css`, **setiap selektor diawali `.kmob`** | `.kmob .card` (0,2,0) menang atas `.card` (0,1,0) tanpa bergantung pada lapisan. Desktop tidak pernah punya `.kmob` sebagai leluhur, jadi tidak tersentuh sama sekali |
| Token | Ikut diturunkan ke `.kmob`, bukan `:root` | Walau tidak ada yang bentrok hari ini, token di `:root` akan bocor ke desktop dan jadi ranjau untuk perubahan berikutnya |
| Aturan `html`/`body`/`.phone` | **Tidak** ikut diport | Itu bingkai telepon milik mockup — latar gelap, `place-items:center`, bayangan perangkat. Di aplikasi sungguhan, layarnya memang seluruh layar |
| Rute | Subpohon `/m/...` di router yang sama | Shell mobile punya IA sendiri (3 tab + drill-down), tidak bisa dipetakan ke 9 rute datar yang ada |
| Kapan jadi bawaan | **Belum.** Selama port masih sebagian, `/m` hanya bisa dibuka sengaja | Menjadikan IA setengah jadi sebagai tampilan mobile bawaan jelas lebih buruk daripada yang sudah ada sekarang. Pengalihan otomatis dipasang setelah alur inti setara |
| Ikon | Peta 27 ikon milik mockup jadi komponen sendiri | Gaya garisnya beda dengan `AppIcon.vue` dan namanya beda. Menggabungkan keduanya berarti mengubah ikon desktop |
| Dependensi | Tetap nol tambahan | Aturan yang berlaku sejak awal proyek |

## Batas tegas

- `src/style.css` **tidak diubah**, hanya ditambah berkas baru di sebelahnya.
- Tampilan desktop tidak berubah satu piksel pun.
- `npm run test:run` (221) harus tetap hijau di tiap commit.
- Tidak ada skema Firestore baru. Yang di mockup berupa isian dummy dan belum
  ada di Firestore tetap tidak ditampilkan, atau ditampilkan apa adanya sebagai
  "belum ada" — **bukan** dikarang.

## Yang dipanen vs yang ditulis ulang

| Lapis mockup | Nasib |
|---|---|
| `@layer tokens` | Dipanen utuh → `.kmob { … }` |
| `@layer components` | Dipanen, dikurangi reset global dan aturan bingkai telepon |
| `@layer screens` | Dipanen |
| Peta ikon `P` | Dipanen jadi komponen Vue |
| Fungsi render per layar | **Ditulis ulang** jadi SFC |
| Objek `state` dummy | **Dibuang** — diganti store Pinia |
| Router hash buatan sendiri | **Dibuang** — diganti vue-router |
| Mesin sheet dan penampil berkas | Ditulis ulang jadi komponen, perilakunya ditiru |

## Urutan kerja

Tiap tahap berdiri sendiri: bisa di-commit, diuji, dan ditinggal tanpa
meninggalkan aplikasi dalam keadaan rusak.

**Tahap 1 — fondasi.** `src/style.mobile.css` berisi CSS yang sudah diturunkan
dan diberi awalan, komponen ikon, `MobileShell.vue` berisi dok tiga tab dan
tumpukan layar, rute `/m` beserta anak-anaknya, dan tiga layar tab yang masih
kosong. Belum ada data. Yang diuji: desktop tidak berubah, `/m` bisa dibuka,
dok berpindah tab.

**Tahap 2 — layar baca.** Beranda (chip statistik + daftar properti), detail
properti (tab Kamar / Transaksi / Lainnya), detail kamar. Semua dari store
sungguhan, baca saja.

**Tahap 3 — tab Penghuni dan Kalender.** Termasuk cari dan filter.

**Tahap 4 — aksi uang.** Sheet Catat pembayaran, Tambah tagihan, Pengeluaran —
memakai ulang composable yang sudah ada (`useTagihanCalc`, `useSaldo`), bukan
menulis aturan uang yang kedua.

**Tahap 5 — sisanya.** Pindah kamar, hapus sewa, catatan, foto, notifikasi.

**Tahap 6 — jadikan bawaan.** Pengalihan otomatis untuk layar sempit, dan
keputusan tentang nasib `AppBottomNav` lama.

## Cara memverifikasi

    npm run test:run     # 221 harus tetap hijau
    npm run typecheck
    npm run build

Tiap tahap menambah uji komponennya sendiri lewat `@vue/test-utils`, yang sudah
terpasang. Uji mockup (`_smoke.cjs`, 95 langkah) tetap jadi acuan desain dan
tidak dihapus — kalau perilaku hasil port berbeda dari mockup, salah satunya
harus diperbaiki secara sadar.

Khusus tahap 1, yang paling penting diuji adalah **desktop tidak berubah**:
tidak ada satu pun aturan di `style.mobile.css` yang berlaku tanpa leluhur
`.kmob`.
