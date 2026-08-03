# Paket 1 — Mobile Safe-Area & Filter Bulan

_Date: 2026-08-03_
_Status: approved_

---

## Ruang lingkup

Dua bug yang dilaporkan pengguna:

1. **Tombol aksi di modal tertutup di HP.** Saat input pembayaran dari ponsel, tombol "Catat" tertutup bar bawah layar. Di desktop tidak ada masalah.
2. **Bulan Maret 2026 muncul di Dashboard tapi tidak bisa dipilih di Pengeluaran.** Terlihat seperti "tidak bisa input pengeluaran di bulan itu".

Di luar ruang lingkup: prorata, penomoran kamar, saldo, maintenance, polish UI. Masing-masing punya paket sendiri.

---

## Bug 1 — Tombol modal tertutup di mobile

### Akar masalah

Empat penyebab yang menumpuk, bukan satu.

**(a) `viewport-fit=cover` tidak ada.** `index.html` memuat:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

Tanpa `viewport-fit=cover`, iOS Safari mengevaluasi setiap `env(safe-area-inset-*)` menjadi **`0px`** — bukan nilai fallback-nya. Akibatnya tiga aturan CSS yang sudah ditulis benar tidak pernah aktif:

| Lokasi | Aturan | Nilai efektif sekarang |
|---|---|---|
| `style.css:31` | `.bn-items{padding-bottom:env(safe-area-inset-bottom,0px)}` | `0px` — bottom-nav berada di bawah home indicator |
| `style.css:100` | `.modal-foot{padding-bottom:max(20px,env(safe-area-inset-bottom,20px))}` | `20px` |
| `style.css:149` | `.content{padding-bottom:calc(64px + env(...) + 8px)}` | kurang setinggi inset |

**(b) Matematika `.modal-foot` salah bentuk.** `max(20px, inset)` mengambil nilai terbesar, bukan menjumlahkan. Home indicator iOS setinggi 34pt, jadi begitu inset aktif hasilnya `max(20px, 34px)` = `34px` — seluruh padding habis dipakai menutup indicator dan jarak visual di atas tombol menjadi nol. Yang benar adalah **menjumlahkan**: padding dasar + inset.

**(c) Keyboard di layar menutupi footer.** `.modal{max-height:80dvh}` dan `.overlay{position:fixed;inset:0}`. Satuan `dvh` bereaksi terhadap toolbar browser, **tidak** terhadap keyboard virtual. Saat keyboard terbuka untuk mengetik nominal bayar, footer modal tetap dihitung berada di dasar layout viewport — yaitu di belakang keyboard.

**(d) Toast tertimpa.** `style.css:138` memakai `bottom:90px` tetap, tidak memperhitungkan inset.

### Perbaikan

**1. Meta viewport** — `index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
```

`viewport-fit=cover` mengaktifkan seluruh `env(safe-area-inset-*)` yang sudah ada. `interactive-widget=resizes-content` membuat Chrome Android mengecilkan viewport saat keyboard muncul, sehingga `dvh` ikut menyusut dan footer tetap terlihat.

**2. Token inset** — `style.css`, di `:root`:

```css
--sab: env(safe-area-inset-bottom, 0px);   /* inset bawah  */
--kb: 0px;                                  /* tinggi keyboard, diisi JS */
```

Satu token dipakai semua komponen, jadi tidak ada lagi tiga tempat yang menghitung inset sendiri-sendiri.

**3. Kompensasi keyboard** — composable baru `src/composables/useViewportInsets.ts`.

iOS Safari belum mendukung `interactive-widget`, jadi Android saja tidak cukup. Composable ini memantau `window.visualViewport` dan menulis dua custom property ke `<html>`:

- `--kb` — berapa piksel keyboard menutupi layout viewport, dihitung dari `innerHeight - (visualViewport.height + visualViewport.offsetTop)`, dibulatkan ke `0` bila di bawah ambang 80px (menyaring gerakan toolbar browser yang bukan keyboard).
- `--sab` — dipaksa `0px` selama keyboard terbuka. Home indicator berada di belakang keyboard, jadi menambah inset saat itu justru membuat jarak berlebih.

