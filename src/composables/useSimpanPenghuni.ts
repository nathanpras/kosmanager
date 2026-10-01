import { usePenghuniStore } from '../stores/penghuni'
import { useKamarStore } from '../stores/kamar'
import { useTagihanStore } from '../stores/tagihan'
import { useLogStore } from '../stores/log'
import { useOccupancy } from './useOccupancy'
import { useTagihanCalc, kunciTagihan } from './useTagihanCalc'
import { kamarDiBulan, koreksiKamar } from '../utils/riwayatKamar'
import { bulanFromTgl } from '../utils/date'
import type { Penghuni } from '../types'

export class GagalSimpanPenghuni extends Error {}

/**
 * Menambah dan mengubah penghuni, beserta akibatnya pada kamar dan tagihan.
 *
 * Diangkat dari PenghuniView saat shell mobile membutuhkannya. Tiga hal yang
 * gampang hilang bila disalin sepotong:
 *
 * 1. Tagihan bulan masuk dibuat di sini, karena generator bulanan hanya
 *    mengurus bulan depan — tanpa ini bulan masuk selalu bolong.
 * 2. Mengganti kamar lewat formulir adalah PEMBETULAN SALAH INPUT, bukan
 *    pindahan: entri riwayat terakhir ditulis ulang supaya tidak lahir
 *    pindahan palsu. Pindah sungguhan lewat usePindahKamar().
 * 3. Kamar lama hanya dikosongkan bila tidak ada roommate yang tertinggal.
 */
export function useSimpanPenghuni() {
  const penghuni = usePenghuniStore()
  const kamar = useKamarStore()
  const tagihan = useTagihanStore()
  const log = useLogStore()
  const { kamarMasihTerisi } = useOccupancy()
  const { tagihanUntukKamar } = useTagihanCalc()

  const cariKamar = (nomor: string, property_id: string) =>
    kamar.items.find(k => k.nomor === nomor && k.property_id === property_id)

  async function buatTagihanBulanMasuk(p: Penghuni): Promise<void> {
    const bln = bulanFromTgl(p.masuk)
    if (!bln) return
    const sudahAda = new Set<string>()
    for (const t of tagihan.items.filter(t => t.bulan === bln && t.property_id === p.property_id)) {
      for (const k of kunciTagihan(t)) sudahAda.add(k)
    }
    for (const draft of tagihanUntukKamar(kamarDiBulan(p, bln), p.property_id, bln)) {
      if (kunciTagihan({ ...draft, property_id: p.property_id }).some(k => sudahAda.has(k))) continue
      await tagihan.add({
        ...draft, status: 'belum', property_id: p.property_id,
        createdAt: new Date().toISOString(),
      })
    }
  }

  function periksa(data: Partial<Penghuni>): void {
    if (!data.nama || !data.kamar || !data.hp) {
      throw new GagalSimpanPenghuni('Nama, kamar, dan no HP wajib diisi')
    }
  }

  async function tambah(data: Partial<Penghuni>): Promise<void> {
    periksa(data)
    await penghuni.add(data as Omit<Penghuni, 'id'>)
    const k = cariKamar(data.kamar!, data.property_id!)
    if (k && k.status === 'kosong') await kamar.update(k.id, { status: 'terisi' })
    await log.add(`${data.nama} masuk kamar ${data.kamar}`, 'green', data.property_id ?? '')
    await buatTagihanBulanMasuk(data as Penghuni)
  }

  async function ubah(id: string, data: Partial<Penghuni>): Promise<void> {
    periksa(data)
    const asli = penghuni.items.find(p => p.id === id)
    const patch: Partial<Penghuni> = { ...data }

    if (asli && asli.kamar !== patch.kamar && (asli.riwayat_kamar?.length ?? 0) > 0) {
      patch.riwayat_kamar = koreksiKamar(asli, patch.kamar ?? '')
    }
    await penghuni.update(id, patch)

    if (asli && asli.kamar !== data.kamar) {
      if (!kamarMasihTerisi(asli.kamar, asli.property_id, asli.id)) {
        const lama = cariKamar(asli.kamar, asli.property_id)
        if (lama) await kamar.update(lama.id, { status: 'kosong' })
      }
      const baru = cariKamar(data.kamar!, data.property_id!)
      if (baru && baru.status === 'kosong') await kamar.update(baru.id, { status: 'terisi' })
    }
  }

  return { tambah, ubah }
}
