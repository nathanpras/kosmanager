import { useMaintenanceStore } from '../stores/maintenance'
import { useLogStore } from '../stores/log'
import { useOccupancy } from './useOccupancy'
import { normalizePhone, isValidPhone } from './useWAReminder'
import { today } from '../utils/date'
import type { Maintenance, Penghuni } from '../types'

/**
 * Perubahan status keluhan dan jalur balasan WhatsApp-nya.
 *
 * Diangkat dari MaintenanceView saat shell mobile membutuhkannya. Dua hal yang
 * gampang salah bila disalin: tanggal selesai yang harus ikut dikosongkan saat
 * keluhan dibuka kembali, dan pencarian penghuni pelapor yang harus jatuh ke
 * penghuni terlama bila namanya tidak cocok.
 */
export function useKeluhan() {
  const maintenance = useMaintenanceStore()
  const log = useLogStore()
  const { penghuniDiKamar } = useOccupancy()

  async function ubahStatus(m: Maintenance, status: Maintenance['status']): Promise<void> {
    /* Tanggal selesai diisi otomatis supaya lama penanganan terhitung tanpa
       perlu diingat manual; dikosongkan lagi kalau keluhan dibuka kembali. */
    const patch: Partial<Maintenance> = { status }
    if (status === 'selesai') patch.tgl_selesai = m.tgl_selesai ?? today()
    else if (m.tgl_selesai) patch.tgl_selesai = ''

    await maintenance.update(m.id, patch)
    await log.add(`Maintenance kamar ${m.kamar} → ${status}`, 'blue', m.property_id)
  }

  /**
   * Penghuni yang dihubungi untuk sebuah keluhan.
   * Pelapor dicocokkan per nama bila ada; kalau tidak, penghuni terlama di
   * kamar itu — lebih baik menghubungi orang yang salah di kamar yang benar
   * daripada tidak menghubungi siapa pun.
   */
  function penghuniKeluhan(m: Maintenance): Penghuni | null {
    const diKamar = penghuniDiKamar(m.kamar, m.property_id)
    return diKamar.find(p => p.nama === m.pelapor) ?? diKamar[0] ?? null
  }

  /** @returns URL wa.me, atau alasan kenapa tidak bisa — bukan melempar. */
  function urlBalasWA(m: Maintenance): { url: string } | { galat: string } {
    const p = penghuniKeluhan(m)
    if (!p) return { galat: 'Penghuni kamar ini tidak ditemukan' }
    if (!isValidPhone(p.hp)) return { galat: `Nomor HP ${p.nama} tidak valid` }
    const pesan =
      `Halo ${p.nama}, soal laporan ${m.jenis ?? 'kendala'} di kamar ${m.kamar} ` +
      `(${m.deskripsi}) — `
    return { url: `https://wa.me/${normalizePhone(p.hp)}?text=${encodeURIComponent(pesan)}` }
  }

  return { ubahStatus, penghuniKeluhan, urlBalasWA }
}
