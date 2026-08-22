# Invoice resmi, bayar di muka, dan prorata hari-orang

Tanggal: 2026-08-22

## Masalah

Tiga keluhan pemilik, ditambah dua hal yang muncul saat menggalinya:

1. **Tidak ada invoice.** Penghuni kadang minta bukti pembayaran resmi Raffles Kos; sekarang tidak ada yang bisa dicetak.
2. **Bayar 6 bulan di muka tidak ada tempatnya.** Harus dicatat manual satu-satu, dan diskon bayar di muka (mis. 12 juta jadi 11 juta) tidak punya tempat sama sekali.
3. **Prorata salah saat ada pergantian penghuni di bulan yang sama.**
4. Saldo berjalan hanya bisa diatur lewat form properti yang terkubur di Pengaturan, sehingga jarang dicocokkan dengan mutasi BCA.
5. Penghuni yang keluar dihapus permanen, riwayatnya hilang.

### Akar bug prorata

`useOccupancy.penghuniDiKamar()` menyaring penghuni aktif dengan `per = today()`, bukan bulan yang sedang ditagih. `useTagihanCalc` lalu menghitung prorata hanya dari `penghuni[0]` (yang masuk paling lama). Akibatnya:

- A keluar 10 Maret, B masuk 15 Maret: saat tagihan Maret dibuat, A sudah tidak aktif hari ini sehingga hilang dari perhitungan. Karena tagihan disimpan satu baris per kamar per bulan, bagian A tidak pernah tertagih.
- A tinggal sebulan penuh, B masuk 15 Maret: `masuk` yang dipakai milik A dan tidak jatuh di bulan itu, sehingga prorata tidak aktif sama sekali dan tarif dua orang ditagih penuh sebulan. Tambahan 300.000 jadi kelebihan tagih.
- Penghuni yang keluar tengah bulan tetap ditagih sebulan penuh.

Akarnya satu: tagihan dimodelkan **per kamar per bulan**, sementara orang masuk dan keluar **per hari**.

## Keputusan pemilik

- Tagihan dihitung **per orang per hari**.
- Kamar berisi dua orang yang tidak berganti tetap **satu tagihan** atas nama penanggung; dipecah per orang hanya bila ada yang keluar di tengah bulan.
- Invoice berupa **halaman siap cetak** (print browser ke PDF), kop teks dari data properti, tanpa upload logo.
- Bayar 6 bulan dicatat sebagai **6 tagihan bulanan yang dilunasi satu batch**.
- Diskon bayar di muka **dibagi rata ke seluruh bulan** dalam batch.
- Penghuni keluar **diarsipkan**, tidak dihapus. Ada tab Mantan Penghuni.
- Sisa bulan yang sudah dibayar tapi penghuninya keluar: **hangus, tetapi tercatat**.
- Saldo disesuaikan lewat **tombol di Dashboard**.

Catatan penting dari pemilik: **tidak ada kontrak berjangka.** Penghuni kos lanjut terus sampai suatu hari bilang tidak lanjut. Jadi `kontrak_selesai` bukan tanggal yang diketahui di muka — ia tanggal keluar yang baru diisi saat orangnya pamit.

## Rancangan

### 1. Mesin hitung hari-orang (`src/utils/billing.ts`)

Fungsi baru menggantikan jalur prorata lama:

```ts
export interface PenghuniBulan {
  id: string
  nama: string
  masuk: string        // YYYY-MM-DD
  tgl_keluar?: string  // YYYY-MM-DD, inklusif
}

export interface BagianTagihan {
  penghuni_id: string
  nama: string
  dari: number      // tanggal awal huni di bulan itu
  sampai: number    // tanggal akhir huni di bulan itu
  hari: number      // inklusif
  jumlah: number    // sudah dibulatkan
  peran: 'penanggung' | 'tambahan'
}

export function hitungBagian(input: {
  bulan: string
  harga: number
  nominalTambahan: number
  penghuni: PenghuniBulan[]
}): BagianTagihan[]
```

Aturan:

