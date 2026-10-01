import { useTagihanStore } from '../stores/tagihan'
import { usePengeluaranStore } from '../stores/pengeluaran'
import { useKamarStore } from '../stores/kamar'
import { usePenghuniStore } from '../stores/penghuni'
import { tglKeluar } from './useOccupancy'
import { nilaiDibayar } from '../utils/saldo'
import { monthsBack } from '../utils/date'
import { MONTHS_FULL } from '../utils/format'

/**
 * Angka-angka untuk bagan laporan.
 *
 * Diangkat dari LaporanView saat shell mobile membutuhkannya. Lingkup properti
 * dikirim sebagai argumen, bukan dibaca dari `app.currentPropertyId`: desktop
 * punya pemilih properti di bilah atas, shell mobile tidak, dan membiarkan
 * angkanya bergantung pada pilihan yang tidak terlihat di layar itu lebih buruk
 * daripada keduanya.
 *
 * `'all'` atau kosong berarti seluruh properti.
 */
export function useLaporan() {
  const tagihan = useTagihanStore()
  const pengeluaran = usePengeluaranStore()
  const kamar = useKamarStore()
  const penghuni = usePenghuniStore()

  const saring = <T extends { property_id: string }>(items: T[], pid?: string): T[] =>
    !pid || pid === 'all' ? items : items.filter(x => x.property_id === pid)

  const bulanTerakhir = (n = 6): string[] => monthsBack(n)

  /** Uang yang benar-benar diterima per bulan — bukan yang ditagih. */
  function pemasukanPerBulan(pid?: string, n = 6): number[] {
    return bulanTerakhir(n).map(bln =>
      saring(tagihan.items, pid)
        .filter(t => t.bulan === bln)
        .reduce((s, t) => s + nilaiDibayar(t), 0))
  }

  function pengeluaranPerKategori(pid?: string): { labels: string[]; values: number[] } {
    const peta: Record<string, number> = {}
    for (const p of saring(pengeluaran.items, pid)) {
      peta[p.kategori] = (peta[p.kategori] ?? 0) + p.jumlah
    }
    return { labels: Object.keys(peta), values: Object.values(peta) }
  }

  /**
   * Persentase hunian per bulan.
   *
   * Tanggal keluar dibaca lewat tglKeluar(): penghuni yang keluar lewat alur
   * arsip hanya menulis `tgl_keluar`, jadi membaca `kontrak_selesai` saja
   * membuat mereka terhitung menghuni selamanya dan grafiknya merangkak lewat
   * seratus persen.
   */
  function hunianPerBulan(pid?: string, n = 6): number[] {
    const totalKamar = saring(kamar.items, pid).length || 1
    return bulanTerakhir(n).map(bln => {
      const [namaBulan, tahunStr] = bln.split(' ')
      const idx = MONTHS_FULL.indexOf(namaBulan)
      const tahun = parseInt(tahunStr)
      const awal = new Date(tahun, idx, 1).toISOString().split('T')[0]
      const akhir = new Date(tahun, idx + 1, 0).toISOString().split('T')[0]
      const aktif = saring(penghuni.items, pid).filter(p => {
        const masuk = p.masuk ?? '9999-01-01'
        const keluar = tglKeluar(p) ?? '9999-12-31'
        return masuk <= akhir && keluar >= awal
      }).length
      return Math.round(aktif / totalKamar * 100)
    })
  }

  return { bulanTerakhir, pemasukanPerBulan, pengeluaranPerKategori, hunianPerBulan }
}
