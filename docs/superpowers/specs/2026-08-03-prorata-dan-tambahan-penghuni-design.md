# Paket 2 — Prorata & Tambahan Penghuni Kedua

_Date: 2026-08-03_
_Status: approved_

---

## Ruang lingkup

1. **Prorata bulan masuk.** Penghuni masuk tanggal 15 hanya ditagih sisa hari bulan itu.
2. **Tambahan penghuni.** Satu kamar diisi lebih dari satu orang menambah tarif bulanan.
3. **Sinkron penghuni ↔ kamar.** Status kamar dan jumlah penghuni harus ikut data penghuni, bukan ditulis manual.

Di luar ruang lingkup: penomoran kamar (Paket 3), kategori pengeluaran & saldo (Paket 4), maintenance (Paket 5), polish UI (Paket 6).

---

## Aturan yang disepakati

| Keputusan | Nilai |
|---|---|
| Tambahan penghuni | **per orang tambahan**: `tambahan × (jumlah_penghuni − 1)` |
| Prorata atas tambahan | **ikut diprorata** — harga dan tambahan dijumlah dulu, baru dibagi hari |
| Jatuh tempo bulan masuk | **tanggal masuk** |
| Jatuh tempo bulan lain | **tanggal 1** |
| Besar tambahan | `300.000`, dari pengaturan; bisa ditimpa per kamar |

Rumus:

```
tarif   = harga_kamar + tambahan × (jumlah_penghuni − 1)
prorata = round(tarif ÷ hari_dalam_bulan × hari_ditagih)
hari_ditagih = hari_dalam_bulan − tanggal_masuk + 1     (inklusif)
```

Contoh: kamar 1.500.000, dua orang, tambahan 300.000, masuk 15 Maret 2026 (31 hari).
`tarif = 1.800.000`; `hari_ditagih = 31 − 15 + 1 = 17`; `jumlah = round(1.800.000 ÷ 31 × 17) = 987.097`.

**Hari dihitung inklusif** — masuk tanggal 15 berarti hari ke-15 sudah ditempati dan ikut ditagih.

---

## Kondisi sekarang

`Kamar` sudah punya `nominal_tambahan` dan `jmlk`; `Tagihan` sudah punya `is_prorated` dan `prorated_hari` (`src/types/index.ts`). Keempatnya **tidak dibaca maupun ditulis di mana pun** — deklarasi tanpa implementasi. Jadi ini membangun yang belum ada, bukan memperbaiki yang rusak.

Harga tagihan sekarang dihitung di dua tempat, keduanya langsung menyalin `kamar.harga`:

- `App.vue:autoGenerateNextMonth` → `jumlah: k?.harga ?? 0`
- `TagihanView.onPenghuniChange` → `addForm.value.jumlah = k.harga`

### Bug sinkron yang ikut diperbaiki

Empat, semuanya baru menggigit setelah satu kamar boleh diisi dua orang:

1. `PenghuniView.save()` — `kamar.items.find(k => k.nomor === form.value.kamar)` **tanpa `property_id`**. Kamar bernomor sama di properti lain ikut ditandai terisi. Ada di dua cabang (tambah dan pindah kamar).
2. `PenghuniView.save()` cabang pindah — kamar lama diset `kosong` **tanpa memeriksa apakah masih ada penghuni lain** di situ.
3. `PenghuniView.doEvict()` — sama, kamar diset `kosong` walau roommate masih tinggal.
4. `TagihanView.onPenghuniChange()` — `kamar.items.find(x => x.nomor === p.kamar)` tanpa `property_id`.

Akar masalahnya sama: status hunian ditulis manual di banyak tempat. Perbaikannya bukan menambal keempatnya satu per satu, melainkan **menurunkan jumlah penghuni dari koleksi `penghuni`** dan memakai satu helper untuk memutuskan status kamar.

---

## Rancangan

### `src/utils/billing.ts` — matematika murni

Tanpa Pinia, tanpa Firestore, supaya bisa diuji langsung.

