import { usePenghuniStore } from '../stores/penghuni'
import { useKamarStore } from '../stores/kamar'
import { useTagihanStore } from '../stores/tagihan'
import { useLogStore } from '../stores/log'
import { useOccupancy } from './useOccupancy'
import { useTagihanCalc, kunciTagihan } from './useTagihanCalc'
import type { DraftTagihan } from './useTagihanCalc'
import { nilaiDibayar } from '../utils/saldo'
import { bulanFromTgl, bulanKey } from '../utils/date'
import { fmt, fmtTgl } from '../utils/format'
import type { Penghuni, Tagihan } from '../types'

export interface RencanaTagihan {
  perbarui: { id: string; data: Partial<Tagihan> }[]
  hapus: string[]
  buat: DraftTagihan[]
}

/** Apakah tagihan `t` dan draft `d` menunjuk orang yang sama di kamar yang sama? */
function cocok(t: Tagihan, d: DraftTagihan): boolean {
  const kunciT = kunciTagihan(t)
  // property_id diambil dari tagihannya: `existing` sudah disaring per properti,
  // dan draft memang tidak membawa property_id.
  return kunciTagihan({ ...d, property_id: t.property_id }).some(k => kunciT.includes(k))
}

/**
 * Mencocokkan seluruh tagihan sebuah kamar di satu bulan dengan hasil hitung
 * ulangnya, lalu memutuskan apa yang harus terjadi pada tiap tagihan.
 *
 * Dikerjakan per **kamar**, bukan per orang: `tagihanUntukKamar()` mengembalikan
 * satu tagihan gabungan atas nama penanggung selama tidak ada yang keluar di
 * tengah bulan, sehingga roommate yang pamit sama sekali tidak punya tagihan
 * atas namanya sendiri. Mencari tagihan "milik dia" hanya menemukan nihil, dan
 * tagihan kamar yang nominalnya sudah salah dibiarkan apa adanya.
 *
 * Aturannya:
 * - tagihan tanpa uang di dalamnya ditulis ulang ke draft pasangannya, atau
 *   dihapus bila tidak ada draft yang cocok lagi;
 * - tagihan yang sudah kemasukan uang (lunas maupun baru dicicil) tidak pernah
 *   diturunkan nominalnya — selisihnya dicatat sebagai `kelebihan`, dan bila
 *   orangnya memang sudah tidak ada di bulan itu ditandai `hangus`;
 * - draft yang belum punya tagihan dibuatkan tagihan baru — inilah jalan
 *   lahirnya tagihan prorata milik penghuni yang keluar.
 */
export function reconcileTagihanKamar(input: {
  existing: Tagihan[]
  draft: DraftTagihan[]
  /** true bila bulan ini setelah bulan keluar — bulan yang sudah dibayar di muka. */
  setelahKeluar: boolean
}): RencanaTagihan {
  const { existing, draft, setelahKeluar } = input
  const hasil: RencanaTagihan = { perbarui: [], hapus: [], buat: [] }
  const terpakai = new Set<number>()

  for (const t of existing) {
    const idx = draft.findIndex((d, i) => !terpakai.has(i) && cocok(t, d))
    const d = idx === -1 ? null : draft[idx]
    if (idx !== -1) terpakai.add(idx)

    // nilaiDibayar(), bukan status === 'lunas': tagihan 'kurang' juga sudah
    // menyimpan uang sungguhan (jumlah_bayar) dan tidak boleh ditimpa/dihapus.
    const dibayar = nilaiDibayar(t)
    if (dibayar === 0) {
      if (d) {
        hasil.perbarui.push({
          id: t.id,
          data: {
            penghuni: d.penghuni, penghuni_id: d.penghuni_id,
            jumlah: d.jumlah, hari: d.hari, dari: d.dari, sampai: d.sampai,
            jatuh_tempo: d.jatuh_tempo,
            is_prorated: d.is_prorated ?? false,
            prorated_hari: d.prorated_hari ?? 0,
          },
        })
      } else {
        hasil.hapus.push(t.id)
      }
      continue
    }

    if (d) {
      const lebih = dibayar - d.jumlah
      if (lebih > 0) hasil.perbarui.push({ id: t.id, data: { kelebihan: lebih } })
    } else if (setelahKeluar) {
      // Uangnya sudah masuk rekening; menghapusnya membuat saldo turun sendiri
      // tanpa ada uang yang benar-benar keluar.
      hasil.perbarui.push({ id: t.id, data: { hangus: true } })
    }
  }

  hasil.buat = draft.filter((_, i) => !terpakai.has(i))
  return hasil
}

