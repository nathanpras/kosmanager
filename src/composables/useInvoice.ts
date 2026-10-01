import { useTagihanStore } from '../stores/tagihan'
import { bulanKey } from '../utils/date'
import type { Tagihan } from '../types'

/**
 * Tagihan mana saja yang masuk satu invoice.
 *
 * Pembayaran di muka menandai beberapa bulan sekaligus dengan satu `bayar_ref`,
 * dan invoicenya harus memuat semuanya — bukan hanya baris yang kebetulan
 * diketuk. Tanpa itu, penghuni yang membayar enam bulan menerima kuitansi untuk
 * satu bulan dan mengira sisanya belum tercatat.
 *
 * Diangkat dari TagihanView saat shell mobile membutuhkannya.
 */
export function useInvoice() {
  const tagihan = useTagihanStore()

  function idsUntuk(t: Tagihan): string[] {
    if (!t.bayar_ref) return [t.id]
    return tagihan.items
      .filter(x => x.bayar_ref === t.bayar_ref)
      .sort((a, b) => bulanKey(a.bulan).localeCompare(bulanKey(b.bulan)))
      .map(x => x.id)
  }

  return { idsUntuk }
}
