import type { Penghuni, Tagihan } from '../types'
import { fmt, fmtTgl } from '../utils/format'

export const DEFAULT_TEMPLATE =
  'Halo {nama}, tagihan kos kamar {kamar} bulan {bulan} sebesar {sisa} belum dilunasi (jatuh tempo {jatuh_tempo}). Mohon segera dilunasi. Terima kasih 🙏'

export function normalizePhone(no_hp: string): string {
  let phone = (no_hp ?? '').replace(/\D/g, '')
  if (phone.startsWith('0')) phone = '62' + phone.substring(1)
  return phone
}

export function isValidPhone(no_hp: string): boolean {
  return normalizePhone(no_hp).length >= 8
}

export function generateReminderMessage(
  penghuni: Penghuni,
  tagihan: Tagihan,
  template: string,
  sisa?: number,
): string {
  const sisaVal = sisa ?? tagihan.jumlah
  const jatuhTempo = tagihan.jatuh_tempo ? fmtTgl(tagihan.jatuh_tempo) : '-'
  return template
    .replace('{nama}', penghuni.nama)
    .replace('{kamar}', tagihan.kamar)
    .replace('{bulan}', tagihan.bulan)
    .replace('{jumlah}', fmt(tagihan.jumlah))
    .replace('{sisa}', fmt(sisaVal))
    .replace('{jatuh_tempo}', jatuhTempo)
}

export function generateReminderURL(
  penghuni: Penghuni,
  tagihan: Tagihan,
  template: string,
  sisa?: number,
): string {
  const msg = generateReminderMessage(penghuni, tagihan, template, sisa)
  const phone = normalizePhone(penghuni.hp)
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

export function useWAReminder() {
  return { generateReminderMessage, generateReminderURL, isValidPhone, DEFAULT_TEMPLATE }
}
