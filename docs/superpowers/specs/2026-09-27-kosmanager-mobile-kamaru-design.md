# kosmanager Mobile — Prototype Bergaya Kamaru

**Tanggal:** 2026-09-27
**Status:** Disetujui, siap dikerjakan (Ronde 1)

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

### Ronde 2 — form (setelah Ronde 1 disetujui)

Tambah penghuni (termasuk peringatan merah "kamar masih terisi"), Tambah properti
dua langkah, Tambah kamar, sheet Catat pembayaran, kalender berfungsi.

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

Buka link di HP, lalu periksa tiga hal:

1. Safe area atas dan bawah tidak tertimpa konten.
2. Semua target sentuh minimal 44x44px.
3. Tidak ada scroll horizontal yang nyangkut di layar mana pun.
