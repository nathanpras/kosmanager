# Invoice, Bayar di Muka, dan Prorata Hari-Orang — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tagihan dihitung per orang per hari sehingga pergantian penghuni di tengah bulan tidak lagi salah hitung, ditambah invoice siap cetak, pencatatan bayar di muka berdiskon, arsip mantan penghuni, dan penyesuaian saldo dari Dashboard.

**Architecture:** Logika uang tetap di fungsi murni pada `src/utils/` (bisa diuji tanpa Firestore); composable `useTagihanCalc` merakitnya jadi draft tagihan; view hanya memanggil. Perubahan intinya: satu kamar per bulan bisa menghasilkan lebih dari satu draft tagihan, sehingga semua pemanggil harus menerima array.

**Tech Stack:** Vue 3 + TypeScript + Vite + Pinia + Firestore, Vitest untuk tes.

## Global Constraints

- Bahasa komentar dan teks UI: **Indonesia**, mengikuti kode yang sudah ada. Nama variabel campur Indonesia/Inggris seperti sekarang — ikuti berkas yang sedang disunting.
- Label bulan selalu bentuk `"Maret 2026"`; tanggal selalu ISO `YYYY-MM-DD`. Jangan mengurai tanggal ISO dengan `new Date()` untuk mengambil bagian tanggalnya — urai tekstual (lihat catatan di `src/utils/date.ts`).
- Aturan uang yang sudah disepakati dan tidak boleh berubah: tambahan **300.000 per orang di atas penghuni pertama** (`DEFAULT_NOMINAL_TAMBAHAN`), tambahan **ikut diprorata**, hari dihitung **inklusif**.
- Tidak boleh menambah dependency baru. Invoice memakai `window.print()`.
- **Tagihan berstatus `lunas` tidak boleh diubah nominalnya oleh proses otomatis apa pun** — `nilaiDibayar()` memakainya untuk saldo yang sudah dicocokkan dengan bank.
- Data lama Firestore memakai `kontrak_selesai`. Pembacaan selalu `p.tgl_keluar ?? p.kontrak_selesai`; penulisan hanya ke `tgl_keluar`. Tidak ada skrip migrasi — Firestore hanya bisa ditulis dari dalam aplikasi.
- Perintah verifikasi: `npm run test:run` dan `npm run typecheck`. Keduanya harus hijau sebelum commit.

---

### Task 1: Mesin hitung hari-orang

**Files:**
- Modify: `src/utils/billing.ts`
- Test: `src/tests/utils/billing.test.ts`

**Interfaces:**
- Consumes: `hariDalamBulan()`, `tarifBulanan()`, `MONTHS_FULL` — semuanya sudah ada.
- Produces: `rentangHuni()`, `hitungBagian()`, `tglDiBulan()`, tipe `PenghuniBulan` dan `BagianTagihan`.

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan di akhir `src/tests/utils/billing.test.ts`, dan tambahkan `rentangHuni, hitungBagian, tglDiBulan` ke daftar import dari `'../../utils/billing'`:

```ts
function orang(id: string, masuk: string, tgl_keluar?: string) {
  return { id, nama: `Orang ${id}`, masuk, tgl_keluar }
}

const KAMAR = { bulan: 'Maret 2026', harga: 1_500_000, nominalTambahan: 300_000 }

describe('rentangHuni', () => {
  it('memotong rentang ke dalam bulan yang diminta', () => {
    expect(rentangHuni(orang('a', '2026-01-01'), 'Maret 2026'))
      .toEqual({ dari: 1, sampai: 31, hari: 31 })
    expect(rentangHuni(orang('a', '2026-03-15'), 'Maret 2026'))
      .toEqual({ dari: 15, sampai: 31, hari: 17 })
    expect(rentangHuni(orang('a', '2026-01-01', '2026-03-10'), 'Maret 2026'))
      .toEqual({ dari: 1, sampai: 10, hari: 10 })
    expect(rentangHuni(orang('a', '2026-03-05', '2026-03-20'), 'Maret 2026'))
      .toEqual({ dari: 5, sampai: 20, hari: 16 })
  })

  it('mengembalikan null bila tidak beririsan dengan bulan itu', () => {
    expect(rentangHuni(orang('a', '2026-05-01'), 'Maret 2026')).toBeNull()
    expect(rentangHuni(orang('a', '2026-01-01', '2026-02-28'), 'Maret 2026')).toBeNull()
    expect(rentangHuni(orang('a', '2026-01-01'), 'bukan bulan')).toBeNull()
  })
})

describe('hitungBagian', () => {
  it('menagih satu penghuni sebulan penuh sebesar harga kamar', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01')] })
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ penghuni_id: 'a', hari: 31, jumlah: 1_500_000, peran: 'penanggung' })
  })

  it('membebankan tambahan ke penghuni kedua, bukan ke penanggung', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01'), orang('b', '2026-02-01')] })
    expect(b.map(x => x.jumlah)).toEqual([1_500_000, 300_000])
    expect(b.map(x => x.peran)).toEqual(['penanggung', 'tambahan'])
  })

  it('menjumlah persis sama dengan tarifBulanan saat semua penuh', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01'), orang('b', '2026-01-01'), orang('c', '2026-01-01')] })
    expect(b.reduce((s, x) => s + x.jumlah, 0)).toBe(tarifBulanan(1_500_000, 3, 300_000))
  })

  it('memprorata penghuni yang masuk tengah bulan', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-03-15')] })
    expect(b[0]).toMatchObject({ hari: 17, jumlah: 822_581 })
  })

  it('memprorata penghuni yang keluar tengah bulan', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01', '2026-03-10')] })
    expect(b[0]).toMatchObject({ hari: 10, jumlah: 483_871 })
  })

  it('memprorata tambahan untuk penghuni kedua yang masuk tengah bulan', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01'), orang('b', '2026-03-15')] })
    expect(b.map(x => x.jumlah)).toEqual([1_500_000, 164_516])
  })

  it('memberi tiap orang bagiannya sendiri saat ada pergantian di bulan yang sama', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01', '2026-03-10'), orang('b', '2026-03-15')] })
    expect(b.map(x => x.penghuni_id)).toEqual(['a', 'b'])
    expect(b.map(x => x.jumlah)).toEqual([483_871, 822_581])
    expect(b.map(x => x.peran)).toEqual(['penanggung', 'penanggung'])
  })

  it('menghitung Februari kabisat dan non-kabisat', () => {
    const nonKabisat = hitungBagian({ ...KAMAR, bulan: 'Februari 2026', penghuni: [orang('a', '2026-02-15')] })
    expect(nonKabisat[0]).toMatchObject({ hari: 14, jumlah: 750_000 })
    const kabisat = hitungBagian({ ...KAMAR, bulan: 'Februari 2028', penghuni: [orang('a', '2028-02-15')] })
    expect(kabisat[0]).toMatchObject({ hari: 15, jumlah: 775_862 })
  })

  it('membuang penghuni yang tidak punya hari di bulan itu', () => {
    const b = hitungBagian({ ...KAMAR, penghuni: [orang('a', '2026-01-01'), orang('b', '2026-09-01')] })
    expect(b.map(x => x.penghuni_id)).toEqual(['a'])
  })

  it('mengembalikan array kosong untuk kamar tanpa penghuni', () => {
    expect(hitungBagian({ ...KAMAR, penghuni: [] })).toEqual([])
  })
})

describe('tglDiBulan', () => {
  it('merakit tanggal ISO dari label bulan', () => {
    expect(tglDiBulan('Maret 2026', 1)).toBe('2026-03-01')
    expect(tglDiBulan('Desember 2026', 25)).toBe('2026-12-25')
  })
})
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npm run test:run -- src/tests/utils/billing.test.ts`
Expected: FAIL — `rentangHuni is not a function` / import tidak ditemukan.

- [ ] **Step 3: Implementasi di `src/utils/billing.ts`**

Ubah `import { MONTHS_FULL } from './format'` menjadi juga mengimpor `bulanKey`:

```ts
import { MONTHS_FULL } from './format'
import { bulanKey } from './date'
```

(`date.ts` mengimpor `format.ts` saja, jadi tidak ada impor melingkar.)

Ganti fungsi privat `tglAwalBulan` menjadi ekspor publik dengan nama yang jujur, dan perbarui pemakaiannya di `hitungTagihan`:

```ts
/** Tanggal ke-`hari` pada label bulan tersebut, format YYYY-MM-DD. */
export function tglDiBulan(bulan: string, hari: number): string {
  const [nama, tahun] = (bulan ?? '').split(' ')
  const idx = MONTHS_FULL.indexOf(nama)
  return `${tahun}-${String(idx + 1).padStart(2, '0')}-${String(hari).padStart(2, '0')}`
}
```

Tambahkan di bawahnya:

