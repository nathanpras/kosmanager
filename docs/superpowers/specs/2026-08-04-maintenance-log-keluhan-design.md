# Paket 5 — Maintenance sebagai Log Keluhan

_Date: 2026-08-04_
_Status: selesai_

---

## Ruang lingkup

Permintaan pemilik: *"biasanya orang itu laporan ac panas, lampu mati, dll jadi biasanya saya tanggapi via chat, jadi maintenance mungkin bisa dijadikan untuk laporan misalkan kamar 105 AC service tanggal sekian keluhan ac panas, 106 lampu mati dll atur sendiri sistemnya bagaimana"*

Rancangan diserahkan sepenuhnya. Bertumpu pada satu kalimat yang menentukan bentuknya: **"saya tanggapi via chat"**.

Koleksi `maintenance` **kosong (0 dokumen)** saat paket ini dikerjakan, jadi tidak ada beban kompatibilitas data.

---

## Apa yang sudah ada

`Maintenance` sudah punya `kamar`, `deskripsi`, `status` (open/in_progress/selesai), `prioritas`, `tgl`, `catatan`, `foto`, dengan tampilan tiga kolom kanban. Kerangkanya sudah benar — yang kurang adalah hal-hal yang membuatnya berfungsi sebagai **log keluhan**, bukan sekadar daftar tugas.

## Yang ditambahkan

| Field | Alasan |
|---|---|
| `jenis` | "AC panas", "lampu mati" — jenis keluhan berulang. Dengan ikon, kolom kanban bisa dipindai sekilas. |
| `pelapor` | Keluhan datang dari orang, dan orang itulah yang harus dibalas. |
| `tgl_selesai` | Menjawab "sudah berapa lama ini menggantung". |
| `biaya` | Perbaikan mengeluarkan uang; tanpa ini saldo di Paket 4 tidak lengkap. |

Sembilan jenis keluhan di `src/utils/keluhan.ts`: AC ❄️, Listrik 💡, Air 🚿, WiFi 📶, Pintu/Kunci 🔑, Kamar Mandi 🚽, Perabot 🪑, Kebersihan 🧹, Lainnya 🔧. Disimpan sebagai teks, sama seperti kategori pengeluaran — menambah aman, menghapus membuat laporan lama kehilangan ikonnya.

## Tiga keputusan yang menentukan alurnya

**Balas WA ada di kartu, bukan hanya di detail.** Kalau tanggapannya lewat chat, tombol itulah yang paling sering ditekan — memaksanya lewat modal detail menambah satu ketukan pada aksi yang paling sering dilakukan. Nomor diambil dari penghuni kamar bersangkutan: dicocokkan per nama bila `pelapor` terisi, kalau tidak jatuh ke penghuni terlama di kamar itu. Pesannya sudah terisi konteks keluhan, tinggal dilanjutkan.

**`tgl_selesai` diisi otomatis** saat status berubah jadi `selesai`, dan dikosongkan lagi kalau keluhan dibuka kembali. Tanggal yang harus diingat manual akan sering salah atau kosong, dan lama penanganan jadi tidak terhitung.

**`pelapor` terisi otomatis** dari penghuni kamar saat kamar dipilih — hampir selalu dialah yang melapor — tetapi tetap bisa disunting untuk kasus laporan dari orang lain.

## Biaya menyambung ke pengeluaran

Tombol **"Catat Biaya sebagai Pengeluaran"** membuat entri `pengeluaran` berkategori *Perbaikan*, bertanggal `tgl_selesai` (atau `tgl`), dengan deskripsi menyebut kamar dan keluhannya.

Sengaja **manual, bukan otomatis**. Membuat pengeluaran diam-diam setiap kali keluhan ditutup akan menggandakan catatan bila pemilik sudah mencatatnya sendiri — dan pengeluaran ganda langsung merusak saldo.

---

## Pengujian

`src/tests/utils/keluhan.test.ts` — 13 tes:
- ikon dan warna per jenis, termasuk fallback untuk jenis tak dikenal dan `undefined`
- `durasiHari`: hari penuh, selesai di hari yang sama, lintas bulan dan lintas tahun
- dihitung lewat `Date.UTC` sehingga pergeseran zona waktu tidak menghilangkan atau menggandakan satu hari
- `null` bila belum selesai, tanggal tutup mendahului tanggal lapor, atau format rusak
- `ringkasKeluhan` menghasilkan persis format yang diminta: `105 · ❄️ AC · 23 Maret 2026 · AC panas`
- bagian kosong dibuang, tidak meninggalkan pemisah menggantung

Verifikasi: `typecheck=0`, `build=0`, 110 tes lulus (naik dari 97).

---

## Catatan

Saat keluhan dibuka kembali, `tgl_selesai` diisi string kosong, bukan dihapus dengan `deleteField()`. Keduanya berperilaku sama bagi pembacanya (`''` bersifat falsy dan `durasiHari` mengembalikan `null`), dan string kosong tidak menyeret impor Firestore ke dalam view.
