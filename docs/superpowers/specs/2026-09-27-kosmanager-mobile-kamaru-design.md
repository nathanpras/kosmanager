# kosmanager Mobile — Prototype Bergaya Kamaru

**Tanggal:** 2026-09-27
**Status:** Ronde 1, 2, dan 3 selesai. Mockup ada di `docs/superpowers/mockups/kosmanager-mobile.html`.

## Tujuan

Menguji apakah model interaksi aplikasi **Kamaru** cocok untuk kosmanager di HP.
Tampilan desktop kosmanager sudah dianggap selesai dan **tidak disentuh**. Fase ini
hanya menghasilkan mockup HTML sekali pakai yang bisa dibuka di HP, untuk menilai
rasa (bentuk, alur, animasi) sebelum ada satu baris pun kode aplikasi ditulis.

Kriteria sukses: setelah memegang mockup di HP, pemilik bisa memutuskan dengan
yakin apakah struktur 3-tab + drill-down ala Kamaru layak diteruskan jadi shell
mobile asli.

## Keputusan yang sudah dikunci

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Fidelity | Mockup dulu, port belakangan | Yang dinilai adalah rasa UI; iterasi di mockup jauh lebih murah daripada di kode app |
| Navigasi | Persis Kamaru — 3 tab bawah | Properti / Kalender / Penghuni. Tagihan tidak jadi tab, diakses lewat chip di Home dan chip status di kartu kamar |
| Palet | Bentuk Kamaru, warna kosmanager | Rounding/spacing/kartu/animasi ikut Kamaru; aksen tetap biru `#0070C0` + kuning `#FFC000` supaya nyambung dengan desktop |
| Huruf | Inter saja | Dipilih 28 September dari tujuh opsi yang dipasang ke layar yang sama. Satu keluarga untuk judul, UI, angka, dan label; menggantikan trio Instrument Serif / Instrument Sans / DM Mono |
| Teknis | Satu file HTML self-contained | Bisa dibuka di HP lewat link tanpa syarat jaringan; nol risiko ke `src/` |

### Alternatif yang ditolak

- **Vue SFC di repo pada route `/proto`** — port jadi mudah, tapi ini praktis
  sudah "shell asli" yang secara sadar ditunda; juga mewajibkan HP satu WiFi
  dengan PC dan lolos firewall Windows.
- **HTML statis di `public/` lewat `vite preview`** — sama ribetnya, tanpa
  keuntungan hot-reload.

## Arsitektur mockup

Satu berkas: `docs/superpowers/mockups/kosmanager-mobile.html`

Tiga lapis terpisah supaya sebagian bisa dipanen saat port:

```
@layer tokens      -> custom property: warna, radius, shadow, easing, spacing
@layer components  -> .card .chip .pill-tabs .sheet .fab .avatar .row ...
@layer screens     -> tata letak khusus tiap layar
```

**Lapis `tokens` + `components` dirancang untuk disalin utuh ke `src/style.css`
saat port.** Hanya lapis `screens` dan markup yang ditulis ulang jadi SFC Vue.

JavaScript: vanilla, tanpa framework.
- Satu objek `state` berisi data dummy
- Satu fungsi render per layar
- Router berbasis hash (`#/prop/1/room/101`) supaya **tombol back fisik HP jalan**

Frame: `100dvh`, `env(safe-area-inset-*)`, target lebar 390-430px.

## Peta data: Kamaru -> kosmanager

`Penghuni` milik kosmanager sudah praktis setara dengan konsep "Lease" milik Kamaru.

| Kamaru | Sudah ada di kosmanager | Gap |
|---|---|---|
| Property (nama, daerah, logo, tipe) | `Property.nama/alamat/no_hp` | logo, tipe properti |
| Room (nomor, nama, deskripsi) | `Kamar.nomor/tipe/harga` | — |
| Lease: check-in + jam, check-out, durasi, jumlah orang | `Penghuni.masuk/kontrak_selesai`, `Kamar.jmlk` | jam check-in, durasi terhitung, tgl tagih per-penghuni |
| Invoice / transaksi | `Tagihan` | — |
| Deposit / DP / biaya lain | `Kamar.deposit/dp_nominal/nominal_tambahan` | ada, tapi nempel di Kamar bukan per-penghuni |
| Dokumen (wajah, ID, berkas) | `Penghuni.ktp` (teks) | upload gambar |