/**
 * Mengarsipkan penghuni: mengisi tanggal keluar, mengosongkan kamar bila ia
 * penghuni terakhir, lalu merapikan tagihan kamar itu.
 *
 * Berada di composable sendiri, bukan di dalam view, supaya keputusan uangnya
 * bisa diuji tanpa merender apa pun.
 */
export function useKeluarPenghuni() {
  const penghuni = usePenghuniStore()
  const kamar = useKamarStore()
  const tagihan = useTagihanStore()
  const log = useLogStore()
  const { kamarMasihTerisi } = useOccupancy()
  const { tagihanUntukKamar } = useTagihanCalc()

  /** Bulan keluar, ditambah tiap bulan sesudahnya yang kamarnya sudah punya tagihan. */
  function bulanDirapikan(p: Penghuni, bulanKeluar: string): string[] {
    const batas = bulanKey(bulanKeluar)
    const set = new Set<string>([bulanKeluar])
    for (const t of tagihan.items) {
      if (t.property_id !== p.property_id || t.kamar !== p.kamar) continue
      if (bulanKey(t.bulan) > batas) set.add(t.bulan)
    }
    return [...set].sort((a, b) => bulanKey(a).localeCompare(bulanKey(b)))
  }

  async function keluarkan(p: Penghuni, tgl: string): Promise<void> {
    await penghuni.update(p.id, { tgl_keluar: tgl })

    // Kamar baru kosong kalau orang ini penghuni terakhirnya — dicek ulang
    // setelah tgl_keluar tersimpan supaya kamarMasihTerisi membaca status baru.
    if (!kamarMasihTerisi(p.kamar, p.property_id, p.id)) {
      const k = kamar.items.find(k => k.nomor === p.kamar && k.property_id === p.property_id)
      if (k) await kamar.update(k.id, { status: 'kosong' })
    }

    const bulanKeluar = bulanFromTgl(tgl)
    let hangus = 0
    if (bulanKeluar) {
      const batas = bulanKey(bulanKeluar)
      for (const bulan of bulanDirapikan(p, bulanKeluar)) {
        const existing = tagihan.items.filter(t =>
          t.bulan === bulan && t.kamar === p.kamar && t.property_id === p.property_id)
        const rencana = reconcileTagihanKamar({
          existing,
          draft: tagihanUntukKamar(p.kamar, p.property_id, bulan),
          setelahKeluar: bulanKey(bulan) > batas,
        })
        for (const u of rencana.perbarui) {
          // Dijumlahkan dari nilaiDibayar(), bukan dari `jumlah`: yang benar-benar
          // hangus adalah uang yang sudah diterima, bukan yang ditagihkan.
          if (u.data.hangus) hangus += nilaiDibayar(existing.find(t => t.id === u.id)!)
          await tagihan.update(u.id, u.data)
        }
        for (const id of rencana.hapus) await tagihan.remove(id)
        for (const d of rencana.buat) {
          await tagihan.add({
            ...d, status: 'belum', property_id: p.property_id,
            createdAt: new Date().toISOString(),
          })
        }
      }
    }

    const catatan = hangus > 0
      ? `${p.nama} keluar ${fmtTgl(tgl)} — bayar di muka ${fmt(hangus)} hangus`
      : `${p.nama} keluar ${fmtTgl(tgl)}`
    await log.add(catatan, 'amber', p.property_id)
  }

  return { keluarkan }
}
