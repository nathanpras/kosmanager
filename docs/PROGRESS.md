# Status proyek kosmanager

Titik masuk untuk melanjutkan kerja dari mesin mana pun.

**Terakhir diperbarui:** 1 Oktober 2026 · `npm run test:run` 233/233 hijau ·
mockup `_smoke.cjs` 95/95 hijau · **port tahap 1 selesai**

> **Kerjakan dari beberapa mesin.** Repo ini dikerjakan bergantian dari lebih
> dari satu komputer. Selalu `git pull --rebase` sebelum mulai, dan push begitu
> selesai. Jangan pernah force push.

---

## Dua jalur yang sedang jalan

| Jalur | Isi | Status |
|---|---|---|
| **A. Aplikasi** | Vue 3 + Pinia + Firestore di `src/` | Aktif dikembangkan. Tampilan desktop dianggap selesai. |
| **B. Prototype mobile** | Mockup HTML sekali pakai bergaya aplikasi **Kamaru**, di `docs/superpowers/mockups/` | Ronde 1–5 selesai, **tidak ada lagi tombol buntu**. Belum di-port ke `src/`. |

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
| `docs/superpowers/specs/2026-09-27-kosmanager-mobile-kamaru-design.md` | Kontrak desain ronde 1–3 |
| `docs/superpowers/specs/2026-10-01-kosmanager-mobile-ronde-4-design.md` | Kontrak desain ronde 4 |
| `docs/superpowers/specs/2026-10-01-kosmanager-mobile-ronde-5-design.md` | Kontrak desain ronde 5 |
| `docs/superpowers/mockups/kosmanager-mobile.html` | Mockup, satu berkas mandiri |
| `docs/superpowers/mockups/_smoke.cjs` | 95 langkah uji di jsdom |
| `docs/superpowers/mockups/_shots.cjs` | 50 potret layar via chromium (Windows, macOS, Linux) |

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
| Huruf | Inter saja, dipilih 28 September dari tujuh opsi. `cv05` + `ss01` menyala supaya `Il1` terbedakan. Aturan lama "serif dan mono tidak merender angka" tetap dicatat di kontrak desain |
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

**Ronde 3 — kelengkapan penghuni.** Rencananya ada di
`docs/superpowers/plans/2026-09-28-kosmanager-mobile-ronde-3.md`. Isinya:

- Seluruh huruf diganti ke Inter.
- Riwayat penghuni per properti dan per kamar, termasuk profil mantan penghuni
  yang hanya bisa dibaca.
- Catatan internal bertanggal: bisa ditambah, diubah, dan dihapus dengan
  konfirmasi dua langkah.
- Ubah data penghuni, dengan validasi nama dan nomor HP.
- Unggah foto dan dokumen lewat pemilih berkas sungguhan, dilengkapi penampil
  dengan tombol Ganti dan Hapus.
- Sheet WhatsApp dengan templat per status tagihan yang membuka `wa.me`.

**Sudah dikonfirmasi 1 Oktober 2026:** tombol **Buka WhatsApp** dicoba di link
hidup dan langsung membuka WhatsApp dengan pesannya terbawa. Sandbox artifact
**tidak** memblokir navigasi ke `wa.me`, jadi tombol "Salin pesan" yang
disiapkan sebagai cadangan tidak jadi dibuat.

**Ronde 4 — uang dan kontrak sewa.** Kontraknya ada di
`docs/superpowers/specs/2026-10-01-kosmanager-mobile-ronde-4-design.md`.
Enam sheet baru menutup sepuluh jalan buntu:

- **Tambah transaksi** — satu sheet bersegmen Tagihan / Deposit / Biaya lain;
  jenis bisa diganti tanpa sheet ditutup.
- **Ubah harga**, **Ubah masa tinggal** (check-out terbuka atau bertanggal),
  **Pindah kamar**, **Hapus sewa**, dan **Catat pengeluaran**.

Semuanya benar-benar mengubah data. Tiga hal yang jangan sampai terbalik saat
port nanti:

