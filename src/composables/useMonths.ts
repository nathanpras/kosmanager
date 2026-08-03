import { computed } from 'vue'
import { useTagihanStore } from '../stores/tagihan'
import { usePengeluaranStore } from '../stores/pengeluaran'
import { useProperty } from './useProperty'
import { bulanIni, bulanFromTgl, sortBulanDesc } from '../utils/date'

/**
 * Sumber tunggal daftar bulan untuk semua filter periode.
 *
 * Sebelumnya Dashboard, Laporan, dan Pengeluaran masing-masing menyusun
 * daftarnya sendiri dari sumber berbeda — Dashboard dan Laporan dari
 * `tagihan.bulan`, Pengeluaran dari `pengeluaran.tgl`. Bulan yang punya tagihan
 * tapi belum punya pengeluaran karena itu muncul di Dashboard tapi tidak bisa
 * dipilih di Pengeluaran. Menggabungkan kedua sumber menghilangkan seluruh kelas
 * bug tersebut.
 *
 * Ikut properti aktif, jadi daftar berganti saat properti diganti.
 */
export function useMonths() {
  const tagihan = useTagihanStore()
  const pengeluaran = usePengeluaranStore()
  const { filterByProperty } = useProperty()

  const availableMonths = computed(() => {
    const s = new Set<string>()

    filterByProperty(tagihan.items).forEach(t => {
      if (t.bulan) s.add(t.bulan)
    })

    filterByProperty(pengeluaran.items).forEach(p => {
      const bln = bulanFromTgl(p.tgl)
      if (bln) s.add(bln)
    })

    // Bulan berjalan selalu bisa dipilih, walau belum ada transaksi sama sekali.
    s.add(bulanIni())

    return sortBulanDesc([...s])
  })

  return { availableMonths }
}