```ts
export interface PenghuniBulan {
  id: string
  nama: string
  masuk: string
  /** Tanggal keluar, inklusif. Kosong berarti masih tinggal. */
  tgl_keluar?: string
}

export interface RentangHuni {
  dari: number
  sampai: number
  hari: number
}

export interface BagianTagihan {
  penghuni_id: string
  nama: string
  dari: number
  sampai: number
  hari: number
  jumlah: number
  /** 'penanggung' bila ia menanggung harga kamar minimal satu hari. */
  peran: 'penanggung' | 'tambahan'
}

/**
 * Potongan rentang huni seseorang di dalam satu bulan, inklusif di kedua ujung.
 * null bila ia tidak punya satu hari pun di bulan itu.
 */
export function rentangHuni(p: PenghuniBulan, bulan: string): RentangHuni | null {
  const totalHari = hariDalamBulan(bulan)
  if (totalHari === 0) return null
  const kunci = bulanKey(bulan)
  const awal = `${kunci}-01`
  const akhir = `${kunci}-${String(totalHari).padStart(2, '0')}`

  const mulai   = p.masuk && p.masuk > awal ? p.masuk : awal
  const selesai = p.tgl_keluar && p.tgl_keluar < akhir ? p.tgl_keluar : akhir
  // Perbandingan string ISO cukup: rentang yang jatuh di luar bulan ini
  // menghasilkan mulai > selesai.
  if (mulai > selesai) return null

  const dari = parseInt(mulai.slice(8, 10), 10)
  const sampai = parseInt(selesai.slice(8, 10), 10)
  return { dari, sampai, hari: sampai - dari + 1 }
}

/**
 * Membagi tagihan sebuah kamar dalam satu bulan menjadi bagian per penghuni.
 *
 * Untuk setiap hari, penghuni dengan tanggal masuk terlama di antara yang hadir
 * hari itu menanggung harga kamar; setiap orang lain yang hadir menanggung satu
 * nominal tambahan. Dengan begitu penghuni yang keluar atau masuk di tengah
 * bulan hanya membayar hari yang benar-benar ia tempati, dan tambahan ikut
 * diprorata — dua hal yang tidak bisa diungkapkan oleh satu tagihan per kamar.
 *
 * Nominal dihitung sekali dari total hari (`tarif * hari / totalHari`), bukan
 * dengan menjumlahkan pembulatan harian, supaya tidak ada selisih rupiah yang
 * menumpuk.
 */
export function hitungBagian(input: {
  bulan: string
  harga: number
  nominalTambahan: number
  penghuni: PenghuniBulan[]
}): BagianTagihan[] {
  const totalHari = hariDalamBulan(input.bulan)
  if (totalHari === 0) return []
  const harga = Number(input.harga) || 0
  const tambahan = Number(input.nominalTambahan) || 0

  const hadir = input.penghuni
    .map(p => ({ p, r: rentangHuni(p, input.bulan) }))
    .filter((x): x is { p: PenghuniBulan; r: RentangHuni } => x.r !== null)
    // Terlama dulu. Tanggal masuk sama diurut id supaya hasilnya deterministik.
    .sort((a, b) => (a.p.masuk ?? '').localeCompare(b.p.masuk ?? '') || a.p.id.localeCompare(b.p.id))

  const hariPenanggung = hadir.map(() => 0)
  const hariTambahan = hadir.map(() => 0)

  for (let d = 1; d <= totalHari; d++) {
    const adaHariIni: number[] = []
    for (let i = 0; i < hadir.length; i++) {
      if (hadir[i].r.dari <= d && d <= hadir[i].r.sampai) adaHariIni.push(i)
    }
    if (adaHariIni.length === 0) continue
    hariPenanggung[adaHariIni[0]]++
    for (const i of adaHariIni.slice(1)) hariTambahan[i]++
  }

  return hadir.map(({ p, r }, i) => ({
    penghuni_id: p.id,
    nama: p.nama,
    dari: r.dari,
    sampai: r.sampai,
    hari: r.hari,
    jumlah: Math.round(harga * hariPenanggung[i] / totalHari)
      + Math.round(tambahan * hariTambahan[i] / totalHari),
    peran: hariPenanggung[i] > 0 ? 'penanggung' as const : 'tambahan' as const,
  }))
}
```

- [ ] **Step 4: Jalankan tes, pastikan lulus**

Run: `npm run test:run -- src/tests/utils/billing.test.ts` lalu `npm run typecheck`
Expected: PASS, termasuk seluruh tes lama di berkas itu.

- [ ] **Step 5: Commit**

```bash
git add src/utils/billing.ts src/tests/utils/billing.test.ts
git commit -m "feat(billing): hitung tagihan per orang per hari"
```

---

### Task 2: Tanggal keluar dan okupansi per bulan

**Files:**
- Modify: `src/types/index.ts`, `src/composables/useOccupancy.ts`
- Test: `src/tests/composables/useOccupancy.test.ts`

**Interfaces:**
- Consumes: `rentangHuni()`, `PenghuniBulan` dari Task 1.
- Produces: `tglKeluar(p)`, `toPenghuniBulan(p)`, `penghuniDiBulan(nomor, property_id, bulan)`, `sudahKeluar(p, per?)` — semuanya diekspor dari `useOccupancy.ts` sebagai fungsi modul (bukan hanya dari dalam composable), supaya view bisa memakainya langsung.

Catatan rancangan: **tidak ada field `arsip`.** Status mantan penghuni diturunkan dari `tgl_keluar` yang sudah lewat. Menyimpan flag terpisah berarti dua sumber kebenaran yang bisa berselisih.

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan `tglKeluar, penghuniDiBulan, sudahKeluar` ke import dari `'../../composables/useOccupancy'` di `src/tests/composables/useOccupancy.test.ts`, lalu tambahkan di akhir berkas:

```ts
describe('tgl_keluar', () => {
  it('membaca kontrak_selesai milik data lama', () => {
    expect(tglKeluar({ ...huni({ id: 'a' }), kontrak_selesai: '2026-03-10' })).toBe('2026-03-10')
  })

  it('mendahulukan tgl_keluar bila keduanya ada', () => {
    expect(tglKeluar({ ...huni({ id: 'a' }), kontrak_selesai: '2026-03-10', tgl_keluar: '2026-04-01' }))
      .toBe('2026-04-01')
  })

  it('menandai penghuni yang tanggal keluarnya sudah lewat', () => {
    expect(sudahKeluar(huni({ id: 'a', tgl_keluar: '2026-06-30' }))).toBe(true)
    expect(sudahKeluar(huni({ id: 'b', tgl_keluar: '2026-12-31' }))).toBe(false)
    expect(sudahKeluar(huni({ id: 'c' }))).toBe(false)
  })
})

describe('penghuniDiBulan', () => {
  it('menyertakan penghuni yang sudah keluar di bulan itu', () => {
    usePenghuniStore().items = [huni({ id: 'a', tgl_keluar: '2026-03-10' })]
    expect(useOccupancy().penghuniDiBulan('101', 'p1', 'Maret 2026').map(p => p.id)).toEqual(['a'])
  })

  it('membuang penghuni yang keluar sebelum bulan itu', () => {
    usePenghuniStore().items = [huni({ id: 'a', tgl_keluar: '2026-02-28' })]
    expect(useOccupancy().penghuniDiBulan('101', 'p1', 'Maret 2026')).toEqual([])
  })

  it('membuang penghuni yang baru masuk setelah bulan itu', () => {
    usePenghuniStore().items = [huni({ id: 'a', masuk: '2026-05-01' })]
    expect(useOccupancy().penghuniDiBulan('101', 'p1', 'Maret 2026')).toEqual([])
  })

  it('mengumpulkan yang keluar dan yang masuk di bulan yang sama', () => {
    usePenghuniStore().items = [
      huni({ id: 'b', masuk: '2026-03-15' }),
      huni({ id: 'a', masuk: '2026-01-01', tgl_keluar: '2026-03-10' }),
    ]
    expect(useOccupancy().penghuniDiBulan('101', 'p1', 'Maret 2026').map(p => p.id)).toEqual(['a', 'b'])
  })

  it('tidak mencampur kamar bernomor sama dari properti lain', () => {
    usePenghuniStore().items = [huni({ id: 'a' }), huni({ id: 'b', property_id: 'p2' })]
    expect(useOccupancy().penghuniDiBulan('101', 'p1', 'Maret 2026').map(p => p.id)).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npm run test:run -- src/tests/composables/useOccupancy.test.ts`
Expected: FAIL — `tglKeluar is not a function`.

- [ ] **Step 3: Implementasi**

Di `src/types/index.ts`, pada `interface Penghuni`, tandai field lama dan tambahkan yang baru:

```ts
  /** @deprecated Dipakai data lama. Baca lewat tglKeluar(), tulis ke tgl_keluar. */
  kontrak_selesai?: string
  /** Tanggal penghuni keluar, inklusif. Diisi saat orangnya pamit — kos ini tidak berkontrak. */
  tgl_keluar?: string
```

Tulis ulang `src/composables/useOccupancy.ts`:

