import { describe, it, expect } from 'vitest'
import { generateReminderURL, generateReminderMessage } from '../../composables/useWAReminder'
import type { Penghuni, Tagihan } from '../../types'

const penghuni: Penghuni = {
  id: 'p1', nama: 'Budi Santoso', kamar: 'A1',
  no_hp: '628123456789', masuk: '2026-01-01', property_id: 'prop1',
}

const tagihan: Tagihan = {
  id: 't1', penghuni: 'Budi Santoso', kamar: 'A1',
  bulan: 'Mei 2026', jumlah: 1500000, status: 'belum',
  property_id: 'prop1', createdAt: '2026-05-01T00:00:00Z',
}

const template = 'Halo {nama}, tagihan kos bulan {bulan} sebesar {jumlah} belum dibayar. Mohon segera dilunasi. Terima kasih 🙏'

describe('generateReminderMessage', () => {
  it('replaces all placeholders', () => {
    const msg = generateReminderMessage(penghuni, tagihan, template)
    expect(msg).toContain('Budi Santoso')
    expect(msg).toContain('Mei 2026')
    expect(msg).toContain('Rp 1.500.000')
    expect(msg).not.toContain('{nama}')
    expect(msg).not.toContain('{bulan}')
    expect(msg).not.toContain('{jumlah}')
  })
})

describe('generateReminderURL', () => {
  it('produces a valid wa.me URL', () => {
    const url = generateReminderURL(penghuni, tagihan, template)
    expect(url).toMatch(/^https:\/\/wa\.me\/628123456789\?text=/)
  })

  it('URL-encodes the message', () => {
    const url = generateReminderURL(penghuni, tagihan, template)
    expect(url).toContain('%20')
  })
})