- Rentang hari seseorang di bulan itu = `max(masuk, tanggal 1)` sampai `min(tgl_keluar, hari terakhir bulan)`, **inklusif**. Yang tidak beririsan dengan bulan itu dibuang.
- Untuk setiap hari, penghuni yang **masuknya paling lama** di antara yang hadir hari itu menanggung `harga`; setiap orang lain yang hadir hari itu menanggung `nominalTambahan`. Ini melanjutkan aturan yang sudah disepakati 2026-08-03: tambahan dikenakan per orang di atas penghuni pertama, dan tambahan ikut diprorata.
- Nominal per orang = jumlah tarif hariannya, dihitung `tarif * hari / totalHari` lalu `Math.round`, bukan menjumlah pembulatan harian, supaya tidak ada selisih rupiah yang menumpuk.
- Bila semua penghuni menghuni sebulan penuh, hasilnya identik dengan `tarifBulanan()` yang lama. Tidak ada perubahan nominal untuk kasus normal.

`tarifBulanan()` dan `hariDalamBulan()` tetap ada dan dipakai. `hitungTagihan()` lama dipertahankan sebagai pembungkus tipis untuk satu penghuni, supaya form tambah tagihan manual tidak perlu dirombak.

Contoh, Maret (31 hari), kamar 1.500.000, tambahan 300.000:

| Kasus | Hasil |
| --- | --- |
| A dan B sebulan penuh | A 1.500.000, B 300.000 |
| A sendiri, keluar 10 Mar | A 483.871 (10 hari) |
| A keluar 10 Mar, B masuk 15 Mar | A 483.871 (10 hari), B 822.581 (17 hari) |
| A penuh, B masuk 15 Mar | A 1.500.000, B 164.516 (17 hari) |

### 2. Kapan bagian digabung, kapan dipecah

Aturan gabung ada di `useTagihanCalc`, bukan di `billing.ts` — mesinnya tetap murni.

- **Gabung** (satu tagihan atas nama penanggung, `jumlah` = total semua bagian) bila tidak ada penghuni yang berhenti sebelum hari terakhir bulan itu.
- **Pecah** (satu tagihan per penghuni) bila ada minimal satu penghuni dengan `sampai < hari terakhir bulan`.

Jadi kamar berdua yang normal tetap satu lembar seperti sekarang; hanya bulan pergantian yang menghasilkan dua lembar.

`useTagihanCalc.tagihanUntukKamar()` berubah mengembalikan **array** draft tagihan. Empat pemanggilnya menyesuaikan:

- `src/App.vue` — auto-generate bulan depan setelah tanggal 15
- `src/views/TagihanView.vue` — generate massal, dan form tambah tagihan
- `src/views/PenghuniView.vue` — tagihan bulan masuk

Dedupe pakai kunci `penghuni_id + kamar + bulan` (jatuh balik ke `penghuni` nama untuk data lama yang belum punya `penghuni_id`).

Auto-generate bulan depan **melewati** penghuni yang `tgl_keluar`-nya jatuh sebelum bulan tersebut.

### 3. Okupansi per bulan (`src/composables/useOccupancy.ts`)

Tambah:

```ts
function penghuniDiBulan(nomor: string, property_id: string, bulan: string): Penghuni[]
```

Mengembalikan semua penghuni yang punya minimal satu hari di bulan itu, termasuk yang sudah diarsipkan. `penghuniDiKamar(per = today())` yang lama tetap dipakai untuk tampilan "siapa yang tinggal di sini sekarang", tapi **tidak boleh lagi** dipakai untuk menghitung tagihan.

Penghuni berarsip dikecualikan dari daftar aktif, denah kamar, dan status hunian kamar.

### 4. Penghuni keluar dan arsip

Perubahan tipe `Penghuni`:

```ts
tgl_keluar?: string   // menggantikan kontrak_selesai
```

Tidak ada field `arsip`. Status mantan penghuni diturunkan dari `tgl_keluar` yang sudah lewat — menyimpan flag terpisah berarti dua sumber kebenaran yang bisa berselisih, misalnya saat tanggal keluar diisi mundur.

Kompatibilitas data lama: pembacaan selalu `p.tgl_keluar ?? p.kontrak_selesai`. Penulisan hanya ke `tgl_keluar`. Tidak ada migrasi produksi — konsisten dengan kendala bahwa Firestore hanya bisa ditulis dari dalam aplikasi.

Tombol **Keluarkan Penghuni** di `PenghuniView`:

