import { describe, it, expect } from 'vitest'
import { nomorInvoiceBerikutnya, rakitInvoice } from '../../utils/invoice'
import type { Tagihan, Penghuni, Property } from '../../types'

const properti = {
  id: 'p1', nama: 'Raffles Kos Waru 23', alamat: 'Jl. Waru 23', no_hp: '08123456789',
  bank_nama: 'BCA', bank_rekening: '1234567890', bank_an: 'Jonathan', created_at: '',
} as Property

const penghuni = {
  id: 'a', nama: 'Budi', kamar: '101', hp: '08987654321', masuk: '2026-01-01', property_id: 'p1',
} as Penghuni

function tag(over: Partial<Tagihan>): Tagihan {
  return {
    id: 't1', penghuni: 'Budi', kamar: '101', bulan: 'Maret 2026', jumlah: 1_500_000,
    status: 'lunas', property_id: 'p1', createdAt: '2026-03-01T00:00:00.000Z', ...over,
  }
}

describe('nomorInvoiceBerikutnya', () => {
  it('memulai dari 0001 bila belum ada nomor tahun ini', () => {
    expect(nomorInvoiceBerikutnya([], '2026-08-22')).toBe('INV/RK/2026/08/0001')
  })

  it('melanjutkan dari nomor tertinggi tahun berjalan', () => {
    const dipakai = ['INV/RK/2026/01/0001', 'INV/RK/2026/07/0009', 'INV/RK/2025/12/0042']
    expect(nomorInvoiceBerikutnya(dipakai, '2026-08-22')).toBe('INV/RK/2026/08/0010')
  })

  it('mengabaikan nilai yang bukan nomor invoice', () => {
    expect(nomorInvoiceBerikutnya(['', 'entah apa'], '2026-08-22')).toBe('INV/RK/2026/08/0001')
  })
})

describe('rakitInvoice', () => {
  it('merakit satu tagihan penuh', () => {
    const d = rakitInvoice({
      tagihan: [tag({})], penghuni, properti, no: 'INV/RK/2026/03/0001', tgl: '2026-03-02',
    })
    expect(d.baris).toHaveLength(1)
    expect(d.baris[0].periode).toBe('Maret 2026')
    expect(d.subtotal).toBe(1_500_000)
    expect(d.diskon).toBe(0)
    expect(d.total).toBe(1_500_000)
    expect(d.lunas).toBe(true)
    expect(d.nama).toBe('Budi')
    expect(d.bank).toBe('BCA')
  })

  it('menuliskan rentang hari pada baris prorata', () => {
    const d = rakitInvoice({
      tagihan: [tag({ jumlah: 483_871, is_prorated: true, dari: '2026-03-01', sampai: '2026-03-10', hari: 10 })],
      penghuni, properti, no: 'INV/RK/2026/03/0002', tgl: '2026-03-11',
    })
    expect(d.baris[0].periode).toBe('1–10 Mar 2026 (10 hari)')
  })

  it('menampilkan subtotal sebelum diskon untuk invoice batch', () => {
    const batch = [
      tag({ id: 't1', bulan: 'Agustus 2026', jumlah: 1_833_333, diskon_batch: 1_000_000 }),
      tag({ id: 't2', bulan: 'September 2026', jumlah: 1_833_333, diskon_batch: 1_000_000 }),
    ]
    const d = rakitInvoice({ tagihan: batch, penghuni, properti, no: 'INV/RK/2026/08/0003', tgl: '2026-08-01' })
    expect(d.total).toBe(3_666_666)
    expect(d.diskon).toBe(1_000_000)
    expect(d.subtotal).toBe(4_666_666)
    expect(d.baris).toHaveLength(2)
  })

  it('menandai invoice yang belum dibayar', () => {
    const d = rakitInvoice({
      tagihan: [tag({ status: 'belum' })], penghuni, properti, no: 'INV/RK/2026/03/0004', tgl: '2026-03-01',
    })
    expect(d.lunas).toBe(false)
  })
})