**Aturan:** setiap gap di kolom kanan hanya ditampilkan sebagai **field dummy** di
mockup. Tidak ada skema Firestore baru pada fase ini. Apakah gap benar-benar perlu
masuk database diputuskan setelah mockup dievaluasi.

## Layar

### Ronde 1 — tulang punggung

1. **Home / Daftar Properti**
   Sapaan + kartu "Update hari ini" berisi 7 chip bisa-tekan: Terisi, Kosong,
   Telat, Jatuh tempo, Booked, Check-in, Check-out. Menekan chip membuka daftar
   terfilter. Di bawahnya daftar properti: logo/inisial, nama, daerah, badge
   "Sewa per kamar". Tombol `+ Properti`.

2. **Detail Properti**
   Header back + judul + menu. Tab pil: **Kamar / Transaksi / Lainnya**.
   - *Kamar*: kartu per kamar berisi lingkaran nomor, nama penghuni,
     `Rp x / bulan`, chip Lunas/Belum/Telat. FAB `+ Kamar`.
   - *Transaksi*: pemasukan & pengeluaran properti ini; empty state ilustratif.
     FAB `+ Pengeluaran`.
   - *Lainnya*: Catatan internal, Riwayat penghuni, Info properti.

3. **Detail Kamar**
   Tab pil: **Penghuni / Harga / Transaksi / Lainnya**.
   Tab Penghuni berisi kartu penghuni aktif (avatar inisial, nama, kontak),
   grid Check-in / Check-out, grid Durasi / Jumlah orang, lalu blok Harga sewa
   dengan tombol **Aksi**, dan baris tagihan periode berikut chip status.
   Di bawahnya seksi "Penghuni sebelumnya".

4. **Sheet Aksi** (bottom sheet)
   Catat pembayaran · Tambah tagihan · Tambah deposit · Tambah biaya lain ·
   Lihat kamar · Pengaturan sewa -> sub-sheet (Ubah harga, Ubah masa tinggal,
   Pindah kamar, Hapus sewa).

5. **Info Penghuni**
   Nama lengkap, jenis kelamin, asal, pekerjaan, HP dengan tombol WA, kontak
   darurat. Grid **Foto & dokumen**: Wajah / KTP / Berkas.

6. **Tab Penghuni**
   Daftar penghuni aktif lintas properti, kolom cari, filter chip.

7. **Tab Kalender**
   Kerangka grid bulan dengan titik penanda check-in / check-out / jatuh tempo.
   Belum berfungsi penuh pada ronde ini.

### Ronde 2 — form (selesai)

8. **Tambah penghuni**
   Layar modal yang naik dari bawah; layar di bawahnya mundur jadi kartu.
   Berisi Tinggal di, Masa tinggal, peringatan merah bila kamar masih
   ditempati, Harga sewa (terisi otomatis dari kamar yang dipilih), Komponen
   tambahan, Rincian pembayaran, dan Data penghuni.

9. **Properti baru**
   Modal dua langkah dengan penanda langkah. Langkah satu: nama, jenis,
   deskripsi. Langkah dua: logo, jenis sewa (tidak bisa diubah setelah
   disimpan), alamat, telepon rumah.

10. **Tambah kamar**
    Bottom sheet dengan petunjuk nomor kamar terakhir.

11. **Catat pembayaran**
    Bottom sheet dengan pintasan Lunas penuh / Setengah / Kosongkan, lalu
    tanggal, metode, dan catatan.

12. **Pemilih nilai**
    Sheet daftar untuk properti, kamar, jam, metode, dan sejenisnya. Dibuka
    dari dalam sheet lain, ia **kembali ke sheet induknya** setelah memilih,
    bukan menutup semuanya.

13. **Pemilih tanggal**
    Kalender ringkas di dalam sheet, bulannya bisa digeser.

14. **Kalender** bisa digeser maju-mundur antar bulan.