1. Dialog berisi tanggal keluar, terisi hari ini.
2. Simpan menulis `tgl_keluar`.
3. Tagihan bulan keluar dihitung ulang **hanya bila statusnya belum atau kurang**. Tagihan yang sudah lunas tidak diubah nominalnya; bila hasil hitung ulang lebih kecil, tagihan diberi `kelebihan` berisi selisihnya dan ditampilkan sebagai info. Alasannya: mengubah tagihan lunas akan mengubah `nilaiDibayar()` dan menggeser saldo yang sudah cocok dengan bank.
4. Tagihan **lunas** untuk bulan setelah bulan keluar ditandai `hangus: true`. Dokumennya tidak dihapus supaya uangnya tetap terhitung di saldo — uang itu memang dipegang pemilik. Tagihan belum lunas untuk bulan setelah keluar dihapus.
5. Satu entri Log: `"Budi keluar 14 Mar 2026 — 3 bulan bayar di muka (4.500.000) hangus"`.
6. Kamar ikut kosong lewat `useOccupancy` yang sudah menurunkan status dari koleksi penghuni.

Tab **Mantan Penghuni** di `PenghuniView`: nama, HP, KTP, kamar terakhir, tanggal masuk dan keluar, total yang pernah dibayar, serta tautan ke riwayat tagihannya. Ada pencarian nama. Tombol pulihkan untuk salah tekan.

### 5. Bayar beberapa bulan di muka

Perubahan tipe `Tagihan`:

```ts
penghuni_id?: string
hari?: number
dari?: string          // YYYY-MM-DD
sampai?: string        // YYYY-MM-DD
bayar_ref?: string     // ID batch, sama untuk semua bulan dalam satu pembayaran
diskon_batch?: number  // total diskon batch, disalin ke tiap tagihan untuk invoice
hangus?: boolean
kelebihan?: number     // hasil hitung ulang lebih kecil dari yang sudah dibayar
invoice_no?: string
invoice_tgl?: string
```

Alur di `TagihanView`, komponen baru `BayarDiMukaDialog.vue`:

1. Pilih kamar atau penghuni.
2. Bulan mulai dan jumlah bulan (default 6).
3. Pratinjau: daftar bulan beserta nominalnya, dihitung ulang lewat mesin yang sama. Bulan-bulan ke depan memakai komposisi penghuni saat ini — diasumsikan tidak berubah, dan memang itu asumsi yang wajar saat menerima bayaran di muka.
4. Isi **Diskon (Rp)**, default 0. Total di bawahnya ikut berubah.
5. Isi tanggal uang masuk.
6. Simpan.

Efeknya: tagihan bulan yang belum ada dibuat, semuanya ditandai `lunas` dengan `tgl` dan `bayar_ref` yang sama, `jumlah_bayar` diisi, dan `diskon_batch` disalin.

**Pembagian diskon.** Diskon dibagi rata ke seluruh bulan dalam batch; sisa pembulatan dibebankan ke bulan terakhir supaya jumlah seluruh tagihan **persis** sama dengan uang yang diterima. Contoh 6 bulan @2.000.000 dengan diskon 1.000.000: lima bulan pertama 1.833.333, bulan terakhir 1.833.335, total 11.000.000.

Bulan yang sudah punya tagihan lunas tidak boleh ikut batch — dialog menolaknya dengan pesan jelas agar tidak dobel bayar.

Tagihan berstatus lunas dan yang `hangus` tidak muncul di daftar tunggakan dan tidak masuk antrean reminder WhatsApp di `useWAReminder`.

### 6. Invoice

`src/utils/invoice.ts` — penomoran dan perakitan data:

- Format nomor: `INV/RK/2026/08/0001`. Urutan diambil dari nomor tertinggi tahun berjalan yang sudah ada di `tagihan`, ditambah satu. Aplikasi ini dipakai satu orang, jadi risiko tabrakan diabaikan.
- Nomor disimpan permanen di dokumen tagihan saat invoice pertama kali dibuat, agar cetak ulang menghasilkan nomor yang sama.
- Satu invoice bisa mencakup satu tagihan atau seluruh tagihan dengan `bayar_ref` yang sama.

`src/components/InvoiceDoc.vue` — halaman A4:

- Kop: nama, alamat, dan nomor HP properti; rekening bank dari `Property.bank_*`.
- Nomor invoice, tanggal terbit.
- Kepada: nama penghuni, nomor kamar, nomor HP.
- Tabel rincian per bulan. Baris prorata diberi keterangan `"1–14 Mar 2026 (14 hari)"`.
- Untuk invoice batch: subtotal sebelum diskon, baris `Diskon bayar di muka 6 bulan`, lalu total. Angka per baris tetap nominal setelah diskon, sementara subtotal dihitung dari total ditambah diskon — sehingga invoice terbaca resmi tanpa membuat data internal berbeda.
- Status **LUNAS** atau **BELUM BAYAR** beserta tanggal bayar.
- Tombol **Cetak / Simpan PDF** memanggil `window.print()`.

