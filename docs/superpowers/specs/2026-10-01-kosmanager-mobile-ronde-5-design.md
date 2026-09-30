# kosmanager Mobile — Ronde 5: sepuluh jalan buntu terakhir

**Tanggal:** 2026-10-01
**Berkas:** `docs/superpowers/mockups/kosmanager-mobile.html`
**Induk:** `2026-09-27-kosmanager-mobile-kamaru-design.md` dan
`2026-10-01-kosmanager-mobile-ronde-4-design.md`. Semua batas di sana tetap berlaku.

## Tujuan

Menghabiskan sisa jalan buntu. Setelah ronde ini **tidak ada lagi tombol yang
hanya memunculkan toast** — seluruh mockup bisa ditelusuri tanpa menabrak
dinding, sehingga yang dinilai di HP adalah alurnya yang utuh.

Sepuluh yang tersisa semuanya di luar tema uang: foto, info, menu, notifikasi,
dan pencarian.

## Sepuluh tujuan

| # | Jalan buntu | Jadi apa |
|---|---|---|
| 1 | Foto kamar | Layar `foto/<rid>` — galeri dengan pemilih berkas sungguhan |
| 2 | Info properti | Layar `info/<pid>` — keterangan properti, baca saja |
| 3 | Uploader logo | Pemilih berkas sungguhan di Properti baru langkah 2 |
| 4 | Menu properti | Sheet berisi lima pintasan |
| 5 | Menu kamar | Sheet berisi pintasan yang ikut keadaan kamar |
| 6 | Menu kalender | Sheet berisi tiga sakelar penanda |
| 7 | Notifikasi | Layar `notif` — daftar yang diturunkan dari data, bukan dummy |
| 8 | Cari di beranda | Layar `cari` — properti, kamar, dan penghuni sekaligus |
| 9 | Cari di tab Penghuni | Memfokuskan kolom cari yang **sudah ada** di layar itu |
| 10 | Tap tanggal kalender | Memilih tanggal; agenda di bawahnya ikut tanggal itu |

## Keputusan yang dikunci di ronde ini

| Hal | Pilihan | Alasan |
|---|---|---|
| Cari di tab Penghuni tidak menambah kolom kedua | Ikon di header memfokuskan kolom yang sudah ada | Layar itu **sudah** punya kolom cari yang berfungsi sejak Ronde 1. Menambah layar cari kedua berarti dua kotak cari di satu layar — menambah barang, bukan menambah guna |
| Menu hanya berisi pintasan ke yang sudah ada | Tidak ada tujuan baru yang hanya bisa dicapai lewat menu | Menu di Kamaru memang pintasan. Menaruh satu-satunya jalan ke sebuah layar di balik menu bertitik tiga menyembunyikannya |
| Menu kalender diberi isi yang bekerja | Tiga sakelar penanda: Check-in, Jatuh tempo, Telat | Kalender dengan tiga jenis titik sekaligus jadi ramai. Sakelar membuatnya berguna, bukan sekadar mengisi menu |
| Notifikasi diturunkan dari data | Telat, jatuh tempo, check-in hari ini, booked | Daftar notifikasi karangan tidak menguji apa pun. Yang diturunkan dari `ROOMS` ikut berubah saat data berubah, jadi alurnya benar-benar teruji |
| Foto kamar memakai mesin berkas Ronde 3 | `SLOT` bertambah satu, penampil layar penuh dipakai ulang | Menulis penampil kedua berarti dua tempat yang harus dijaga |
| Tap tanggal memilih, bukan membuka sheet | Tanggal terpilih ditandai, agenda di bawahnya mengikuti | Sheet menutupi kalendernya sendiri, padahal yang ingin dilihat justru hubungan antara tanggal dan agendanya |

## Rincian

### 1. Foto kamar — `foto/<rid>`

Galeri memakai `.docgrid` dan `.doc` yang sudah ada. Ubin "Tambah" membuka
`<input type=file>` sungguhan (`accept="image/*"`, `capture="environment"`).
Ubin terisi membuka penampil layar penuh Ronde 3 lengkap dengan Ganti dan Hapus.

Foto disimpan di `FOTO[rid]`, terpisah dari `DOK` — `DOK` berkunci id kamar tetapi
isinya dokumen **penghuni**, jadi menumpuknya di sana akan mencampur dua hal.

`SLOT` bertambah satu entri `foto`. `berkasDi()`, `terimaBerkas()`, dan penghapusan
di penampil bercabang satu baris untuk slot itu.

Baris "Foto kamar" di tab Lainnya menampilkan jumlah foto.

### 2. Info properti — `info/<pid>`

Baca saja. Keterangan tersimpan: nama, jenis, alamat, daerah, telepon, jenis sewa.
Keterangan terhitung: jumlah kamar, terisi, kosong, dan harga sewa terendah–tertinggi.