### Ronde 3 — kelengkapan penghuni (selesai)

15. **Ganti huruf ke Inter.** Dikerjakan paling awal, sebelum layar baru.
    Satu keluarga untuk semua peran:
    - Judul memakai berat 700 dengan jarak huruf `-0.035em`.
    - Label huruf besar memakai Inter dengan letter-spacing.
    - Fitur `cv05` (l berekor) dan `ss01` (angka terbuka) dinyalakan
      global supaya `Il1` tetap mudah dibedakan.
    - Instrument Serif, Instrument Sans, dan DM Mono dilepas dari
      `<link>` Google Fonts.

16. **Edit penghuni.** Ikon pensil di header Info Penghuni membuka modal
    Tambah penghuni dalam mode ubah, hanya berisi Data diri dan Kontak.
    Harga dan masa tinggal tetap diurus di Pengaturan sewa.
    - Nama wajib diisi.
    - No. HP harus lolos aturan `normalizePhone` milik `useWAReminder`
      (buang non-digit, `0` di depan jadi `62`, minimal 8 digit).
    - Kalau validasi gagal, muncul `.note` merah dan Simpan tidak jalan.
    - Kalau berhasil, data di memori diperbarui, modal kembali ke Info
      Penghuni, dan muncul toast "Data penghuni disimpan".

17. **Riwayat penghuni.** Layar drill-down, dibuka dari:
    - Lainnya di detail properti (gabungan semua kamar)
    - Lainnya di detail kamar
    - Baris "Penghuni sebelumnya"

    Isinya kartu mantan penghuni: avatar inisial, nama, kamar, rentang
    masuk–keluar, dan durasi, diurutkan dari tanggal keluar terbaru. Data
    dummy 0–3 orang per kamar. Kamar tanpa riwayat menampilkan
    `.emptystate`.

    Tap kartu membuka Info Penghuni **mode baca saja**:
    - Ada chip "Mantan penghuni".
    - Tanpa ikon pensil, tanpa tombol Aksi, dan tanpa template tagihan di
      sheet WhatsApp.

18. **Catatan internal.** Layar drill-down per properti dan per kamar.
    - Kartu berisi tanggal dan teks, terbaru di atas.
    - FAB "+ Catatan" membuka sheet berisi textarea dan pemilih tanggal
      (dipakai ulang dari ronde 2).
    - Tap kartu membuka sheet yang sama untuk mengubah catatan.
    - Hapus memakai konfirmasi dua langkah di dalam sheet, bukan
      `confirm()` yang diblokir artifact.
    - Catatan kosong tidak bisa disimpan.
    - Baris di tab Lainnya menampilkan jumlah catatan dan potongan
      catatan terbaru.

19. **Unggah foto dan dokumen.** Ubin di grid Foto & dokumen memakai
    `<input type=file>` sungguhan:

    | Ubin | Isi yang diterima | Kamera |
    |---|---|---|
    | Foto wajah | gambar | `capture=user` |
    | KTP | gambar | `capture=environment` |
    | Berkas lain | gambar atau PDF | tanpa `capture` |

    - Thumbnail ditampilkan lewat `URL.createObjectURL`.
    - PDF tampil sebagai ikon berkas beserta namanya.
    - Tap ubin yang sudah terisi membuka penampil layar penuh dengan tombol
      Ganti dan Hapus. Hapus memanggil `revokeObjectURL`.
    - Ubin "Tambah" menambah berkas lain. Tautan "Kelola" dibuang.
    - Semua berkas hanya tersimpan di memori dan hilang saat halaman dimuat
      ulang. Tidak ada kompresi atau batas ukuran.