- Tagihan dan biaya lain masuk `TAGIHAN[rid]`, **bukan** `TXN`. Hanya deposit
  dan pengeluaran yang menyentuh arus kas properti. Tagihan itu kewajiban.
- "Hapus sewa" memindahkan penghuni ke riwayat, tidak menghapus barisnya —
  sama seperti `tgl_keluar` di aplikasi.
- Pindah kamar memakai aturan 23 Agustus: bulan berjalan tetap ditagih kamar
  lama penuh, kamar baru mulai tanggal 1 bulan berikutnya.

**Ronde 5 — sepuluh jalan buntu terakhir.** Kontraknya ada di
`docs/superpowers/specs/2026-10-01-kosmanager-mobile-ronde-5-design.md`.
Galeri foto kamar, info properti, logo properti, tiga menu bertitik tiga,
notifikasi, layar cari, dan tanggal kalender yang bisa dipilih.

Setelah ronde ini **tidak ada satu pun tombol yang hanya memunculkan toast** —
dijaga oleh satu langkah uji penutup yang menelusuri 20 rute, 15 sheet, dan 3
formulir lalu menggagalkan uji bila menemukan `data-act="soon"` yang dirender.

Yang perlu diingat saat port:

- Notifikasi dan agenda kalender **diturunkan dari `ROOMS`**, bukan daftar
  tersimpan. Mengubah status kamar langsung mengubah keduanya.
- Ikon cari di layar Penghuni **memfokuskan kolom cari yang sudah ada**, bukan
  membuka layar cari kedua.
- Menu bertitik tiga hanya berisi pintasan. Tidak ada layar yang satu-satunya
  jalannya lewat menu itu.
- Foto kamar disimpan di `FOTO[rid]`, terpisah dari `DOK` yang isinya dokumen
  penghuni — penghuni berganti, kamarnya tetap.

### Port ke aplikasi — sedang berjalan

Kontrak dan urutan enam tahapnya:
`docs/superpowers/specs/2026-10-01-port-mobile-ke-aplikasi-design.md`

**Tahap 1 selesai.** Fondasi berdiri: `src/style.mobile.css` hasil panen,
`MobIcon` / `MobScreen` / `MobileShell`, rute `/m` dengan tiga tab, dan tiga
layar yang masih kosong.

Yang wajib diingat sebelum menyentuh apa pun di sini:

- **Setiap selektor di `src/style.mobile.css` diawali `.kmob`.** Itu syarat,
  bukan gaya penulisan. `src/style.css` seluruhnya tanpa lapisan, dan aturan
  tanpa lapisan menang atas aturan berlapis — jadi `@layer` tidak bisa dipakai
  untuk melindungi diri. Dijaga uji `src/tests/mobile/isolasiCss.test.ts`.
- **Berkas itu hasil panen**, bukan tulisan tangan. Kalau bentuknya perlu
  berubah, ubah mockup-nya lalu jalankan
  `python3 docs/superpowers/mockups/_panen-css.py` — supaya mockup tetap jadi
  acuan desain yang sahih.
- **Nama `@keyframes` berawalan `kmob-`.** Nama keyframes bersifat global;
  `modalIn`, `sheetUp`, dan `toastIn` ada di kedua stylesheet.
- **`/m` belum jadi bawaan** dan belum ada pengalihan otomatis dari layar
  sempit. Itu tahap 6, setelah alur intinya setara.

Tahap berikutnya: **tahap 2 — layar baca** (beranda, detail properti, detail
kamar) dari store sungguhan.

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
- **jsdom tidak punya pemilih berkas dan tidak bisa bernavigasi.** Uji unggah
  menyuntikkan `File` palsu ke `#berkas-in` lewat `Object.defineProperty(…,
  'files')` dan mengganti `URL.createObjectURL`. Uji tautan `wa.me` memasang
  `preventDefault` di `document` sebelum mengklik. Kalau tidak, jsdom
  melaporkan "Not implemented: navigation".