```ts
hariDalamBulan(bulan: string): number
tarifBulanan(harga, jumlahPenghuni, nominalTambahan): number
hitungTagihan(input): { jumlah, jatuh_tempo, is_prorated?, prorated_hari? }
```

`hitungTagihan` menerima `bulan`, `harga`, `jumlahPenghuni`, `nominalTambahan`, dan `masuk` (opsional). Prorata **hanya** aktif bila `masuk` jatuh di dalam `bulan` tersebut; di luar itu tagihan penuh dan jatuh tempo tanggal 1.

`is_prorated`/`prorated_hari` hanya ditulis saat memang diprorata, jadi dokumen tagihan bulan biasa tidak terisi field kosong.

### `src/composables/useOccupancy.ts` — hunian dari data penghuni

```ts
penghuniDiKamar(nomor, property_id, per?): Penghuni[]   // urut tanggal masuk
jumlahPenghuni(nomor, property_id, per?): number
kamarMasihTerisi(nomor, property_id, kecualiId?): boolean
```

Penghuni dianggap aktif bila `kontrak_selesai` kosong atau belum lewat. `kamarMasihTerisi` menerima `kecualiId` supaya pemanggil bisa bertanya "kalau orang ini keluar, kamarnya kosong tidak?" — inilah yang memperbaiki bug 2 dan 3.

Diurutkan berdasarkan tanggal masuk karena **penghuni terlama menjadi penanggung tagihan**. `Tagihan.penghuni` adalah string nama, dan `useWAReminder` mencocokkan penghuni lewat nama itu untuk mendapatkan nomor HP. Menggabungkan dua nama akan memutus pencarian tersebut, jadi satu nama saja yang disimpan.

### Satu tagihan per kamar

`autoGenerateNextMonth` sudah melakukan dedup dengan kunci `kamar|property_id`, jadi dua penghuni sekamar hanya menghasilkan satu tagihan. Perilaku itu dipertahankan dan justru menjadi dasar model tambahan: **tarif melekat pada kamar**, bukan pada orang.

### Pengaturan

`AppSettings.nominal_tambahan` ditambahkan, default `300000`, dapat diubah di halaman Pengaturan. Bila `Kamar.nominal_tambahan` terisi, nilai itu menang untuk kamar tersebut.

Default `tgl_jatuh_tempo` diubah dari `10` menjadi `1` agar cocok dengan "semua kamar disamakan jatuh tempo tanggal 1". Nilai yang sudah tersimpan di Firestore tidak disentuh — hanya default saat field kosong.

### Tagihan bulan pertama dibuat otomatis

Menambahkan penghuni sekarang langsung membuat tagihan bulan masuk yang sudah diprorata. Sebelumnya tidak ada yang membuatnya: `autoGenerateNextMonth` hanya mengurus bulan depan, sehingga bulan masuk selalu bolong dan harus diinput manual. Dilewati bila tagihan untuk kamar + bulan itu sudah ada.

### Tagihan yang sudah ada tidak diubah

Perubahan tarif hanya berlaku untuk tagihan yang dibuat setelah ini. Tagihan lama tidak dihitung ulang — riwayat pembayaran tidak boleh berubah sendiri.

---

## Pengujian

`src/tests/utils/billing.test.ts`:
- tarif untuk 1, 2, dan 3 penghuni
- prorata masuk tanggal 15 di bulan 31 hari, 30 hari, dan Februari
- masuk tanggal 1 → tidak diprorata, ditagih penuh
- masuk tanggal terakhir → 1 hari
- `masuk` di bulan lain → tagihan penuh, jatuh tempo tanggal 1
- tambahan ikut diprorata
- pembulatan ke rupiah terdekat

`src/tests/composables/useOccupancy.test.ts`:
- hitung hanya penghuni aktif (`kontrak_selesai` lewat tidak dihitung)
- terpisah per `property_id` untuk nomor kamar yang sama
- `kamarMasihTerisi` dengan `kecualiId` mengembalikan `true` bila roommate masih ada
- urutan berdasarkan tanggal masuk

Verifikasi: `npm run typecheck`, `npx vitest run`, `npm run build`.