`PROPS` bertambah field dummy `tipe`, `alamat`, `hp`, dan `sewa` — mengikuti
aturan induk: yang belum ada di Firestore hanya muncul sebagai isian dummy.

### 3. Logo properti

Ubin `.uploader` di Properti baru langkah 2 memakai pemilih berkas yang sama.
Setelah dipilih, ubin menampilkan logonya; ditekan lagi berarti mengganti.
Logo disimpan di `FORM.prop.logo` dan ikut dibuang saat formulir dimulai ulang.

### 4–5. Menu properti dan menu kamar

Sheet berisi `items`, bentuk yang sama dengan sheet Aksi.

**Menu properti:** Info properti · Catatan internal · Riwayat penghuni ·
Tambah kamar · Catat pengeluaran.

**Menu kamar** ikut keadaan kamar:

| Kamar | Isi menu |
|---|---|
| Terisi | Foto kamar · Catatan kamar · Riwayat penghuni · Aksi · Pengaturan sewa |
| Kosong | Foto kamar · Catatan kamar · Riwayat penghuni · Tambah penghuni |

### 6. Menu kalender

Tiga sakelar (`fToggle`) yang menyalakan dan mematikan penanda Check-in,
Jatuh tempo, dan Telat. Mematikan semuanya menyisakan kalender polos — itu sah.
Keadaan sakelar disimpan di `calTanda` dan langsung mengubah kalender di
belakang sheet.

### 7. Notifikasi — `notif`

Diturunkan dari `ROOMS` saat layarnya dibuka, diurutkan dari yang paling
mendesak:

| Jenis | Sumber | Nada |
|---|---|---|
| Telat | `status === 'telat'` | merah |
| Jatuh tempo | `status === 'belum'` | kuning |
| Check-in hari ini | `masuk === '2026-09-27'` | hijau |
| Booked | `status === 'booked'` | merek |

Tiap baris menyebut nama, properti, kamar, dan bisa diketuk menuju kamarnya.
Ikon lonceng di beranda memakai lencana berisi jumlah telat + jatuh tempo;
lencana tidak muncul saat nol.

### 8. Cari — `cari`

Satu kolom cari yang menyaring tiga hal sekaligus, masing-masing berjudul
sendiri: **Properti**, **Kamar**, dan **Penghuni**. Kata kunci dicocokkan ke nama
properti, nomor kamar, nama penghuni, dan nomor HP. Kosong berarti menampilkan
petunjuk, bukan seluruh isi database. Tidak ketemu menampilkan `.emptystate`.

Penyaringannya berjalan di penangan `input` yang sudah ada (`[data-search]`),
bukan dengan menggambar ulang layar — supaya fokus mengetik tidak hilang.

### 9. Cari di tab Penghuni

Ikon di header memfokuskan kolom cari yang sudah ada dan menggulirkannya ke
atas. Tidak ada layar atau kolom baru.

### 10. Tap tanggal kalender

Tanggal yang diketuk jadi terpilih (`calSel`) dan ditandai `.cal-day.is-sel`.
Judul agenda berubah dari "Agenda hari ini" jadi "Agenda <tanggal>", isinya
check-in dan jatuh tempo pada tanggal itu. Mengetuk tanggal yang sama lagi
membatalkan pilihan dan kembali ke hari ini. Berpindah bulan membatalkan pilihan.

Aturan CSS baru: `.cal-day.is-sel` dan `.iconbtn .badge`. Keduanya wajib ada
aturan CSS-nya — audit statis di `_smoke.cjs` menggagalkan class yang dirender
tanpa aturan.

## Cara memverifikasi

    node docs/superpowers/mockups/_smoke.cjs
    node docs/superpowers/mockups/_shots.cjs

Uji baru yang harus ada:

- **tidak ada lagi `data-act="soon"` yang dirender di layar mana pun** — ini uji
  penutup ronde, dijalankan dengan menelusuri seluruh rute
- foto kamar: unggah, tampil di galeri, hitungannya naik di tab Lainnya
- logo properti: terpilih lalu tampil di ubinnya
- menu kamar berbeda antara kamar terisi dan kamar kosong
- sakelar kalender mematikan penanda yang bersangkutan
- notifikasi diturunkan dari data: mengubah status kamar mengubah daftarnya
- lencana lonceng hilang saat tidak ada telat maupun jatuh tempo
- cari menemukan properti, kamar, dan penghuni; kata yang tak ada memunculkan
  keadaan kosong
- ikon cari di tab Penghuni memfokuskan kolom yang sudah ada, tidak membuat yang baru
- tap tanggal mengubah judul agenda; tap lagi mengembalikannya ke hari ini

jsdom buta terhadap tata letak — `_shots.cjs` wajib dijalankan dan hasilnya
dilihat.
