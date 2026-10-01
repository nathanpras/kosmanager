import { useKamarStore } from '../stores/kamar'
import { usePenghuniStore } from '../stores/penghuni'
import { useLogStore } from '../stores/log'
import { useOccupancy } from './useOccupancy'
import { catatPindah, awalBulanBerikutnya } from '../utils/riwayatKamar'
import { bulanFromTgl } from '../utils/date'
import type { Penghuni } from '../types'

export class GagalPindah extends Error {}

/**
 * Memindahkan penghuni ke kamar lain.
 *
 * Aturan yang dipilih pemilik pada 23 Agustus 2026: pindah tengah bulan tidak
 * diprorata. Bulan berjalan tetap ditagih kamar lama sebulan penuh, kamar baru
 * mulai ditagih tanggal 1 bulan berikutnya, dan sisa hari di kamar baru tidak
 * ditagih sama sekali.
 *
 * Karena itu `riwayat_kamar` yang menentukan kamar mana yang ditagih, bukan
 * `Penghuni.kamar` — field itu langsung menunjuk kamar baru supaya daftar dan
 * status kamar mencerminkan tempat orangnya benar-benar tidur.
 *
 * Diangkat dari PenghuniView saat shell mobile membutuhkannya. Aturan ini
 * terlalu mahal untuk punya salinan kedua: yang salah menyalin akan membuat
 * tagihan bulan lampau ikut berpindah kamar, dan tagihan yang belum ada
 * uangnya bisa terhapus saat kamar lama direkonsiliasi.
 */
export function usePindahKamar() {
  const kamar = useKamarStore()
  const penghuni = usePenghuniStore()
  const log = useLogStore()
  const { kamarMasihTerisi } = useOccupancy()

  const cariKamar = (nomor: string, property_id: string) =>
    kamar.items.find(k => k.nomor === nomor && k.property_id === property_id)

  /** Kamar kosong di properti yang sama; kamar yang ditempati sekarang tidak ikut. */
  function kamarTujuan(p: Penghuni) {
    return kamar.items.filter(k =>
      k.property_id === p.property_id && k.status === 'kosong' && k.nomor !== p.kamar)
  }

  /**
   * @returns tanggal mulai berlakunya tagihan di kamar baru.
   * @throws GagalPindah bila tujuannya tidak masuk akal.
   */
  async function pindahkan(p: Penghuni, tujuan: string, tgl: string): Promise<string> {
    const efektif = awalBulanBerikutnya(tgl)
    if (!tujuan || !efektif) throw new GagalPindah('Kamar tujuan dan tanggal pindah wajib diisi')
    if (tujuan === p.kamar) throw new GagalPindah('Kamar tujuan sama dengan kamar sekarang')

    /* Dibaca sebelum update: store memutakhirkan objek yang sama, jadi setelah
       ini `p.kamar` sudah berisi kamar tujuan. */
    const kamarLama = p.kamar

    await penghuni.update(p.id, {
      kamar: tujuan,
      riwayat_kamar: catatPindah(p, tujuan, efektif),
    })

    /* Kamar lama hanya dikosongkan bila tidak ada roommate yang tertinggal. */
    if (!kamarMasihTerisi(kamarLama, p.property_id, p.id)) {
      const lama = cariKamar(kamarLama, p.property_id)
      if (lama) await kamar.update(lama.id, { status: 'kosong' })
    }
    const baru = cariKamar(tujuan, p.property_id)
    if (baru && baru.status === 'kosong') await kamar.update(baru.id, { status: 'terisi' })

    await log.add(
      `${p.nama} pindah dari kamar ${kamarLama} ke ${tujuan} — tagihan kamar ${tujuan} mulai ${bulanFromTgl(efektif)}`,
      'blue', p.property_id,
    )
    return efektif
  }

  return { pindahkan, kamarTujuan }
}
