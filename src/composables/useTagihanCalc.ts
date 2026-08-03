import { useKamarStore } from '../stores/kamar'
import { useSettingsStore } from '../stores/settings'
import { useOccupancy } from './useOccupancy'
import {
  hitungTagihan, DEFAULT_NOMINAL_TAMBAHAN, DEFAULT_TGL_JATUH_TEMPO,
} from '../utils/billing'
import type { HasilTagihan } from '../utils/billing'

/**
 * Merakit nilai tagihan sebuah kamar dari harga kamar, jumlah penghuni aktif,
 * dan pengaturan — supaya rumusnya tidak tersebar lagi di App.vue, TagihanView,
 * dan PenghuniView seperti sebelumnya.
 */
export function useTagihanCalc() {
  const kamar = useKamarStore()
  const settings = useSettingsStore()
  const { penghuniDiKamar } = useOccupancy()

  /**
   * @param bulan  label "Maret 2026"
   * @param opts.prorata  hitung prorata bila penghuni penanggung masuk di bulan itu
   */
  function tagihanUntukKamar(
    nomor: string,
    property_id: string,
    bulan: string,
    opts: { prorata?: boolean } = {},
  ): { penghuni: string; kamar: string; bulan: string } & HasilTagihan {
    const k = kamar.items.find(x => x.nomor === nomor && x.property_id === property_id)
    const penghuni = penghuniDiKamar(nomor, property_id)

    // Penghuni terlama menjadi penanggung: Tagihan.penghuni adalah nama, dan
    // useWAReminder mencocokkan nama itu untuk mendapatkan nomor HP.
    const penanggung = penghuni[0]

    const hasil = hitungTagihan({
      bulan,
      harga: k?.harga ?? 0,
      jumlahPenghuni: penghuni.length,
      nominalTambahan: k?.nominal_tambahan ?? settings.data.nominal_tambahan ?? DEFAULT_NOMINAL_TAMBAHAN,
      masuk: opts.prorata ? penanggung?.masuk : undefined,
      tglJatuhTempo: settings.data.tgl_jatuh_tempo ?? DEFAULT_TGL_JATUH_TEMPO,
    })

    return { penghuni: penanggung?.nama ?? '', kamar: nomor, bulan, ...hasil }
  }

  return { tagihanUntukKamar }
}