Dipanggil sekali di `App.vue`. Bila `visualViewport` tidak tersedia, composable tidak melakukan apa-apa dan nilai CSS default yang berlaku.

**4. Konsumsi token** — `style.css`:

```css
.overlay   { bottom: var(--kb, 0px); }                       /* sheet naik di atas keyboard */
.modal     { max-height: calc(80dvh - var(--kb, 0px)); }     /* dan ikut mengecil          */
.modal-foot{ padding-bottom: calc(12px + var(--sab, 0px)); } /* dijumlah, bukan max()      */
.bn-items  { padding-bottom: var(--sab, 0px); }
.content   { padding-bottom: calc(64px + var(--sab, 0px) + 8px); }
.toast-wrap{ bottom: calc(90px + var(--sab, 0px)); }
```

Menaikkan `bottom` overlay **dan** mengecilkan `max-height` modal dilakukan bersamaan: yang pertama memindahkan sheet ke atas keyboard, yang kedua mencegahnya melampaui tepi atas layar.

### Kenapa memakai custom property, bukan style inline per modal

Ada **10 `.modal-foot`** di 6 view (`KamarView` ×2, `TagihanView` ×3, `MaintenanceView` ×2, `PengeluaranView`, `PenghuniView`, `SettingsView`). Menambal satu per satu berarti sepuluh tempat yang bisa lupa diperbarui. Token di `:root` memperbaiki kesepuluhnya sekaligus, dan modal baru otomatis ikut benar.

---

## Bug 2 — Daftar bulan tidak konsisten antar halaman

### Akar masalah

Tiga view membangun daftar bulannya sendiri-sendiri, dan **tidak dari sumber yang sama**:

| View | Baris | Sumber |
|---|---|---|
| `DashboardView` | 33–42 | `tagihan.bulan` + `pengeluaran.tgl` (via `getUTCMonth`) |
| `LaporanView` | 29–38 | `tagihan.bulan` + `pengeluaran.tgl` (via `getMonth`) |
| `PengeluaranView` | 24–33 | `pengeluaran.tgl` saja |

Tiga bug terpisah muncul dari sini:

**(a) Bulan hilang di Pengeluaran.** Hanya `PengeluaranView` yang mengabaikan tagihan. Maret 2026 punya tagihan tetapi belum punya pengeluaran, jadi tabnya ada di Dashboard dan hilang di Pengeluaran. Pengguna membacanya sebagai "tidak bisa input pengeluaran di bulan itu".

**(b) Urutan tab acak.** Ketiganya memakai `[...s].sort().reverse()` — urutan **leksikografis atas nama bulan Indonesia**: `Agustus, April, Desember, Februari, Januari, Juli, Juni, Maret, Mei, November, Oktober, September`, lalu dibalik. Tidak pernah kronologis.

**(c) Batas bulan berbeda antar halaman.** Dashboard memakai `getUTCMonth()`, Laporan memakai `getMonth()`. Tanggal yang sama karena itu bisa jatuh ke bulan berbeda di dua halaman. Di WIB (UTC+7) belum terlihat karena pergeserannya positif, tapi bug-nya nyata: di zona waktu negatif `new Date('2026-03-01').getMonth()` mengembalikan `1` (Februari), bukan `2`.

### Perbaikan

**1. Helper urutan** — `src/utils/date.ts`:

```ts
bulanKey(bln: string): string        // "Maret 2026"  → "2026-03"  (bisa diurutkan string)
bulanFromTgl(tgl: string): string    // "2026-03-15"  → "Maret 2026"
sortBulanDesc(list: string[]): string[]
```

