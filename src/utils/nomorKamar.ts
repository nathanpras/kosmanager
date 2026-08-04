/**
 * Penomoran kamar lama (blok + urutan) ke penomoran bergaya lantai.
 *
 *   B1–B7 → 101–107      A1–A9 → 201–209
 *   C1–C5 → 301–305      D1    → 401
 *
 * Nomor kamar disimpan sebagai **string** di `kamar.nomor`, `penghuni.kamar`,
 * `tagihan.kamar`, dan `maintenance.kamar` — bukan sebagai id. Mengganti nomor
 * karena itu harus menyentuh keempat koleksi serentak, kalau tidak riwayat
 * tagihan akan menunjuk kamar yang sudah tidak ada.
 */
export const PETA_LANTAI: Record<string, number> = { B: 1, A: 2, C: 3, D: 4 }

/** "B1" → "101". `null` bila polanya tidak dikenal. */
export function nomorBaru(lama: string): string | null {
  const m = /^\s*([A-Za-z])\s*(\d{1,2})\s*$/.exec(lama ?? '')
  if (!m) return null
  const lantai = PETA_LANTAI[m[1].toUpperCase()]
  const urut = parseInt(m[2], 10)
  if (lantai === undefined || urut < 1 || urut > 99) return null
  return String(lantai * 100 + urut)
}

/** Apakah nomor ini sudah bergaya baru (murni angka)? */
export function sudahBergayaBaru(nomor: string): boolean {
  return /^\d{3}$/.test((nomor ?? '').trim())
}

/**
 * Lantai sebuah kamar, untuk tampilan denah.
 *
 * Bekerja pada dua gaya penomoran sekaligus: nomor baru mengambil digit ratusan
 * (`101` → 1), nomor lama memakai huruf bloknya (`B1` → 1). Jadi denah tetap
 * benar sebelum maupun sesudah migrasi dijalankan.
 *
 * `null` bila nomornya tidak mengikuti pola apa pun — dikelompokkan terpisah,
 * bukan dipaksa masuk lantai tertentu.
 */
export function lantaiDari(nomor: string): number | null {
  const bersih = (nomor ?? '').trim()
  const angka = /^(\d)(\d{2})$/.exec(bersih)
  if (angka) return parseInt(angka[1], 10)
  const huruf = /^([A-Za-z])\s*\d{1,2}$/.exec(bersih)
  if (huruf) return PETA_LANTAI[huruf[1].toUpperCase()] ?? null
  return null
}

export interface BarisRencana {
  koleksi: 'kamar' | 'penghuni' | 'tagihan' | 'maintenance'
  id: string
  dari: string
  ke: string
  keterangan?: string
}

export interface RencanaMigrasi {
  ubah: BarisRencana[]
  /** Nomor yang tidak cocok pola dan tidak juga bergaya baru — perlu diputuskan manual. */
  takDikenal: { koleksi: string; id: string; nomor: string }[]
  /** Nomor tujuan yang sudah dipakai kamar lain di properti yang sama. */
  bentrok: { dari: string; ke: string }[]
  /** Nomor kamar yang sudah bergaya baru, dilewati. */
  dilewati: string[]
}

interface PunyaKamar { id: string; kamar?: string; property_id: string }
interface PunyaNomor { id: string; nomor: string; property_id: string }

/**
 * Menyusun rencana perubahan tanpa menyentuh apa pun.
 *
 * Dipisahkan dari eksekusi supaya bisa ditampilkan lebih dulu sebagai pratinjau
 * dan diuji tanpa Firestore.
 */
export function susunRencana(
  property_id: string,
  data: {
    kamar: PunyaNomor[]
    penghuni: PunyaKamar[]
    tagihan: PunyaKamar[]
    maintenance: PunyaKamar[]
  },
): RencanaMigrasi {
  const kamarProp = data.kamar.filter(k => k.property_id === property_id)

  const ubah: BarisRencana[] = []
  const takDikenal: RencanaMigrasi['takDikenal'] = []
  const bentrok: RencanaMigrasi['bentrok'] = []
  const dilewati: string[] = []

  // Peta nomor lama → baru, hanya untuk kamar yang memang perlu diganti.
  const peta = new Map<string, string>()
  const nomorTerpakai = new Set(kamarProp.map(k => (k.nomor ?? '').trim()))

  for (const k of kamarProp) {
    const lama = (k.nomor ?? '').trim()
    if (sudahBergayaBaru(lama)) { dilewati.push(lama); continue }

    const baru = nomorBaru(lama)
    if (!baru) { takDikenal.push({ koleksi: 'kamar', id: k.id, nomor: lama }); continue }

    // Nomor tujuan sudah dipakai kamar lain — jangan timpa, laporkan.
    if (nomorTerpakai.has(baru)) { bentrok.push({ dari: lama, ke: baru }); continue }

    peta.set(lama, baru)
    ubah.push({ koleksi: 'kamar', id: k.id, dari: lama, ke: baru })
  }

  // Nomor kamar yang akan ada setelah migrasi selesai: hasil penggantian,
  // ditambah yang memang sudah bergaya baru.
  const nomorTujuan = new Set<string>([...peta.values(), ...dilewati])

  // Referensi di tiga koleksi lain harus ikut, kalau tidak jadi yatim.
  const rujukan = [
    ['penghuni', data.penghuni],
    ['tagihan', data.tagihan],
    ['maintenance', data.maintenance],
  ] as const

  for (const [koleksi, rows] of rujukan) {
    for (const r of rows) {
      if (r.property_id !== property_id) continue
      const lama = (r.kamar ?? '').trim()
      if (!lama || sudahBergayaBaru(lama)) continue

      // Tidak cukup mengandalkan `peta`: bila migrasi pernah terhenti setelah
      // koleksi kamar tersimpan, kamarnya sudah bergaya baru sehingga tidak
      // masuk peta, sedangkan referensinya masih tertinggal. Nomor tujuan
      // dihitung ulang dari nomor lama, lalu divalidasi ke daftar kamar akhir.
      const baru = peta.get(lama) ?? nomorBaru(lama)
      if (baru && nomorTujuan.has(baru)) ubah.push({ koleksi, id: r.id, dari: lama, ke: baru })
      else takDikenal.push({ koleksi, id: r.id, nomor: lama })
    }
  }

  return { ubah, takDikenal, bentrok, dilewati }
}
