import { describe, it, expect } from 'vitest'
import { generateReminderURL, generateReminderMessage, isValidPhone, normalizePhone } from '../../composables/useWAReminder'
import type { Penghuni, Tagihan } from '../../types'

const penghuni: Penghuni = {
  id: 'p1', nama: 'Budi Santoso', kamar: 'A1',
  hp: '628123456789', masuk: '2026-01-01', property_id: 'prop1',
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

  it('replaces {kamar} placeholder', () => {
    const msg = generateReminderMessage(penghuni, tagihan, 'Kamar {kamar} — {nama}')
    expect(msg).toContain('Kamar A1')
    expect(msg).not.toContain('{kamar}')
  })

  it('replaces {sisa} with provided sisa value', () => {
    const msg = generateReminderMessage(penghuni, tagihan, 'Sisa {sisa}', 500000)
    expect(msg).toContain('Rp 500.000')
    expect(msg).not.toContain('{sisa}')
  })

  it('uses jumlah as fallback when sisa not provided', () => {
    const msg = generateReminderMessage(penghuni, tagihan, 'Sisa {sisa}')
    expect(msg).toContain('Rp 1.500.000')
  })

  it('replaces {jatuh_tempo} with formatted date', () => {
    const tagihanWithDue = { ...tagihan, jatuh_tempo: '2026-06-10' }
    const msg = generateReminderMessage(penghuni, tagihanWithDue, 'Jatuh tempo {jatuh_tempo}')
    expect(msg).toContain('10 Juni 2026')
    expect(msg).not.toContain('{jatuh_tempo}')
  })

  it('uses dash when jatuh_tempo not set', () => {
    const msg = generateReminderMessage(penghuni, tagihan, 'Jatuh tempo {jatuh_tempo}')
    expect(msg).toContain('-')
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

describe('normalizePhone', () => {
  it('strips non-digits', () => {
    expect(normalizePhone('+62 812-3456-789')).toBe('62812345678 9'.replace(' ', ''))
  })

  it('converts 08xx to 628xx', () => {
    expect(normalizePhone('08123456789')).toBe('628123456789')
  })

  it('keeps 62xx unchanged', () => {
    expect(normalizePhone('628123456789')).toBe('628123456789')
  })

  it('handles empty string', () => {
    expect(normalizePhone('')).toBe('')
  })
})

describe('isValidPhone', () => {
  it('returns true for valid phone', () => {
    expect(isValidPhone('08123456789')).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(isValidPhone('')).toBe(false)
  })

  it('returns false for too-short number', () => {
    expect(isValidPhone('1234567')).toBe(false)
  })
})
