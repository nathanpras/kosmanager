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
 * Kunci dedupe sebuah tagihan — bisa lebih dari satu.
 *
 * Dokumen tagihan yang ditulis sebelum ada `penghuni_id` hanya bisa dikenali
 * lewat nama, sedangkan draft baru selalu punya id. Kalau dibandingkan dengan
 * satu kunci saja, tagihan lama tidak pernah cocok dan penghuni yang sudah
 * ditagih akan ditagih dua kali.
 */
export function kunciTagihan(t: {
  penghuni_id?: string
  penghuni: string
  kamar: string
  property_id?: string
}): string[] {
  const ekor = `${t.kamar}|${t.property_id ?? ''}`
  const kunci = [`nama:${t.penghuni}|${ekor}`]
  if (t.penghuni_id) kunci.push(`id:${t.penghuni_id}|${ekor}`)
  return kunci
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