`bulanKey` memetakan nama bulan ke indeks lewat `MONTHS_FULL.indexOf`, lalu memformatnya `YYYY-MM` dengan padding — sehingga perbandingan string biasa sudah kronologis. Nama bulan yang tidak dikenal dipetakan ke `"0000-00"` supaya tersingkir ke belakang, bukan melempar error.

`bulanFromTgl` mengurai `"YYYY-MM-DD"` secara tekstual, **bukan** lewat `new Date()`. `new Date("2026-03-15")` diurai sebagai UTC lalu dibaca dengan getter waktu lokal, jadi di zona waktu negatif tanggal 1 bisa mundur ke bulan sebelumnya. Ini pola yang dipakai ketiga view sekarang dan ikut diperbaiki.

**2. Sumber tunggal** — composable baru `src/composables/useMonths.ts`:

```ts
useMonths() → { availableMonths }
```

`availableMonths` adalah gabungan dari:
- setiap `tagihan.bulan` pada properti aktif,
- setiap `pengeluaran.tgl` pada properti aktif (lewat `bulanFromTgl`),
- bulan berjalan,

diurutkan kronologis menurun. Menyatukan kedua sumber berarti bulan yang muncul di Dashboard **selalu** bisa dipilih di Pengeluaran dan Laporan. Filter properti memakai `useProperty().filterByProperty` yang sudah ada, jadi daftar bulan ikut berganti saat properti diganti.

Ketiga view memakai composable ini dan menghapus perhitungan lokalnya.

**3. Lompat ke bulan entri yang baru disimpan** — `PengeluaranView.save()`.

Filter bulan default ke bulan berjalan. Menyimpan pengeluaran bertanggal Maret 2026 saat filter berada di Agustus 2026 membuat entri itu langsung hilang dari layar — persis gejala yang dilaporkan. Setelah simpan berhasil, `activeMonth` diarahkan ke bulan milik entri tersebut sehingga hasilnya langsung terlihat.

---

## Pengujian

Sudah ada `vitest` + `@vue/test-utils` + `jsdom`, dengan tes di `src/tests/utils/date.test.ts` dan `format.test.ts`. Mengikuti pola itu:

- `src/tests/utils/date.test.ts` — tambahan untuk `bulanKey`, `bulanFromTgl`, `sortBulanDesc`. Kasus yang dijaga: urutan kronologis lintas tahun (`Desember 2025` sebelum `Januari 2026`), bulan tak dikenal tidak melempar error, dan `bulanFromTgl` tidak bergeser di zona waktu negatif.
- `src/tests/composables/useMonths.test.ts` — bulan yang hanya punya tagihan tetap muncul; yang hanya punya pengeluaran tetap muncul; bulan berjalan selalu ada; duplikat menyatu; hasil terurut menurun.

Bug 1 murni CSS dan geometri viewport — jsdom tidak mengimplementasi `visualViewport` maupun tata letak, jadi tes unit di sana tidak membuktikan apa pun. Verifikasinya lewat `typecheck` + `build`, lalu pemeriksaan manual di perangkat.

### Catatan: `npm run typecheck` selama ini tidak memeriksa apa pun

`tsconfig.json` bergaya solution — `"files": []` dengan hanya `references`. Script `vue-tsc --noEmit` polos karena itu tidak punya file untuk diperiksa dan **selalu** exit 0. Terbukti saat import `useMonths` yang hilang di dua view lolos begitu saja. Script diperbaiki menjadi `vue-tsc -b --noEmit` supaya mengikuti references; sesudahnya import yang hilang langsung tertangkap.

## Verifikasi manual yang masih dibutuhkan

Perbaikan safe-area **tidak bisa saya buktikan dari sini** — perlu perangkat asli. Yang harus dicek pemilik:

1. iPhone, buka modal pembayaran di Tagihan → tombol "Catat" terlihat penuh di atas home indicator.
2. Ketuk kolom nominal sampai keyboard muncul → tombol tetap terlihat, tidak tertutup keyboard.
3. Sama untuk Android Chrome.
4. Bottom-nav tidak lagi menempel di tepi bawah layar.