20. **Sheet WhatsApp.** Dibuka dari tombol WhatsApp di kartu profil dan
    tombol Chat di blok Kontak.
    - Kontrol segmen berisi empat template: Jatuh tempo, Telat, Kuitansi
      lunas, dan Kosong.
    - Template awal mengikuti status tagihan:

      | Status | Template awal |
      |---|---|
      | telat | Telat |
      | belum | Jatuh tempo |
      | lunas | Kuitansi lunas |
      | tombol Chat | Kosong |

    - Placeholder diganti dengan cara yang sama seperti
      `generateReminderMessage`: `{nama}`, `{kamar}`, `{bulan}`, `{sisa}`,
      `{jatuh_tempo}`.
    - Teks pesan bisa diedit. Nomor tujuan tampil dalam format `62…`.
    - "Buka WhatsApp" adalah tautan `https://wa.me/<nomor>?text=…` dengan
      `target=_blank`.
    - HP tidak valid menonaktifkan tombol itu dan memunculkan `.note` merah.
    - Sandbox artifact mungkin memblokir navigasi ke luar. Ini dicek di link
      hidup; kalau benar terblokir, ditambahkan tombol "Salin pesan".

## Aturan tipografi yang lahir dari pengujian

Angka **1** pada Instrument Serif tidak berkaki, sehingga `Rp1.800.000` terbaca
`Rpl.800.000`. DM Mono memakai nol bergaris (Ø), sehingga `27 SEP 2026` terbaca
`27 SEP 2Ø26`.

Aturannya: **huruf serif dan mono tidak pernah merender angka.** Helper
`numify()` mengalihkan setiap deret angka di dalam judul serif ke Instrument
Sans. Label `.mlabel` tetap mono selama isinya hanya huruf; yang memuat angka
memakai varian `.mlabel.fig`.

Sejak ronde 3 seluruh mockup memakai Inter, sehingga aturan ini tidak lagi
berefek: `numify()` dan `.mlabel.fig` dibiarkan tetap ada, tetapi hanya
mengalihkan dari Inter ke Inter. Aturannya berlaku lagi bila suatu saat huruf
serif atau mono dipakai kembali.

## Spesifikasi animasi

| Elemen | Perilaku |
|---|---|
| Pindah level | Slide dari kanan + parallax halus pada layar di bawahnya, 260ms `cubic-bezier(.32,.72,0,1)` |
| Tab pil | Pil aktif *morph* posisi & lebar (teknik FLIP), 220ms — bukan fade |
| Bottom sheet | Naik 320ms + backdrop fade; bisa ditarik turun dengan rubber-band & snap |
| Daftar kartu | Stagger fade + naik 8px, jeda 28ms per kartu, hanya saat pertama muncul |
| Angka chip Home | Count-up 400ms |
| FAB | Menyusut jadi ikon saat scroll turun, melebar lagi saat scroll naik |
| Tekan kartu | `scale(.98)` selama 100ms |

Seluruhnya dinonaktifkan di bawah `@media (prefers-reduced-motion: reduce)`.

## Batas tegas

- `src/` tidak disentuh sama sekali.
- Tidak ada Firestore, autentikasi, atau perubahan skema.
- Tidak ada dark mode di mockup. kosmanager sudah punya token gelap, tapi fase
  ini fokus ke bentuk.
- Data dummy memakai nama properti asli (Raffles Kost Citra 1, Raffles Kost
  Waru 23) supaya penilaiannya terasa nyata.

## Cara memverifikasi

Dua lapis, keduanya dijalankan dari akar repo:

    node docs/superpowers/mockups/_smoke.cjs    # 66 langkah di jsdom
    node docs/superpowers/mockups/_shots.cjs    # 28 potret layar via chromium

jsdom tidak punya mesin tata letak, jadi ia buta terhadap bug visual. Tiga bug
nyata hanya ketahuan setelah dipotret:

- `.mval.empty` diam-diam mewarisi `.empty { text-align:center; padding:38px }`
  milik blok empty-state.
- Angka pada huruf serif salah terbaca.
- Aturan `.note` hilang seluruhnya saat lapis visual dirombak, sehingga kotak
  peringatan merah tampil sebagai teks polos.

Dua audit statis kini menjaga kelas bug itu: setiap ikon yang dipanggil harus
ada di peta ikon, dan setiap class yang pernah dirender harus punya aturan CSS.

Di HP, periksa tiga hal: safe area atas dan bawah tidak tertimpa konten, semua
target sentuh minimal 44x44px, dan tidak ada scroll horizontal yang nyangkut.
