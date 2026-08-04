import { describe, it, expect } from 'vitest'
import { nilaiDibayar, tglPembayaran, hitungSaldo, gabungSaldo } from '../../utils/saldo'
import type { Tagihan, Pengeluaran } from '../../types'

function tag(over: Partial<Tagihan> & { id: string }): Tagihan {
  return {
    penghuni: 'A', kamar: '101', bulan: 'Maret 2026', jumlah: 1_000_000,
    status: 'belum', property_id: 'p1', createdAt: '2026-03-01', ...over,
  }
}
function exp(over: Partial<Pengeluaran> & { id: string }): Pengeluaran {
  return { deskripsi: 'x', jumlah: 100_000, kategori: 'Listrik', tgl: '2026-03-10', property_id: 'p1', ...over }
}

describe('nilaiDibayar', () => {
  it('uses jumlah_bayar when present', () => {
    expect(nilaiDibayar(tag({ id: '1', jumlah_bayar: 400_000, status: 'kurang' }))).toBe(400_000)
  })

  it('treats a lunas bill without jumlah_bayar as paid in full', () => {
    expect(nilaiDibayar(tag({ id: '1', status: 'lunas' }))).toBe(1_000_000)
  })

  it('counts nothing for an unpaid bill', () => {
    expect(nilaiDibayar(tag({ id: '1', status: 'belum' }))).toBe(0)
  })

  it('prefers a partial payment over the full amount', () => {
    expect(nilaiDibayar(tag({ id: '1', jumlah_bayar: 250_000, status: 'lunas' }))).toBe(250_000)
  })
})

describe('tglPembayaran', () => {
  it('uses the recorded payment date', () => {
    expect(tglPembayaran(tag({ id: '1', tgl: '2026-03-23' }))).toBe('2026-03-23')
  })

  it('falls back to the first of the billed month', () => {
    expect(tglPembayaran(tag({ id: '1', bulan: 'Maret 2026' }))).toBe('2026-03-01')
  })

  it('returns null when the month is unusable', () => {
    expect(tglPembayaran(tag({ id: '1', bulan: 'entah' }))).toBeNull()
  })
})

describe('hitungSaldo', () => {
  const prop = { id: 'p1', saldo_awal: 5_000_000, saldo_awal_tgl: '2026-03-01' }

  it('adds payments and subtracts expenses', () => {
    const r = hitungSaldo(
      prop,
      [tag({ id: 't1', status: 'lunas', tgl: '2026-03-05' })],
      [exp({ id: 'e1', jumlah: 300_000, tgl: '2026-03-06' })],
    )
    expect(r.masuk).toBe(1_000_000)
    expect(r.keluar).toBe(300_000)
    expect(r.saldo).toBe(5_700_000)
  })

  it('ignores transactions before the starting-balance date', () => {
    const r = hitungSaldo(
      prop,
      [tag({ id: 't1', status: 'lunas', tgl: '2026-02-20' })],
      [exp({ id: 'e1', tgl: '2026-02-25' })],
    )
    expect(r.masuk).toBe(0)
    expect(r.keluar).toBe(0)
    expect(r.saldo).toBe(5_000_000)
  })

  it('includes a transaction exactly on the starting-balance date', () => {
    const r = hitungSaldo(prop, [tag({ id: 't1', status: 'lunas', tgl: '2026-03-01' })], [])
    expect(r.masuk).toBe(1_000_000)
  })

  it('ignores other properties', () => {
    const r = hitungSaldo(
      prop,
      [tag({ id: 't1', status: 'lunas', tgl: '2026-03-05', property_id: 'p2' })],
      [exp({ id: 'e1', property_id: 'p2' })],
    )
    expect(r.saldo).toBe(5_000_000)
  })

  it('counts everything when no starting date is set', () => {
    const r = hitungSaldo(
      { id: 'p1' },
      [tag({ id: 't1', status: 'lunas', tgl: '2020-01-01' })],
      [exp({ id: 'e1', tgl: '2019-01-01', jumlah: 200_000 })],
    )
    expect(r.saldo).toBe(800_000)
    expect(r.belumDiatur).toBe(true)
  })

  it('flags configured properties as set up', () => {
    expect(hitungSaldo(prop, [], []).belumDiatur).toBe(false)
  })

  it('can go negative', () => {
    const r = hitungSaldo(
      { id: 'p1', saldo_awal: 100_000, saldo_awal_tgl: '2026-03-01' },
      [],
      [exp({ id: 'e1', jumlah: 500_000 })],
    )
    expect(r.saldo).toBe(-400_000)
  })
})

describe('gabungSaldo', () => {
  it('sums across properties', () => {
    const r = gabungSaldo([
      { saldoAwal: 1_000, masuk: 500, keluar: 200, saldo: 1_300, belumDiatur: false },
      { saldoAwal: 2_000, masuk: 100, keluar: 50, saldo: 2_050, belumDiatur: false },
    ])
    expect(r).toEqual({ saldoAwal: 3_000, masuk: 600, keluar: 250, saldo: 3_350, belumDiatur: false })
  })

  it('stays flagged when any property is unconfigured', () => {
    expect(gabungSaldo([
      { saldoAwal: 0, masuk: 0, keluar: 0, saldo: 0, belumDiatur: true },
      { saldoAwal: 1, masuk: 0, keluar: 0, saldo: 1, belumDiatur: false },
    ]).belumDiatur).toBe(true)
  })

  it('handles an empty list', () => {
    expect(gabungSaldo([]).saldo).toBe(0)
  })
})