- **Potret bisa menangkap layar di tengah animasi dan terlihat seperti bug.**
  Layar Kalender terpotret kosong melompong setelah tanggal diketuk. Isinya
  ternyata lengkap di DOM — 31 sel tanggal, 3 anak `.stagger` — hanya
  transparan: `getAnimations()` melaporkan `rise:running@0`, sedangkan tanpa
  klik `rise:finished@1`. Waktu virtual chromium bisa melompat tanpa menjalankan
  satu frame animasi pun, dan `animation-fill-mode: both` membuat elemen yang
  animasinya beku di detik nol tampil pada keadaan `from`, yaitu `opacity: 0`.
  Sekarang runner memanggil `getAnimations().forEach(a => a.finish())` sebelum
  dipotret. **Jangan percaya potret kosong sebelum DOM-nya diukur.**
- **`_shots.cjs` tidak pernah membaca `document.title`.** Runner-nya menulis
  kegagalan langkah ke sana sejak ronde 2, dan tidak ada satu pun yang
  membacanya — jadi setiap langkah potret yang error lolos diam-diam selama
  tiga ronde. Sekarang `--dump-dom` ikut dipanggil, judulnya dibaca, dan run
  gagal bila ada yang menulis `GAGAL`.
- **Penanda dan daftar yang menceritakan hal sama dari dua aturan berbeda.**
  Titik "jatuh tempo" di kalender ikut menandai kamar yang sudah lunas,
  sedangkan agenda di bawahnya tidak — tanggal 5 bertitik biru tapi agendanya
  0. Satu aturan sekarang dipakai keduanya (`PUNYA_TAGIHAN`), dijaga uji
  "setiap tanggal bertitik tagihan punya agenda".
- **Baris daftar tiga tingkat selalu kurang lebar.** Di layar Notifikasi,
  `properti · nominal` dalam satu baris terpotong jadi
  `Raffles Kost Citra 1 · Rp1.750.000 bel…`, dan setelah nominalnya dipindah ke
  kolom sendiri, `nama · Kamar X` masih memotong nama panjang jadi
  `Kevin Tanoto · Kam…`. Yang berhasil: nilai berdiri sendiri di kanan, nama
  sendirian di satu baris, nomor kamar dan properti digabung di baris bawahnya.
  Nama properti tidak boleh dibuang — kamar 101–107 ada di **kedua** properti.
- **Audit ikon sempat buta terhadap ikon yang dititipkan sebagai data.**
  Regex-nya hanya mencari `ic('nama')`, padahal item sheet, notifikasi, dan
  agenda menulis `i: 'nama'` lalu memanggil `ic(n.i)`. Salah ketik di sana
  merender kotak kosong tanpa error. Setelah regexnya ditambah, ikon yang
  terawasi naik dari 17 jadi 27.
- **Kolom sempit memotong nilai tanpa memberi tanda.** Di `.fgrid.wide`
  (`1.4fr 1fr`) kolom kanan memotong `27 Sep 2026` jadi `27 Sep 2…`, dan kolom
  sempit mana pun memotong kategori `Transfer Tanah` jadi `Transfer…` —
  sehingga `Gaji Pembantu` dan `Gaji Pengurus` nyaris tak terbedakan.
  Aturannya: tanggal hanya boleh di kolom lebar atau satu baris penuh, dan
  daftar yang nilainya bisa panjang selalu satu baris penuh. Ketiganya lolos
  jsdom dan baru ketahuan di potret.
- **Skrip potret sempat hanya jalan di satu sistem.** `_shots.cjs` mencari
  chromium di `~/AppData/Local/ms-playwright`, jalur Windows, jadi di macOS ia
  mati sebelum memotret apa pun — justru pada mesin tempat bug tata letak
  ditemukan. Sekarang ia mencari di ketiga sistem. Repo ini dikerjakan dari
  lebih dari satu komputer; perkakasnya harus ikut lintas sistem.
- **Layar di bawah modal tidak digambar ulang sendiri.** Setelah modal
  menyimpan data yang tampil di layar dasar (misalnya Ubah data penghuni),
  set `dasarBasi = true` supaya layar itu dirender ulang saat modal tertutup.
