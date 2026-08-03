# Paket 3 — Migrasi Penomoran Kamar

_Date: 2026-08-03_
_Status: alat siap, eksekusi menunggu pemilik_

---

## Ruang lingkup

Mengganti penomoran kamar Raffles Kos 23 Waru:

| Lama | Baru |
|---|---|
| B1–B7 | 101–107 |
| A1–A9 | 201–209 |
| C1–C5 | 301–305 |
| D1 | 401 |

22 kamar. Pola umumnya: huruf blok menentukan lantai (**B→1, A→2, C→3, D→4**), nomor urut menjadi dua digit terakhir.

---

## Kenapa ini bukan rename biasa

Nomor kamar disimpan sebagai **string di empat koleksi**, bukan sebagai id relasi:

| Koleksi | Field |
|---|---|
| `kamar` | `nomor` |
| `penghuni` | `kamar` |
| `tagihan` | `kamar` |
| `maintenance` | `kamar` |

Mengganti `kamar.nomor` saja akan membuat seluruh riwayat tagihan, data penghuni, dan catatan maintenance menunjuk kamar yang sudah tidak ada. Keempatnya harus berubah serentak, dan **riwayat tagihan lama ikut berubah** — tagihan Januari untuk "B1" akan tercatat sebagai tagihan untuk "101". Itu konsekuensi yang tidak terhindarkan dari penyimpanan berbasis string, dan pemilik perlu menyadarinya sebelum menjalankan.

---

## Kendala akses yang menentukan bentuk solusinya

Migrasi ini semula direncanakan sebagai skrip Node. Skrip tersebut **tidak bisa dipakai**: Firebase Web SDK dari luar browser ditolak dengan `permission-denied`, sementara `firebase firestore:indexes` lewat CLI berhasil. Artinya kredensial admin CLI ada, tetapi jalur SDK klien diblokir aturan Firestore atau App Check — hanya aplikasi asli di browser yang lolos.

Karena itu migrasi dijalankan **dari dalam aplikasi**, di tab Pengaturan → Migrasi Nomor. Di sana akses Firestore sudah terbukti bekerja, dan pemilik melihat rencananya sebelum menyetujui.

---

## Rancangan

### `src/utils/nomorKamar.ts` — pemetaan dan perencanaan, fungsi murni

```ts
nomorBaru(lama: string): string | null
sudahBergayaBaru(nomor: string): boolean
susunRencana(property_id, { kamar, penghuni, tagihan, maintenance }): RencanaMigrasi
```

`susunRencana` hanya menyusun daftar perubahan, tidak menulis apa pun. Pemisahan ini membuatnya bisa ditampilkan sebagai pratinjau sekaligus diuji tanpa Firestore.

Empat keluaran:

- `ubah` — daftar dokumen yang akan diperbarui, per koleksi.
- `bentrok` — nomor tujuan yang sudah dipakai kamar lain. **Tidak ditimpa**, dilaporkan.
- `takDikenal` — nomor yang tidak cocok pola. **Tidak ditebak**, dilewati dan dilaporkan.
- `dilewati` — kamar yang nomornya sudah berupa angka.

### Aman dijalankan ulang

Kamar yang sudah bergaya baru dilewati, jadi migrasi bisa dijalankan berkali-kali tanpa efek ganda.

Ada satu jebakan yang sempat lolos pada rancangan awal: bila migrasi terhenti **setelah** koleksi `kamar` tersimpan tetapi **sebelum** referensinya, kamar sudah bernomor `101` sehingga tidak masuk peta penggantian, sedangkan `tagihan` masih menyimpan `B1`. Menjalankan ulang justru akan melaporkan `B1` sebagai "tidak dikenal" dan referensinya tertinggal selamanya.

Perbaikannya: nomor tujuan sebuah referensi tidak diambil dari peta penggantian saja, melainkan dihitung ulang dari nomor lamanya (`peta.get(lama) ?? nomorBaru(lama)`), lalu divalidasi terhadap daftar kamar setelah migrasi. Dijaga oleh tes `repairs references left behind by an interrupted run`.

### `src/composables/useMigrasiKamar.ts` — eksekusi

- `pratinjau(property_id)` — menyusun rencana dari store yang sudah dimuat.
- `unduhBackup(property_id)` — mengunduh JSON berisi keempat koleksi untuk properti itu, apa adanya sebelum perubahan.
- `terapkan(rencana)` — menulis lewat `writeBatch`, dipotong 450 operasi per batch (batas Firestore 500).

Setiap batch atomik. Antarbatch tidak, tetapi karena rencananya idempoten, kegagalan di tengah dipulihkan dengan menjalankan ulang.

### Antarmuka — Pengaturan → Migrasi Nomor

Alurnya sengaja dibuat berpalang:

1. Pilih properti → **Lihat Rencana**.
2. Rencana ditampilkan: jumlah dokumen per koleksi, daftar `B1 → 101` per kamar, plus peringatan bentrok dan data tak dikenal.
3. **Unduh Backup** — tombol jalankan tetap nonaktif sampai ini ditekan.
4. **Jalankan Migrasi** → dialog konfirmasi yang menyebutkan jumlah dokumen dan bahwa riwayat tagihan ikut berubah.

Backup diwajibkan karena migrasi ini tidak punya tombol undo.

---

## Pengujian

`src/tests/utils/nomorKamar.test.ts` — 17 tes:
- seluruh pemetaan B/A/C/D sesuai spesifikasi, termasuk inventaris lengkap 22 kamar Waru 23
- huruf kecil dan spasi berlebih ditoleransi; blok di luar peta ditolak
- referensi di penghuni/tagihan/maintenance ikut berubah, tidak ada yang tertinggal
- properti lain tidak tersentuh walau nomor kamarnya sama
- bentrok dilaporkan, bukan ditimpa
- pola tak dikenal dilaporkan, bukan ditebak
- pemulihan setelah migrasi terhenti di tengah
- idempoten: dijalankan lagi setelah selesai menghasilkan rencana kosong

Verifikasi: `typecheck=0`, `build=0`, 80 tes lulus.

`terapkan()` sendiri tidak diuji unit — isinya panggilan `writeBatch` ke Firestore. Yang diuji adalah perencanaannya, tempat semua keputusan berada.

---

## Yang masih dibutuhkan pemilik

Migrasi **belum dijalankan**. Datanya tidak bisa saya baca dari sini, jadi jumlah kamar sebenarnya, nomor yang menyimpang, dan kemungkinan bentrok baru terlihat setelah pemilik menekan "Lihat Rencana" di aplikasi.
