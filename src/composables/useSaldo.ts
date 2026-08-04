import { computed } from 'vue'
import { useTagihanStore } from '../stores/tagihan'
import { usePengeluaranStore } from '../stores/pengeluaran'
import { usePropertiesStore } from '../stores/properties'
import { useAppStore } from '../stores/app'
import { hitungSaldo, gabungSaldo } from '../utils/saldo'
import type { RingkasSaldo } from '../utils/saldo'

/**
 * Saldo berjalan mengikuti properti yang sedang dipilih.
 *
 * Saldo awal disimpan per properti, bukan di pengaturan global, karena tiap
 * properti punya rekening banknya sendiri. Mode "Semua Properti" menjumlahkan.
 */
export function useSaldo() {
  const tagihan = useTagihanStore()
  const pengeluaran = usePengeluaranStore()
  const properties = usePropertiesStore()
  const app = useAppStore()

  const perProperti = computed<{ nama: string; ringkas: RingkasSaldo }[]>(() =>
    properties.items.map(p => ({
      nama: p.nama,
      ringkas: hitungSaldo(p, tagihan.items, pengeluaran.items),
    })),
  )

  const saldo = computed<RingkasSaldo>(() => {
    if (app.currentPropertyId === 'all') {
      return gabungSaldo(perProperti.value.map(x => x.ringkas))
    }
    const p = properties.items.find(x => x.id === app.currentPropertyId)
    if (!p) return { saldoAwal: 0, masuk: 0, keluar: 0, saldo: 0, belumDiatur: true }
    return hitungSaldo(p, tagihan.items, pengeluaran.items)
  })

  return { saldo, perProperti }
}
