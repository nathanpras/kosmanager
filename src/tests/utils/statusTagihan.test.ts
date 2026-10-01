import { describe, it, expect } from 'vitest'
import { statusTagihan } from '../../utils/statusTagihan'
import type { Tagihan } from '../../types'

/**
 * Aturan ini diangkat dari fungsi lokal di TagihanView.vue supaya shell mobile
 * memakai keputusan yang sama persis. Uji ini mengunci perilakunya agar
 * pengangkatan itu tidak diam-diam mengubah tampilan desktop.
 */

const t = (patch: Partial<Tagihan> = {}): Tagihan => ({
  id: 't1', penghuni: 'Ani', kamar: '101', bulan: 'September 2026',
  jumlah: 1_000_000, status: 'belum', property_id: 'p1',
  createdAt: '2026-09-01', ...patch,
})

const HARI = '2026-09-20'

describe('statusTagihan', () => {
  it('dibayar penuh = lunas, sisa nol', () => {
    expect(statusTagihan(t({ jumlah_bayar: 1_000_000 }), HARI))
      .toEqual({ status: 'lunas', dibayar: 1_000_000, sisa: 0, telat: false })
  })

  it('lebih bayar tetap lunas, tidak jadi sisa negatif', () => {
    const h = statusTagihan(t({ jumlah_bayar: 1_200_000 }), HARI)
    expect(h.status).toBe('lunas')
    expect(h.sisa).toBe(0)
  })

  it('sebagian = kurang, sisanya dihitung', () => {
    expect(statusTagihan(t({ jumlah_bayar: 400_000 }), HARI))
      .toMatchObject({ status: 'kurang', dibayar: 400_000, sisa: 600_000 })
  })

  it('kurang bayar yang lewat tempo tetap kurang, tapi menandai telat', () => {
    /* "Sudah masuk sebagian" lebih berguna daripada "tanggalnya lewat";
       informasi telatnya tidak hilang, hanya tidak jadi judul. */
    const h = statusTagihan(t({ jumlah_bayar: 400_000, jatuh_tempo: '2026-09-01' }), HARI)
    expect(h.status).toBe('kurang')
    expect(h.telat).toBe(true)
  })

  it('belum dibayar dan lewat tempo = telat', () => {
    expect(statusTagihan(t({ jatuh_tempo: '2026-09-01' }), HARI))
      .toEqual({ status: 'telat', dibayar: 0, sisa: 1_000_000, telat: true })
  })

  it('belum dibayar dan belum jatuh tempo = belum', () => {
    expect(statusTagihan(t({ jatuh_tempo: '2026-09-30' }), HARI))
      .toEqual({ status: 'belum', dibayar: 0, sisa: 1_000_000, telat: false })
  })

  it('tanpa jatuh tempo tidak pernah dianggap telat', () => {
    expect(statusTagihan(t(), HARI).status).toBe('belum')
  })

  it('tagihan lama berstatus lunas tanpa jumlah_bayar tetap terbaca lunas', () => {
    /* Data sebelum field jumlah_bayar ada. nilaiDibayar() yang menanganinya;
       di sini dikunci supaya pembacaannya tidak berubah. */
    expect(statusTagihan(t({ status: 'lunas' }), HARI))
      .toMatchObject({ status: 'lunas', dibayar: 1_000_000, sisa: 0 })
  })

  it('tagihan nol rupiah tidak diklaim lunas', () => {
    const h = statusTagihan(t({ jumlah: 0 }), HARI)
    expect(h.status).toBe('belum')
    expect(h.sisa).toBe(0)
  })
})