```ts
import { usePenghuniStore } from '../stores/penghuni'
import { today } from '../utils/date'
import { rentangHuni } from '../utils/billing'
import type { PenghuniBulan } from '../utils/billing'
import type { Penghuni } from '../types'

/**
 * Tanggal keluar penghuni.
 *
 * Kos ini tidak berkontrak: penghuni lanjut terus sampai suatu hari pamit, jadi
 * `kontrak_selesai` sebenarnya tanggal keluar. Namanya diganti, tapi dokumen
 * lama di Firestore masih memakai nama lama — dibaca lewat sini supaya tidak
 * perlu migrasi data.
 */
export function tglKeluar(p: Pick<Penghuni, 'tgl_keluar' | 'kontrak_selesai'>): string | undefined {
  return p.tgl_keluar ?? p.kontrak_selesai
}

export function sudahKeluar(p: Penghuni, per = today()): boolean {
  const k = tglKeluar(p)
  return !!k && k < per
}

export function toPenghuniBulan(p: Penghuni): PenghuniBulan {
  return { id: p.id, nama: p.nama, masuk: p.masuk, tgl_keluar: tglKeluar(p) }
}

function masihAktif(p: Penghuni, per: string): boolean {
  const k = tglKeluar(p)
  return !k || k >= per
}

/**
 * Hunian kamar diturunkan dari koleksi `penghuni`, bukan ditulis manual.
 *
 * Sebelumnya status kamar di-flip di beberapa tempat sekaligus (tambah penghuni,
 * pindah kamar, keluarkan penghuni) dan sebagian mencari kamar tanpa menyaring
 * `property_id`. Begitu satu kamar boleh diisi dua orang, cara itu ikut
 * mengosongkan kamar yang roommate-nya masih tinggal.
 */
export function useOccupancy() {
  const penghuni = usePenghuniStore()

  /** Penghuni aktif di sebuah kamar, urut tanggal masuk (terlama dulu). */
  function penghuniDiKamar(nomor: string, property_id: string, per = today()): Penghuni[] {
    return penghuni.items
      .filter(p => p.kamar === nomor && p.property_id === property_id && masihAktif(p, per))
      .sort((a, b) => (a.masuk ?? '').localeCompare(b.masuk ?? ''))
  }

  /**
   * Semua penghuni yang punya minimal satu hari di `bulan`, termasuk yang sudah
   * keluar. Inilah yang harus dipakai untuk menghitung tagihan —
   * `penghuniDiKamar` menyaring dengan tanggal hari ini, sehingga penghuni yang
   * sudah keluar hilang dari tagihan bulan lampau.
   */
  function penghuniDiBulan(nomor: string, property_id: string, bulan: string): Penghuni[] {
    return penghuni.items
      .filter(p => p.kamar === nomor && p.property_id === property_id
        && rentangHuni(toPenghuniBulan(p), bulan) !== null)
      .sort((a, b) => (a.masuk ?? '').localeCompare(b.masuk ?? ''))
  }

  function jumlahPenghuni(nomor: string, property_id: string, per = today()): number {
    return penghuniDiKamar(nomor, property_id, per).length
  }

  /**
   * Apakah kamar masih dihuni bila penghuni `kecualiId` dikeluarkan?
   * Dipakai sebelum menandai kamar kosong, supaya roommate tidak ikut terhapus.
   */
  function kamarMasihTerisi(nomor: string, property_id: string, kecualiId?: string): boolean {
    return penghuniDiKamar(nomor, property_id).some(p => p.id !== kecualiId)
  }

  return { penghuniDiKamar, penghuniDiBulan, jumlahPenghuni, kamarMasihTerisi }
}
```

- [ ] **Step 4: Jalankan tes, pastikan lulus**

Run: `npm run test:run -- src/tests/composables/useOccupancy.test.ts` lalu `npm run typecheck`
Expected: PASS. Tes lama yang memakai `kontrak_selesai` tetap lulus lewat jalur kompatibilitas.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/composables/useOccupancy.ts src/tests/composables/useOccupancy.test.ts
git commit -m "feat(penghuni): tgl_keluar dan okupansi per bulan"
```

---

### Task 3: Draft tagihan — kapan digabung, kapan dipecah

**Files:**
- Modify: `src/composables/useTagihanCalc.ts`, `src/types/index.ts`
- Test: `src/tests/composables/useTagihanCalc.test.ts` (baru)

**Interfaces:**
- Consumes: `hitungBagian()`, `tglDiBulan()`, `hariDalamBulan()` (Task 1); `penghuniDiBulan()`, `toPenghuniBulan()` (Task 2).
- Produces: `tagihanUntukKamar(nomor, property_id, bulan): DraftTagihan[]` dan tipe `DraftTagihan`.

- [ ] **Step 1: Tulis tes yang gagal**

Buat `src/tests/composables/useTagihanCalc.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTagihanCalc } from '../../composables/useTagihanCalc'
import { usePenghuniStore } from '../../stores/penghuni'
import { useKamarStore } from '../../stores/kamar'
import { useSettingsStore } from '../../stores/settings'
import type { Penghuni, Kamar } from '../../types'

function huni(over: Partial<Penghuni> & { id: string }): Penghuni {
  return {
    nama: `Orang ${over.id}`, kamar: '101', hp: '08123456789', masuk: '2026-01-01',
    property_id: 'p1', ...over,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  useKamarStore().items = [{
    id: 'k1', nomor: '101', tipe: 'A', harga: 1_500_000, status: 'terisi', property_id: 'p1',
  } as Kamar]
  useSettingsStore().data = { tgl_jatuh_tempo: 1, nominal_tambahan: 300_000 }
})