CSS print diberi cakupan sendiri (`.invoice-page` di dalam blok `@media print`, plus kelas `printing-invoice` pada `body` saat dialog terbuka) supaya tidak bertabrakan dengan `exportPDF()` di `LaporanView.vue` yang juga memakai `window.print()`.

Di iOS alurnya: Cetak → Share → Save to Files, lalu kirim lewat WhatsApp secara manual. Tidak ada cara memaksa lampiran PDF ke WhatsApp dari web, dan itu memang di luar kendali aplikasi.

### 7. Penyesuaian saldo

Tombol **Sesuaikan Saldo** pada kartu saldo di `DashboardView`:

- Dialog: nominal saldo bank sebenarnya, dan tanggal (default hari ini).
- Simpan menulis `Property.saldo_awal` dan `saldo_awal_tgl` — field yang sudah ada, hanya selama ini terkubur di form properti pada Pengaturan.
- Satu entri Log mencatat nilai lama, nilai baru, dan selisihnya.
- Kartu menampilkan `"terakhir disesuaikan 22 Agu 2026"`.
- Dalam mode Semua Properti, dialog meminta memilih properti dulu karena Waru 23 dan Citra 1 memakai rekening BCA yang berbeda.

`hitungSaldo()` tidak berubah.

## Berkas yang tersentuh

Baru:

- `src/utils/invoice.ts`
- `src/components/InvoiceDoc.vue`
- `src/components/BayarDiMukaDialog.vue`
- `src/components/SesuaikanSaldoDialog.vue`
- `src/tests/utils/invoice.test.ts`

Diubah:

- `src/utils/billing.ts` — `hitungBagian()`
- `src/composables/useOccupancy.ts` — `penghuniDiBulan()`, kecualikan arsip
- `src/composables/useTagihanCalc.ts` — mengembalikan array, aturan gabung/pecah
- `src/composables/useWAReminder.ts` — lewati tagihan `hangus`
- `src/types/index.ts` — field baru pada `Penghuni` dan `Tagihan`
- `src/views/PenghuniView.vue` — tombol Keluarkan, tab Mantan Penghuni
- `src/views/TagihanView.vue` — array draft, tombol Bayar Beberapa Bulan, tombol Invoice
- `src/views/DashboardView.vue` — tombol Sesuaikan Saldo
- `src/App.vue` — auto-generate memakai array dan melewati penghuni yang sudah keluar
- `src/tests/utils/billing.test.ts` — kasus hari-orang

## Rencana pengujian

Vitest, tanpa menyentuh Firestore:

- `hitungBagian`: sebulan penuh satu orang; sebulan penuh dua dan tiga orang; masuk tengah bulan; keluar tengah bulan; keluar lalu ada yang masuk di bulan yang sama; masuk dan keluar di bulan yang sama; Februari kabisat dan non-kabisat; penghuni yang rentangnya tidak beririsan dengan bulan itu; jumlah seluruh bagian sama dengan tarif bulanan saat semua penuh.
- Aturan gabung/pecah: dua orang penuh menghasilkan satu draft; ada yang keluar menghasilkan satu draft per orang.
- Pembagian diskon: total seluruh tagihan persis sama dengan uang diterima, termasuk saat pembagian tidak bulat.
- Penomoran invoice: nomor pertama tahun berjalan, kenaikan berikutnya, tetap sama saat dicetak ulang.
- Penyesuaian saldo: `hitungSaldo()` setelah penyesuaian mengembalikan angka yang dimasukkan bila belum ada transaksi setelah tanggal itu.

Yang tidak diuji otomatis dan harus dicoba pemilik langsung di aplikasi: tampilan cetak invoice di iPhone, dan penulisan ke Firestore.

## Yang sengaja tidak dikerjakan

- Pengembalian uang otomatis untuk sisa bayar di muka. Pemilik memilih hangus dan tercatat.
- Upload logo untuk kop invoice.
- Diskon di luar pembayaran batch.
- Perubahan pada aturan keamanan Firestore. Masih terbuka, tapi belum diminta.
