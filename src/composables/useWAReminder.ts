import type { Penghuni, Tagihan } from '../types'
import { fmt } from '../utils/format'

export const DEFAULT_TEMPLATE =
  'Halo {nama}, tagihan kos bulan {bulan} sebesar {jumlah} belum dibayar. Mohon segera dilunasi. Terima kasih 🙏'

export function generateReminderMessage(
  penghuni: Penghuni,
  tagihan: Tagihan,
  template: string,
): string {
  return template
    .replace('{nama}', penghuni.nama)
    .replace('{bulan}', tagihan.bulan)
    .replace('{jumlah}', fmt(tagihan.jumlah))
}

export function generateReminderURL(
  penghuni: Penghuni,
  tagihan: Tagihan,
  template: string,
): string {
  const msg = generateReminderMessage(penghuni, tagihan, template)
  let phone = penghuni.no_hp.replace(/\D/g, '')
  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1)
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

export function useWAReminder() {
  return { generateReminderMessage, generateReminderURL, DEFAULT_TEMPLATE }
}