describe('tagihanUntukKamar', () => {
  it('menggabung dua penghuni sebulan penuh menjadi satu tagihan', () => {
    usePenghuniStore().items = [huni({ id: 'a' }), huni({ id: 'b', masuk: '2026-02-01' })]
    const draft = useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')
    expect(draft).toHaveLength(1)
    expect(draft[0]).toMatchObject({
      penghuni: 'Orang a', penghuni_id: 'a', kamar: '101', bulan: 'Maret 2026',
      jumlah: 1_800_000, jatuh_tempo: '2026-03-01',
    })
    expect(draft[0].is_prorated).toBeFalsy()
  })

  it('tetap satu tagihan saat penghuni kedua masuk tengah bulan', () => {
    usePenghuniStore().items = [huni({ id: 'a' }), huni({ id: 'b', masuk: '2026-03-15' })]
    const draft = useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')
    expect(draft).toHaveLength(1)
    expect(draft[0].jumlah).toBe(1_664_516)
  })

  it('memecah per orang saat ada yang keluar tengah bulan', () => {
    usePenghuniStore().items = [
      huni({ id: 'a', tgl_keluar: '2026-03-10' }),
      huni({ id: 'b', masuk: '2026-03-15' }),
    ]
    const draft = useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')
    expect(draft).toHaveLength(2)
    expect(draft.map(d => d.penghuni_id)).toEqual(['a', 'b'])
    expect(draft.map(d => d.jumlah)).toEqual([483_871, 822_581])
    expect(draft[0]).toMatchObject({ dari: '2026-03-01', sampai: '2026-03-10', hari: 10, is_prorated: true })
    expect(draft[1]).toMatchObject({ dari: '2026-03-15', sampai: '2026-03-31', hari: 17, jatuh_tempo: '2026-03-15' })
  })

  it('memakai tanggal masuk sebagai jatuh tempo di bulan masuk', () => {
    usePenghuniStore().items = [huni({ id: 'a', masuk: '2026-03-15' })]
    const draft = useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')
    expect(draft[0].jatuh_tempo).toBe('2026-03-15')
    expect(draft[0].is_prorated).toBe(true)
  })

  it('mengembalikan array kosong untuk kamar kosong di bulan itu', () => {
    usePenghuniStore().items = [huni({ id: 'a', masuk: '2026-06-01' })]
    expect(useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')).toEqual([])
  })

  it('memakai nominal_tambahan milik kamar bila diisi', () => {
    useKamarStore().items[0].nominal_tambahan = 500_000
    usePenghuniStore().items = [huni({ id: 'a' }), huni({ id: 'b' })]
    expect(useTagihanCalc().tagihanUntukKamar('101', 'p1', 'Maret 2026')[0].jumlah).toBe(2_000_000)
  })
})
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npm run test:run -- src/tests/composables/useTagihanCalc.test.ts`
Expected: FAIL — hasilnya objek tunggal, bukan array (`expect(received).toHaveLength`).

- [ ] **Step 3: Implementasi**

Di `src/types/index.ts`, tambahkan ke `interface Tagihan`:

```ts
  /** ID penghuni penanggung tagihan ini. Kosong pada data lama. */
  penghuni_id?: string
  /** Jumlah hari yang ditagih, inklusif. */
  hari?: number
  /** Awal dan akhir masa yang ditagih (YYYY-MM-DD). */
  dari?: string
  sampai?: string
  /** ID batch pembayaran di muka — sama untuk semua bulan dalam satu setoran. */
  bayar_ref?: string
  /** Total diskon batch, disalin ke tiap tagihan agar invoice bisa merakit subtotal. */
  diskon_batch?: number
  /** Bulan yang sudah dibayar di muka tapi penghuninya keluar duluan. */
  hangus?: boolean
  /** Selisih bila hasil hitung ulang lebih kecil dari yang sudah dibayar. */
  kelebihan?: number
  invoice_no?: string
  invoice_tgl?: string
```

Tulis ulang `src/composables/useTagihanCalc.ts`:

```ts
import { useKamarStore } from '../stores/kamar'
import { useSettingsStore } from '../stores/settings'
import { useOccupancy, toPenghuniBulan } from './useOccupancy'
import {
  hitungBagian, hariDalamBulan, tglDiBulan,
  DEFAULT_NOMINAL_TAMBAHAN, DEFAULT_TGL_JATUH_TEMPO,
} from '../utils/billing'

export interface DraftTagihan {
  penghuni: string
  penghuni_id: string
  kamar: string
  bulan: string
  jumlah: number
  jatuh_tempo: string
  hari: number
  dari: string
  sampai: string
  is_prorated?: boolean
  prorated_hari?: number
}

/**
 * Merakit tagihan sebuah kamar dari harga kamar, siapa saja yang menghuninya di
 * bulan itu, dan pengaturan.
 *
 * Mengembalikan **array**: satu kamar bisa menghasilkan lebih dari satu tagihan
 * bila ada pergantian penghuni di tengah bulan. Kamar berisi dua orang yang
 * tidak berganti tetap satu tagihan atas nama penanggung — pemilik menagihnya ke
 * satu orang, memecahnya hanya menambah tagihan yang harus dikejar.
 */
export function useTagihanCalc() {
  const kamar = useKamarStore()
  const settings = useSettingsStore()
  const { penghuniDiBulan } = useOccupancy()

  function tagihanUntukKamar(nomor: string, property_id: string, bulan: string): DraftTagihan[] {
    const k = kamar.items.find(x => x.nomor === nomor && x.property_id === property_id)
    const huni = penghuniDiBulan(nomor, property_id, bulan)
    const totalHari = hariDalamBulan(bulan)
    if (huni.length === 0 || totalHari === 0) return []

    const bagian = hitungBagian({
      bulan,
      harga: k?.harga ?? 0,
      nominalTambahan: k?.nominal_tambahan ?? settings.data.nominal_tambahan ?? DEFAULT_NOMINAL_TAMBAHAN,
      penghuni: huni.map(toPenghuniBulan),
    })
    if (bagian.length === 0) return []

    const hariJatuhTempo = Math.min(
      Math.max(1, settings.data.tgl_jatuh_tempo ?? DEFAULT_TGL_JATUH_TEMPO),
      totalHari,
    )
    // Jatuh tempo bulan masuk memakai tanggal masuk itu sendiri — memaksanya ke
    // tanggal 1 membuat tagihan langsung berstatus telat begitu dibuat.
    const jatuhTempo = (dari: number) =>
      dari > 1 ? tglDiBulan(bulan, dari) : tglDiBulan(bulan, hariJatuhTempo)

    const draft = (b: typeof bagian[number], jumlah: number): DraftTagihan => ({
      penghuni: b.nama,
      penghuni_id: b.penghuni_id,
      kamar: nomor,
      bulan,
      jumlah,
      jatuh_tempo: jatuhTempo(b.dari),
      hari: b.hari,
      dari: tglDiBulan(bulan, b.dari),
      sampai: tglDiBulan(bulan, b.sampai),
      ...(b.hari < totalHari ? { is_prorated: true, prorated_hari: b.hari } : {}),
    })

    const adaYangKeluar = bagian.some(b => b.sampai < totalHari)
    if (adaYangKeluar) return bagian.map(b => draft(b, b.jumlah))

    const penanggung = bagian.find(b => b.peran === 'penanggung') ?? bagian[0]
    const total = bagian.reduce((s, b) => s + b.jumlah, 0)
    return [draft(penanggung, total)]
  }

  return { tagihanUntukKamar }
}
```

- [ ] **Step 4: Jalankan tes, pastikan lulus**

Run: `npm run test:run -- src/tests/composables/useTagihanCalc.test.ts`
Expected: PASS. `npm run typecheck` masih akan gagal di view — itu diperbaiki di Task 4.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useTagihanCalc.ts src/types/index.ts src/tests/composables/useTagihanCalc.test.ts
git commit -m "feat(tagihan): draft per penghuni saat ada pergantian di tengah bulan"
```

---

### Task 4: Sambungkan pemanggil ke draft berbentuk array

**Files:**
- Modify: `src/App.vue:79-104`, `src/views/TagihanView.vue:125-196`, `src/views/PenghuniView.vue:81-95`

**Interfaces:**
- Consumes: `tagihanUntukKamar(): DraftTagihan[]` (Task 3), `tglKeluar()` (Task 2).
- Produces: tidak ada API baru. Setelah task ini `npm run typecheck` harus bersih.

Pola dedupe yang dipakai di ketiga tempat: kunci `` `${penghuni_id}|${kamar}|${property_id}|${bulan}` ``, dengan jatuh balik ke nama penghuni untuk tagihan lama yang belum punya `penghuni_id`.

- [ ] **Step 1: `src/App.vue` — auto-generate bulan depan**

Ganti isi `autoGenerateNextMonth()` (baris 79–104) menjadi:

```ts
async function autoGenerateNextMonth() {
  if (new Date().getDate() < 15) return  // only generate after the 15th
  const d = new Date()
  const nextIdx   = (d.getMonth() + 1) % 12
  const nextYear  = nextIdx === 0 ? d.getFullYear() + 1 : d.getFullYear()
  const nextBulan = `${MONTHS_FULL[nextIdx]} ${nextYear}`

  // Kunci per penghuni, bukan per kamar: satu kamar bisa menghasilkan dua
  // tagihan di bulan pergantian.
  const kunci = (t: { penghuni_id?: string; penghuni: string; kamar: string; property_id: string }) =>
    `${t.penghuni_id || t.penghuni}|${t.kamar}|${t.property_id}`
  const existing = new Set(
    tagihan.items.filter(t => t.bulan === nextBulan).map(kunci),
  )

  const kamarBulanDepan = new Set(
    penghuni.items.map(p => `${p.kamar}|${p.property_id}`),
  )
  for (const key of kamarBulanDepan) {
    const [nomor, property_id] = key.split('|')
    for (const draft of tagihanUntukKamar(nomor, property_id, nextBulan)) {
      if (existing.has(kunci({ ...draft, property_id }))) continue
      await tagihan.add({
        ...draft,
        status: 'belum', property_id, createdAt: new Date().toISOString(),
      })
    }
  }
}
```

`tagihanUntukKamar` sudah melewati penghuni yang tanggal keluarnya jatuh sebelum bulan itu, jadi penyaringan `kontrak_selesai` yang lama tidak diperlukan lagi. Hapus juga variabel `firstOfNext` yang jadi tak terpakai.

- [ ] **Step 2: `src/views/TagihanView.vue` — pratinjau dan eksekusi generate**

Ganti `genPreview` (baris ±153–172) dan `doGenerate` (baris ±178–196):

```ts
const genPreview = computed(() => {
  const bulan = activeBulan.value
  const kunci = (t: { penghuni_id?: string; penghuni: string; kamar: string; property_id: string }) =>
    `${t.penghuni_id || t.penghuni}|${t.kamar}|${t.property_id}`
  const existing = new Set(tagihan.items.filter(t => t.bulan === bulan).map(kunci))

  const kamarAktif = new Set(
    filterByProperty(penghuni.items).map(p => `${p.kamar}|${p.property_id}`),
  )
  const hasil: (DraftTagihan & { property_id: string })[] = []
  for (const key of kamarAktif) {
    const [nomor, property_id] = key.split('|')
    for (const draft of tagihanUntukKamar(nomor, property_id, bulan)) {
      if (existing.has(kunci({ ...draft, property_id }))) continue
      hasil.push({ ...draft, property_id })
    }
  }
  return hasil
})

async function doGenerate() {
  confirmGen.value = false
  const bulan = activeBulan.value
  const toCreate = genPreview.value
  let created = 0
  try {
    for (const draft of toCreate) {
      await tagihan.add({
        ...draft, status: 'belum', createdAt: new Date().toISOString(),
      })
      created++
    }
    await log.add(`Generate ${created} tagihan ${bulan}`, 'blue', app.currentPropertyId === 'all' ? '' : app.currentPropertyId)
    toast(`${created} tagihan ${bulan} dibuat`, 'success')
  } catch { toast('Gagal generate tagihan', 'error') }
}
```

Tambahkan `import type { DraftTagihan } from '../composables/useTagihanCalc'`. Template pratinjau yang menampilkan `p.nama` dan `p.kamar` menjadi `d.penghuni` dan `d.kamar` — periksa blok `confirmGen` di template dan sesuaikan nama fieldnya.

Perbaiki juga `onPenghuniChange` (baris ±126–136) yang sekarang menerima objek tunggal:

```ts
function onPenghuniChange() {
  const p = penghuni.items.find(x => x.nama === addForm.value.penghuni)
  if (!p) return
  addForm.value.kamar = p.kamar
  const bulan = addForm.value.bulan ?? bulanIni()
  const draft = tagihanUntukKamar(p.kamar, p.property_id, bulan)
  // Ambil bagian milik orang yang dipilih; kalau tagihannya digabung, yang
  // muncul adalah satu draft atas nama penanggung.
  const milikDia = draft.find(d => d.penghuni_id === p.id) ?? draft[0]
  if (!milikDia) return
  addForm.value.jumlah = milikDia.jumlah
  addForm.value.jatuh_tempo = milikDia.jatuh_tempo
  addForm.value.penghuni_id = milikDia.penghuni_id
}
```

- [ ] **Step 3: `src/views/PenghuniView.vue` — tagihan bulan masuk**

Ganti `buatTagihanBulanMasuk` (baris ±81–95) supaya membuat seluruh draft kamar itu dan melewati yang sudah ada:

```ts
async function buatTagihanBulanMasuk(p: Penghuni) {
  const bln = bulanFromTgl(p.masuk)
  if (!bln) return
  const kunci = (t: { penghuni_id?: string; penghuni: string; kamar: string }) =>
    `${t.penghuni_id || t.penghuni}|${t.kamar}`
  const existing = new Set(
    tagihan.items.filter(t => t.bulan === bln && t.property_id === p.property_id).map(kunci),
  )
  for (const draft of tagihanUntukKamar(p.kamar, p.property_id, bln)) {
    if (existing.has(kunci(draft))) continue
    await tagihan.add({
      ...draft, status: 'belum', property_id: p.property_id,
      createdAt: new Date().toISOString(),
    })
  }
}
```

Hapus juga blok `watch` "Auto-suggest kontrak_selesai = masuk + 12 months" (baris ±99–105) dan ganti label field `Kontrak Selesai` di form menjadi `Tanggal Keluar` yang terikat ke `form.tgl_keluar`. Kolom tabel dan kartu yang menampilkan `p.kontrak_selesai` dibaca lewat `tglKeluar(p)`; `statusPenghuni()` juga memakai `tglKeluar(p)` dan labelnya jadi `Aktif` / `Keluar <tanggal>`.

- [ ] **Step 4: Verifikasi**

Run: `npm run typecheck && npm run test:run`
Expected: keduanya PASS, tanpa error `Property 'jumlah' does not exist on type 'DraftTagihan[]'`.

- [ ] **Step 5: Commit**

```bash
git add src/App.vue src/views/TagihanView.vue src/views/PenghuniView.vue
git commit -m "fix(tagihan): pakai draft per penghuni di semua jalur generate"
```

---

### Task 5: Keluarkan penghuni dan tab Mantan Penghuni

**Files:**
- Modify: `src/views/PenghuniView.vue`
- Test: manual di aplikasi (menyentuh Firestore, tidak bisa diuji Vitest)

**Interfaces:**
- Consumes: `tglKeluar()`, `sudahKeluar()` (Task 2); `tagihanUntukKamar()` (Task 3); `bulanFromTgl()`, `bulanKey()` (`src/utils/date.ts`).
- Produces: tidak ada API baru.

- [ ] **Step 1: Dialog Keluarkan Penghuni**

Tambahkan state dan fungsi di `<script setup>` `PenghuniView.vue`:

```ts
const showKeluar = ref(false)
const keluarTarget = ref<Penghuni | null>(null)
const keluarTgl = ref(today())

function askKeluar(p: Penghuni) {
  keluarTarget.value = p
  keluarTgl.value = today()
  showKeluar.value = true
}

async function doKeluar() {
  const p = keluarTarget.value
  if (!p) return
  showKeluar.value = false
  const tgl = keluarTgl.value
  const bulanKeluar = bulanFromTgl(tgl)
  try {
    await penghuni.update(p.id, { tgl_keluar: tgl })

    // Hitung ulang bulan keluar, tapi JANGAN sentuh yang sudah lunas — nominal
    // tagihan lunas dipakai saldo yang sudah dicocokkan dengan mutasi bank.
    if (bulanKeluar) {
      const draft = tagihanUntukKamar(p.kamar, p.property_id, bulanKeluar)
      const milikDia = draft.find(d => d.penghuni_id === p.id)
      const t = tagihan.items.find(x => x.bulan === bulanKeluar && x.property_id === p.property_id
        && (x.penghuni_id === p.id || x.penghuni === p.nama))
      if (t && milikDia) {
        if (t.status === 'lunas') {
          const lebih = (Number(t.jumlah_bayar) || Number(t.jumlah) || 0) - milikDia.jumlah
          if (lebih > 0) await tagihan.update(t.id, { kelebihan: lebih })
        } else {
          await tagihan.update(t.id, {
            jumlah: milikDia.jumlah, hari: milikDia.hari,
            dari: milikDia.dari, sampai: milikDia.sampai,
            is_prorated: milikDia.is_prorated ?? false,
            prorated_hari: milikDia.prorated_hari ?? 0,
          })
        }
      }
    }

    // Bulan setelah keluar: yang belum lunas dihapus, yang sudah lunas ditandai
    // hangus. Dokumen lunas TIDAK dihapus — uangnya sudah masuk rekening, dan
    // menghapusnya membuat saldo turun sendiri tanpa ada uang yang keluar.
    const batas = bulanKeluar ? bulanKey(bulanKeluar) : ''
    const sesudah = tagihan.items.filter(t =>
      t.property_id === p.property_id
      && (t.penghuni_id === p.id || t.penghuni === p.nama)
      && bulanKey(t.bulan) > batas)
    let hangus = 0
    for (const t of sesudah) {
      if (t.status === 'lunas') { await tagihan.update(t.id, { hangus: true }); hangus += Number(t.jumlah_bayar) || Number(t.jumlah) || 0 }
      else await tagihan.remove(t.id)
    }

    const catatan = hangus > 0
      ? `${p.nama} keluar ${fmtTgl(tgl)} — bayar di muka ${fmt(hangus)} hangus`
      : `${p.nama} keluar ${fmtTgl(tgl)}`
    await log.add(catatan, 'amber', p.property_id)
    toast('Penghuni dikeluarkan', 'success')
  } catch { toast('Gagal mengeluarkan penghuni', 'error') }
}
```

Pastikan `log`, `toast`, `fmt`, `fmtTgl`, `today`, `bulanKey`, `bulanFromTgl`, dan `tagihan` sudah diimpor di berkas itu — beberapa sudah ada, tambahkan yang belum.

Tambahkan modal di template, mengikuti pola modal yang sudah dipakai di berkas ini (`.overlay` > `.modal` > `.modal-head`/`.modal-body`/`.modal-foot`):

```html
<div class="overlay" :class="{ open: showKeluar }" @click.self="showKeluar = false">
  <div class="modal">
    <div class="modal-handle"></div>
    <div class="modal-head"><h2>Keluarkan Penghuni</h2><button class="close-btn" @click="showKeluar = false">✕</button></div>
    <div class="modal-body" v-if="keluarTarget">
      <p style="color:var(--text2)">{{ keluarTarget.nama }} — kamar {{ keluarTarget.kamar }}</p>
      <div class="fg"><label>Tanggal Keluar</label><input v-model="keluarTgl" type="date" /></div>
      <p style="color:var(--text2);font-size:13px">
        Tagihan bulan ini dihitung ulang sesuai hari yang ditempati. Tagihan yang sudah lunas tidak diubah.
      </p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="showKeluar = false">Batal</button>
      <button class="btn btn-primary" @click="doKeluar">Keluarkan</button>
    </div>
  </div>
</div>
```

Tombol pemicunya diletakkan di baris tabel dan kartu mobile, di sebelah tombol hapus yang sudah ada.

- [ ] **Step 2: Tab Mantan Penghuni**

Tambahkan:

```ts
const tab = ref<'aktif' | 'mantan'>('aktif')
const cariMantan = ref('')

const aktif = computed(() => filtered.value.filter(p => !sudahKeluar(p)))
const mantan = computed(() => {
  const q = cariMantan.value.trim().toLowerCase()
  return filtered.value
    .filter(p => sudahKeluar(p))
    .filter(p => !q || p.nama.toLowerCase().includes(q) || p.kamar.toLowerCase().includes(q))
    .sort((a, b) => (tglKeluar(b) ?? '').localeCompare(tglKeluar(a) ?? ''))
})

function totalDibayar(p: Penghuni): number {
  return tagihan.items
    .filter(t => t.property_id === p.property_id && (t.penghuni_id === p.id || t.penghuni === p.nama))
    .reduce((s, t) => s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? Number(t.jumlah) || 0 : 0)), 0)
}

async function pulihkan(p: Penghuni) {
  await penghuni.update(p.id, { tgl_keluar: '', kontrak_selesai: '' })
  toast('Penghuni dipulihkan', 'success')
}
```

Di template, ganti sumber daftar aktif dari `filtered` menjadi `aktif`, dan tambahkan dua tombol tab di atas daftar. Tab Mantan menampilkan tabel: nama, HP, KTP, kamar terakhir, masuk, keluar, total dibayar, dan tombol Pulihkan. Sertakan kotak pencarian yang terikat ke `cariMantan`.

- [ ] **Step 3: Verifikasi**

Run: `npm run typecheck && npm run test:run && npm run build`
Expected: semuanya PASS.

Lalu `npm run dev` dan cek manual: keluarkan seorang penghuni bertanggal tengah bulan → ia pindah ke tab Mantan, kamarnya kosong di KamarView, dan tagihan bulan itu yang belum lunas nominalnya turun.

- [ ] **Step 4: Commit**

```bash
git add src/views/PenghuniView.vue
git commit -m "feat(penghuni): keluarkan penghuni dan arsip mantan penghuni"
```

---

### Task 6: Pembagian diskon dan deret bulan

**Files:**
- Create: `src/utils/bayarDiMuka.ts`
- Test: `src/tests/utils/bayarDiMuka.test.ts`

**Interfaces:**
- Consumes: `MONTHS_FULL` dari `src/utils/format.ts`.
- Produces: `bulanBerurutan(mulai, n)`, `bagiDiskon(jumlah[], diskon)`.

- [ ] **Step 1: Tulis tes yang gagal**

Buat `src/tests/utils/bayarDiMuka.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { bulanBerurutan, bagiDiskon } from '../../utils/bayarDiMuka'

describe('bulanBerurutan', () => {
  it('membuat deret bulan dan menyeberang tahun', () => {
    expect(bulanBerurutan('Agustus 2026', 6)).toEqual([
      'Agustus 2026', 'September 2026', 'Oktober 2026',
      'November 2026', 'Desember 2026', 'Januari 2027',
    ])
  })

  it('mengembalikan array kosong untuk label yang tidak dikenal', () => {
    expect(bulanBerurutan('bukan bulan', 3)).toEqual([])
  })
})

describe('bagiDiskon', () => {
  it('membagi diskon rata dan membuang sisa pembulatan ke bulan terakhir', () => {
    const hasil = bagiDiskon(Array(6).fill(2_000_000), 1_000_000)
    expect(hasil).toEqual([1_833_333, 1_833_333, 1_833_333, 1_833_333, 1_833_333, 1_833_335])
    expect(hasil.reduce((s, x) => s + x, 0)).toBe(11_000_000)
  })

  it('menjaga total persis sama dengan uang yang diterima untuk pembagian apa pun', () => {
    for (const diskon of [0, 1, 333_333, 750_000, 1_000_000]) {
      const total = 6 * 2_000_000 - diskon
      expect(bagiDiskon(Array(6).fill(2_000_000), diskon).reduce((s, x) => s + x, 0)).toBe(total)
    }
  })

  it('tetap benar saat nominal bulanan tidak sama (bulan pertama prorata)', () => {
    const hasil = bagiDiskon([822_581, 1_500_000, 1_500_000], 300_000)
    expect(hasil.reduce((s, x) => s + x, 0)).toBe(822_581 + 3_000_000 - 300_000)
  })

  it('mengembalikan nominal apa adanya tanpa diskon', () => {
    expect(bagiDiskon([1_000_000, 2_000_000], 0)).toEqual([1_000_000, 2_000_000])
  })
})
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npm run test:run -- src/tests/utils/bayarDiMuka.test.ts`
Expected: FAIL — modul `../../utils/bayarDiMuka` tidak ditemukan.

- [ ] **Step 3: Implementasi**

Buat `src/utils/bayarDiMuka.ts`:

```ts
import { MONTHS_FULL } from './format'

/** Deret label bulan berturut-turut mulai dari `mulai`, sebanyak `n`. */
export function bulanBerurutan(mulai: string, n: number): string[] {
  const [nama, tahun] = (mulai ?? '').split(' ')
  const idx = MONTHS_FULL.indexOf(nama)
  if (idx === -1 || !/^\d{4}$/.test(tahun ?? '')) return []
  const th = parseInt(tahun, 10)
  return Array.from({ length: Math.max(0, n) }, (_, i) => {
    const m = idx + i
    return `${MONTHS_FULL[m % 12]} ${th + Math.floor(m / 12)}`
  })
}

/**
 * Membagi diskon bayar di muka rata ke seluruh bulan dalam batch.
 *
 * Sisa pembulatan dibebankan ke bulan terakhir supaya jumlah seluruh tagihan
 * **persis** sama dengan uang yang diterima — kalau meleset satu rupiah pun,
 * salah satu bulan akan terlihat kurang bayar selamanya.
 */
export function bagiDiskon(jumlah: number[], diskon: number): number[] {
  const n = jumlah.length
  const d = Number(diskon) || 0
  if (n === 0 || d === 0) return [...jumlah]
  const per = Math.round(d / n)
  const hasil = jumlah.map(j => j - per)
  hasil[n - 1] += per * n - d
  return hasil
}
```

- [ ] **Step 4: Jalankan tes, pastikan lulus**

Run: `npm run test:run -- src/tests/utils/bayarDiMuka.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/bayarDiMuka.ts src/tests/utils/bayarDiMuka.test.ts
git commit -m "feat(bayar): deret bulan dan pembagian diskon bayar di muka"
```

---

### Task 7: Dialog Bayar Beberapa Bulan

**Files:**
- Create: `src/components/shared/BayarDiMukaDialog.vue`
- Modify: `src/views/TagihanView.vue`

**Interfaces:**
- Consumes: `bulanBerurutan()`, `bagiDiskon()` (Task 6); `tagihanUntukKamar()` (Task 3); store `tagihan`, `penghuni`, `log`.
- Produces: komponen dengan props `{ open: boolean }` dan emit `{ close: [], saved: [ref: string] }`.

- [ ] **Step 1: Buat komponennya**

`src/components/shared/BayarDiMukaDialog.vue`, `<script setup lang="ts">`:

```ts
import { ref, computed, watch } from 'vue'
import { useTagihanStore } from '../../stores/tagihan'
import { usePenghuniStore } from '../../stores/penghuni'
import { useLogStore } from '../../stores/log'
import { useTagihanCalc } from '../../composables/useTagihanCalc'
import { useProperty } from '../../composables/useProperty'
import { useToast } from '../../composables/useToast'
import { bulanBerurutan, bagiDiskon } from '../../utils/bayarDiMuka'
import { bulanIni, today, bulanKey } from '../../utils/date'
import { fmt } from '../../utils/format'
import { sudahKeluar } from '../../composables/useOccupancy'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [ref: string] }>()

const tagihan = useTagihanStore()
const penghuni = usePenghuniStore()
const log = useLogStore()
const { tagihanUntukKamar } = useTagihanCalc()
const { filterByProperty } = useProperty()
const { toast } = useToast()

const penghuniId = ref('')
const bulanMulai = ref(bulanIni())
const jumlahBulan = ref(6)
const diskon = ref(0)
const tglBayar = ref(today())
const menyimpan = ref(false)

const kandidat = computed(() => filterByProperty(penghuni.items).filter(p => !sudahKeluar(p)))
const terpilih = computed(() => penghuni.items.find(p => p.id === penghuniId.value) ?? null)

/** Bulan yang sudah punya tagihan lunas tidak boleh ikut — nanti dobel bayar. */
const bentrok = computed(() => {
  const p = terpilih.value
  if (!p) return [] as string[]
  const bulan = bulanBerurutan(bulanMulai.value, jumlahBulan.value)
  return bulan.filter(b => tagihan.items.some(t =>
    t.bulan === b && t.property_id === p.property_id && t.status === 'lunas'
    && (t.penghuni_id === p.id || t.penghuni === p.nama)))
})

const baris = computed(() => {
  const p = terpilih.value
  if (!p) return [] as { bulan: string; jumlah: number; id?: string }[]
  const bulan = bulanBerurutan(bulanMulai.value, jumlahBulan.value)
  const dasar = bulan.map(b => {
    const lama = tagihan.items.find(t => t.bulan === b && t.property_id === p.property_id
      && (t.penghuni_id === p.id || t.penghuni === p.nama))
    if (lama) return { bulan: b, jumlah: Number(lama.jumlah) || 0, id: lama.id }
    const draft = tagihanUntukKamar(p.kamar, p.property_id, b)
    const milikDia = draft.find(d => d.penghuni_id === p.id) ?? draft[0]
    return { bulan: b, jumlah: milikDia?.jumlah ?? 0, draft: milikDia }
  })
  const setelahDiskon = bagiDiskon(dasar.map(x => x.jumlah), diskon.value)
  return dasar.map((x, i) => ({ ...x, jumlah: setelahDiskon[i] }))
})

const subtotal = computed(() => baris.value.reduce((s, x) => s + x.jumlah, 0) + (Number(diskon.value) || 0))
const total = computed(() => baris.value.reduce((s, x) => s + x.jumlah, 0))

watch(() => props.open, (v) => {
  if (!v) return
  penghuniId.value = ''; bulanMulai.value = bulanIni(); jumlahBulan.value = 6
  diskon.value = 0; tglBayar.value = today()
})

async function simpan() {
  const p = terpilih.value
  if (!p) { toast('Pilih penghuni dulu', 'error'); return }
  if (bentrok.value.length) { toast(`Sudah lunas: ${bentrok.value.join(', ')}`, 'error'); return }
  if (total.value <= 0) { toast('Total tidak boleh nol', 'error'); return }
  menyimpan.value = true
  const bayar_ref = `BDM-${Date.now()}`
  try {
    for (const b of baris.value) {
      const isi = {
        status: 'lunas' as const, jumlah: b.jumlah, jumlah_bayar: b.jumlah,
        tgl: tglBayar.value, bayar_ref, diskon_batch: Number(diskon.value) || 0,
      }
      if (b.id) await tagihan.update(b.id, isi)
      else if (b.draft) await tagihan.add({
        ...b.draft, ...isi, property_id: p.property_id, createdAt: new Date().toISOString(),
      })
    }
    await log.add(
      `${p.nama} bayar ${baris.value.length} bulan di muka ${fmt(total.value)}`
        + (diskon.value ? ` (diskon ${fmt(diskon.value)})` : ''),
      'green', p.property_id,
    )
    toast(`${baris.value.length} bulan ditandai lunas`, 'success')
    emit('saved', bayar_ref)
    emit('close')
  } catch { toast('Gagal menyimpan pembayaran', 'error') }
  finally { menyimpan.value = false }
}
```

Templatenya memakai pola `.overlay` > `.modal` seperti modal lain di `TagihanView.vue`, berisi: `select` penghuni (`kandidat`), `select` bulan mulai (pakai daftar bulan yang sudah ada di TagihanView atau `bulanBerurutan(bulanIni(), 12)`), input angka jumlah bulan, tabel `baris` (`bulan` dan `fmt(jumlah)`), input `Diskon (Rp)`, input tanggal bayar, lalu ringkasan `Subtotal` / `Diskon` / `Total`. Tampilkan peringatan merah bila `bentrok.length > 0`, dan nonaktifkan tombol simpan saat `menyimpan`.

Catat di komentar komponen: bulan-bulan ke depan memakai komposisi penghuni saat ini — asumsi yang wajar saat menerima bayaran di muka, dan tidak dihitung ulang kalau kemudian kamarnya jadi berdua.

- [ ] **Step 2: Pasang di TagihanView**

Impor komponennya, tambahkan `const showBayarDiMuka = ref(false)`, tombol **Bayar Beberapa Bulan** di baris aksi header (di sebelah tombol Generate), dan render `<BayarDiMukaDialog :open="showBayarDiMuka" @close="showBayarDiMuka = false" @saved="onBatchSaved" />`. `onBatchSaved(ref)` untuk sekarang cukup menyimpan `ref` terakhir ke sebuah `ref<string|null>` yang dipakai Task 9 untuk membuka invoice.

- [ ] **Step 3: Sembunyikan tagihan hangus dari tunggakan dan reminder**

Di `TagihanView.vue`, daftar tunggakan dan `reminderList` menyaring `t.hangus !== true`. Cari computed yang menyusun `ReminderItem` (baris ±225) dan tambahkan syarat itu pada filternya.

- [ ] **Step 4: Verifikasi**

Run: `npm run typecheck && npm run test:run && npm run build`
Expected: PASS.

Manual di `npm run dev`: pilih penghuni, 6 bulan, diskon 1.000.000 pada kamar 2 juta → total tampil 11.000.000, dan setelah simpan keenam bulannya berstatus lunas.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/BayarDiMukaDialog.vue src/views/TagihanView.vue
git commit -m "feat(bayar): catat pembayaran beberapa bulan di muka berdiskon"
```

---

### Task 8: Perakitan data invoice

**Files:**
- Create: `src/utils/invoice.ts`
- Test: `src/tests/utils/invoice.test.ts`

**Interfaces:**
- Consumes: `MONTHS_SHORT` (`src/utils/format.ts`), tipe `Tagihan`, `Penghuni`, `Property`.
- Produces: `nomorInvoiceBerikutnya(nomorTerpakai, tgl)`, `rakitInvoice({ tagihan, penghuni, properti, no, tgl })`, tipe `DataInvoice`, `BarisInvoice`.

- [ ] **Step 1: Tulis tes yang gagal**

Buat `src/tests/utils/invoice.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { nomorInvoiceBerikutnya, rakitInvoice } from '../../utils/invoice'
import type { Tagihan, Penghuni, Property } from '../../types'

const properti = {
  id: 'p1', nama: 'Raffles Kos Waru 23', alamat: 'Jl. Waru 23', no_hp: '08123456789',
  bank_nama: 'BCA', bank_rekening: '1234567890', bank_an: 'Jonathan', created_at: '',
} as Property

const penghuni = {
  id: 'a', nama: 'Budi', kamar: '101', hp: '08987654321', masuk: '2026-01-01', property_id: 'p1',
} as Penghuni

function tag(over: Partial<Tagihan>): Tagihan {
  return {
    id: 't1', penghuni: 'Budi', kamar: '101', bulan: 'Maret 2026', jumlah: 1_500_000,
    status: 'lunas', property_id: 'p1', createdAt: '2026-03-01T00:00:00.000Z', ...over,
  }
}

describe('nomorInvoiceBerikutnya', () => {
  it('memulai dari 0001 bila belum ada nomor tahun ini', () => {
    expect(nomorInvoiceBerikutnya([], '2026-08-22')).toBe('INV/RK/2026/08/0001')
  })

  it('melanjutkan dari nomor tertinggi tahun berjalan', () => {
    const dipakai = ['INV/RK/2026/01/0001', 'INV/RK/2026/07/0009', 'INV/RK/2025/12/0042']
    expect(nomorInvoiceBerikutnya(dipakai, '2026-08-22')).toBe('INV/RK/2026/08/0010')
  })

  it('mengabaikan nilai yang bukan nomor invoice', () => {
    expect(nomorInvoiceBerikutnya(['', 'entah apa'], '2026-08-22')).toBe('INV/RK/2026/08/0001')
  })
})

describe('rakitInvoice', () => {
  it('merakit satu tagihan penuh', () => {
    const d = rakitInvoice({
      tagihan: [tag({})], penghuni, properti, no: 'INV/RK/2026/03/0001', tgl: '2026-03-02',
    })
    expect(d.baris).toHaveLength(1)
    expect(d.baris[0].periode).toBe('Maret 2026')
    expect(d.subtotal).toBe(1_500_000)
    expect(d.diskon).toBe(0)
    expect(d.total).toBe(1_500_000)
    expect(d.lunas).toBe(true)
    expect(d.nama).toBe('Budi')
    expect(d.bank).toBe('BCA')
  })

  it('menuliskan rentang hari pada baris prorata', () => {
    const d = rakitInvoice({
      tagihan: [tag({ jumlah: 483_871, is_prorated: true, dari: '2026-03-01', sampai: '2026-03-10', hari: 10 })],
      penghuni, properti, no: 'INV/RK/2026/03/0002', tgl: '2026-03-11',
    })
    expect(d.baris[0].periode).toBe('1–10 Mar 2026 (10 hari)')
  })

  it('menampilkan subtotal sebelum diskon untuk invoice batch', () => {
    const batch = [
      tag({ id: 't1', bulan: 'Agustus 2026', jumlah: 1_833_333, diskon_batch: 1_000_000 }),
      tag({ id: 't2', bulan: 'September 2026', jumlah: 1_833_333, diskon_batch: 1_000_000 }),
    ]
    const d = rakitInvoice({ tagihan: batch, penghuni, properti, no: 'INV/RK/2026/08/0003', tgl: '2026-08-01' })
    expect(d.total).toBe(3_666_666)
    expect(d.diskon).toBe(1_000_000)
    expect(d.subtotal).toBe(4_666_666)
    expect(d.baris).toHaveLength(2)
  })

  it('menandai invoice yang belum dibayar', () => {
    const d = rakitInvoice({
      tagihan: [tag({ status: 'belum' })], penghuni, properti, no: 'INV/RK/2026/03/0004', tgl: '2026-03-01',
    })
    expect(d.lunas).toBe(false)
  })
})
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npm run test:run -- src/tests/utils/invoice.test.ts`
Expected: FAIL — modul `../../utils/invoice` tidak ditemukan.

- [ ] **Step 3: Implementasi**

Buat `src/utils/invoice.ts`:

```ts
import { MONTHS_SHORT } from './format'
import type { Tagihan, Penghuni, Property } from '../types'

export interface BarisInvoice {
  keterangan: string
  periode: string
  jumlah: number
}

export interface DataInvoice {
  no: string
  tgl: string
  namaKos: string
  alamat: string
  hp: string
  bank: string
  rekening: string
  an: string
  nama: string
  kamar: string
  hpPenghuni: string
  baris: BarisInvoice[]
  subtotal: number
  diskon: number
  total: number
  lunas: boolean
  tglBayar?: string
}

/**
 * Nomor invoice berikutnya, urut per tahun: INV/RK/2026/08/0001.
 *
 * Urutan diambil dari nomor tertinggi yang sudah tersimpan, bukan dari
 * penghitung terpisah — tidak ada tempat untuk menyimpan penghitung yang aman
 * dari dua perangkat, dan aplikasi ini dipakai satu orang.
 */
export function nomorInvoiceBerikutnya(nomorTerpakai: (string | undefined)[], tgl: string): string {
  const [tahun, bulan] = tgl.split('-')
  const tertinggi = nomorTerpakai.reduce((maks, s) => {
    const m = /^INV\/RK\/(\d{4})\/\d{2}\/(\d{4})$/.exec(s ?? '')
    return m && m[1] === tahun ? Math.max(maks, parseInt(m[2], 10)) : maks
  }, 0)
  return `INV/RK/${tahun}/${bulan}/${String(tertinggi + 1).padStart(4, '0')}`
}

/** "2026-03-01" + "2026-03-10" -> "1–10 Mar 2026". */
function rentangTeks(dari: string, sampai: string): string {
  const d1 = parseInt(dari.slice(8, 10), 10)
  const d2 = parseInt(sampai.slice(8, 10), 10)
  const bln = MONTHS_SHORT[parseInt(sampai.slice(5, 7), 10) - 1]
  return `${d1}–${d2} ${bln} ${sampai.slice(0, 4)}`
}

export function rakitInvoice(input: {
  tagihan: Tagihan[]
  penghuni: Penghuni | null
  properti: Property | null
  no: string
  tgl: string
}): DataInvoice {
  const { tagihan, penghuni, properti, no, tgl } = input
  const baris: BarisInvoice[] = tagihan.map(t => ({
    keterangan: `Sewa kamar ${t.kamar}`,
    periode: t.is_prorated && t.dari && t.sampai
      ? `${rentangTeks(t.dari, t.sampai)} (${t.hari ?? 0} hari)`
      : t.bulan,
    jumlah: Number(t.jumlah) || 0,
  }))
  const total = baris.reduce((s, b) => s + b.jumlah, 0)
  // diskon_batch disalin ke tiap tagihan dalam satu batch, jadi ambil satu saja.
  const diskon = Number(tagihan.find(t => t.diskon_batch)?.diskon_batch) || 0
  const dibayar = tagihan.filter(t => t.status === 'lunas')

  return {
    no, tgl,
    namaKos: properti?.nama ?? '',
    alamat: properti?.alamat ?? '',
    hp: properti?.no_hp ?? '',
    bank: properti?.bank_nama ?? '',
    rekening: properti?.bank_rekening ?? '',
    an: properti?.bank_an ?? '',
    nama: penghuni?.nama ?? tagihan[0]?.penghuni ?? '',
    kamar: penghuni?.kamar ?? tagihan[0]?.kamar ?? '',
    hpPenghuni: penghuni?.hp ?? '',
    baris,
    subtotal: total + diskon,
    diskon,
    total,
    lunas: tagihan.length > 0 && dibayar.length === tagihan.length,
    tglBayar: dibayar[0]?.tgl,
  }
}
```

- [ ] **Step 4: Jalankan tes, pastikan lulus**

Run: `npm run test:run -- src/tests/utils/invoice.test.ts` lalu `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/invoice.ts src/tests/utils/invoice.test.ts
git commit -m "feat(invoice): penomoran dan perakitan data invoice"
```

---

### Task 9: Halaman invoice siap cetak

**Files:**
- Create: `src/components/shared/InvoiceDoc.vue`
- Modify: `src/views/TagihanView.vue`

**Interfaces:**
- Consumes: `rakitInvoice()`, `nomorInvoiceBerikutnya()` (Task 8); store `tagihan`, `penghuni`, `properties`.
- Produces: komponen dengan props `{ open: boolean; tagihanIds: string[] }` dan emit `{ close: [] }`.

- [ ] **Step 1: Buat komponennya**

`src/components/shared/InvoiceDoc.vue`, `<script setup lang="ts">`:

```ts
import { computed, watch, ref } from 'vue'
import { useTagihanStore } from '../../stores/tagihan'
import { usePenghuniStore } from '../../stores/penghuni'
import { usePropertiesStore } from '../../stores/properties'
import { rakitInvoice, nomorInvoiceBerikutnya } from '../../utils/invoice'
import { fmt, fmtTgl } from '../../utils/format'
import { today } from '../../utils/date'

const props = defineProps<{ open: boolean; tagihanIds: string[] }>()
const emit = defineEmits<{ close: [] }>()

const tagihan = useTagihanStore()
const penghuni = usePenghuniStore()
const properties = usePropertiesStore()
const nomor = ref('')

const daftar = computed(() => props.tagihanIds
  .map(id => tagihan.items.find(t => t.id === id))
  .filter((t): t is NonNullable<typeof t> => !!t))

const data = computed(() => {
  const list = daftar.value
  const p = penghuni.items.find(x =>
    x.id === list[0]?.penghuni_id || (x.nama === list[0]?.penghuni && x.property_id === list[0]?.property_id)) ?? null
  const properti = properties.items.find(x => x.id === list[0]?.property_id) ?? null
  return rakitInvoice({
    tagihan: list, penghuni: p, properti,
    no: nomor.value, tgl: list[0]?.invoice_tgl ?? today(),
  })
})

// Nomor invoice disimpan permanen saat pertama kali dibuka, supaya cetak ulang
// menghasilkan nomor yang sama — invoice bernomor ganda bukan invoice.
watch(() => props.open, async (v) => {
  if (!v || daftar.value.length === 0) return
  const sudah = daftar.value.find(t => t.invoice_no)?.invoice_no
  if (sudah) { nomor.value = sudah; return }
  const tgl = today()
  const baru = nomorInvoiceBerikutnya(tagihan.items.map(t => t.invoice_no), tgl)
  nomor.value = baru
  for (const t of daftar.value) await tagihan.update(t.id, { invoice_no: baru, invoice_tgl: tgl })
})

function cetak() {
  document.body.classList.add('printing-invoice')
  window.print()
  setTimeout(() => document.body.classList.remove('printing-invoice'), 500)
}
```

Template: `.overlay` > `.modal` berisi `<div class="invoice-page">` dengan kop (`data.namaKos`, `data.alamat`, `data.hp`), blok nomor dan tanggal, blok "Kepada" (`data.nama`, kamar, `data.hpPenghuni`), tabel baris (`keterangan`, `periode`, `fmt(jumlah)`), lalu ringkasan. Baris Subtotal dan Diskon hanya ditampilkan bila `data.diskon > 0`. Cap status memakai kelas `.cap-lunas` / `.cap-belum` dengan teks `LUNAS` (plus `fmtTgl(data.tglBayar)`) atau `BELUM BAYAR`. Di bawahnya informasi rekening `data.bank`, `data.rekening`, a.n. `data.an`. Tombol Cetak memanggil `cetak()`.

`<style scoped>` menyertakan aturan cetak yang bercakupan sendiri:

```css
@media print {
  /* Cakupan sendiri supaya tidak bentrok dengan exportPDF() di LaporanView,
     yang juga memanggil window.print(). */
  :global(body.printing-invoice) :global(#app > *:not(.overlay)) { display: none !important; }
  :global(body.printing-invoice) .overlay { position: static; background: none; }
  :global(body.printing-invoice) .modal { box-shadow: none; max-height: none; width: 100%; }
  :global(body.printing-invoice) .modal-head,
  :global(body.printing-invoice) .modal-foot { display: none !important; }
  .invoice-page { width: 100%; padding: 0; color: #000; background: #fff; }
}
```

Ukuran halaman diberi `@page { size: A4; margin: 15mm }` di blok `<style>` non-scoped pada komponen ini.

- [ ] **Step 2: Pasang tombol di TagihanView**

Tambahkan `const showInvoice = ref(false)` dan `const invoiceIds = ref<string[]>([])`. Tombol **Invoice** pada setiap baris tagihan mengisi `invoiceIds` dengan `[t.id]` bila `t.bayar_ref` kosong, atau dengan seluruh id yang `bayar_ref`-nya sama bila ada:

```ts
function bukaInvoice(t: Tagihan) {
  invoiceIds.value = t.bayar_ref
    ? tagihan.items.filter(x => x.bayar_ref === t.bayar_ref).sort((a, b) => bulanKey(a.bulan).localeCompare(bulanKey(b.bulan))).map(x => x.id)
    : [t.id]
  showInvoice.value = true
}
```

Sambungkan juga `onBatchSaved(ref)` dari Task 7 supaya langsung membuka invoice batch yang baru dibuat.

- [ ] **Step 3: Verifikasi**

Run: `npm run typecheck && npm run test:run && npm run build`
Expected: PASS.

Manual di `npm run dev`: buka invoice satu tagihan prorata → periodenya terbaca `"1–10 Mar 2026 (10 hari)"`; tekan Cetak → pratinjau cetak hanya berisi halaman invoice, tanpa navigasi. Buka invoice batch 6 bulan → enam baris, ada Subtotal dan Diskon. Tutup lalu buka lagi → nomornya tidak berubah. Terakhir, buka Laporan dan tekan Export PDF untuk memastikan cetak laporan masih normal.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/InvoiceDoc.vue src/views/TagihanView.vue
git commit -m "feat(invoice): halaman invoice siap cetak"
```

---

### Task 10: Sesuaikan saldo dari Dashboard

**Files:**
- Create: `src/components/shared/SesuaikanSaldoDialog.vue`
- Modify: `src/views/DashboardView.vue`

**Interfaces:**
- Consumes: store `properties`, `log`, `app`; `useSaldo()`; `fmt()`, `today()`.
- Produces: komponen dengan props `{ open: boolean }` dan emit `{ close: [] }`.

- [ ] **Step 1: Buat komponennya**

`src/components/shared/SesuaikanSaldoDialog.vue`, `<script setup lang="ts">`:

```ts
import { ref, computed, watch } from 'vue'
import { usePropertiesStore } from '../../stores/properties'
import { useLogStore } from '../../stores/log'
import { useAppStore } from '../../stores/app'
import { useSaldo } from '../../composables/useSaldo'
import { useToast } from '../../composables/useToast'
import { fmt } from '../../utils/format'
import { today } from '../../utils/date'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const properties = usePropertiesStore()
const log = useLogStore()
const app = useAppStore()
const { saldo } = useSaldo()
const { toast } = useToast()

const propId = ref('')
const nominal = ref(0)
const tgl = ref(today())

const properti = computed(() => properties.items.find(p => p.id === propId.value) ?? null)

watch(() => props.open, (v) => {
  if (!v) return
  // Mode "Semua Properti" tidak punya satu rekening — Waru 23 dan Citra 1
  // memakai rekening BCA yang berbeda, jadi pilih dulu propertinya.
  propId.value = app.currentPropertyId === 'all' ? (properties.items[0]?.id ?? '') : app.currentPropertyId
  nominal.value = Math.round(saldo.value.saldo)
  tgl.value = today()
})

async function simpan() {
  const p = properti.value
  if (!p) { toast('Pilih properti dulu', 'error'); return }
  const lama = Number(p.saldo_awal) || 0
  try {
    await properties.update(p.id, { saldo_awal: Number(nominal.value) || 0, saldo_awal_tgl: tgl.value })
    const selisih = (Number(nominal.value) || 0) - lama
    await log.add(
      `Saldo ${p.nama} disesuaikan ke ${fmt(nominal.value)} per ${tgl.value} (selisih ${fmt(selisih)})`,
      'blue', p.id,
    )
    toast('Saldo disesuaikan', 'success')
    emit('close')
  } catch { toast('Gagal menyimpan saldo', 'error') }
}
```

Template: modal berisi `select` properti (hanya ditampilkan bila `app.currentPropertyId === 'all'`), input angka **Saldo bank sebenarnya**, input tanggal, dan keterangan bahwa transaksi sebelum tanggal itu tidak lagi dihitung. Periksa nama method store properti — bila bukan `update`, pakai nama yang ada di `src/stores/properties.ts`.

- [ ] **Step 2: Pasang di DashboardView**

Impor komponennya, tambahkan `const showSesuaikan = ref(false)`, dan pada kartu saldo tambahkan tombol kecil **Sesuaikan** yang membuka dialog. Di bawah angka saldo tampilkan `"terakhir disesuaikan {{ fmtTgl(propertiAktif?.saldo_awal_tgl ?? '') }}"` bila tanggalnya ada.

- [ ] **Step 3: Verifikasi**

Run: `npm run typecheck && npm run test:run && npm run build`
Expected: PASS.

Manual di `npm run dev`: sesuaikan saldo ke sebuah angka bertanggal hari ini → kartu saldo menampilkan angka itu (belum ada transaksi setelahnya), dan entri baru muncul di Log.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/SesuaikanSaldoDialog.vue src/views/DashboardView.vue
git commit -m "feat(saldo): sesuaikan saldo berjalan dari Dashboard"
```

---

## Verifikasi akhir

- [ ] `npm run test:run` — seluruh berkas tes hijau
- [ ] `npm run typecheck` — bersih
- [ ] `npm run build` — sukses
- [ ] Uji manual yang tidak tercakup tes otomatis:
  - Cetak invoice dari iPhone (Share → Save to Files), lalu kirim lewat WhatsApp
  - Keluarkan penghuni tengah bulan, lalu masukkan penghuni baru di kamar yang sama bulan itu juga — pastikan muncul dua tagihan dengan nominal sesuai hari
  - Bayar 6 bulan berdiskon, lalu keluarkan penghuninya di bulan ke-3 — pastikan bulan sisanya bertanda hangus dan saldo tidak turun
