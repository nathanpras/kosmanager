import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMonths } from '../../composables/useMonths'
import { useAppStore } from '../../stores/app'
import { useTagihanStore } from '../../stores/tagihan'
import { usePengeluaranStore } from '../../stores/pengeluaran'
import type { Tagihan, Pengeluaran } from '../../types'

function tagihan(bulan: string, property_id = 'p1'): Tagihan {
  return {
    id: `t-${bulan}-${property_id}`, penghuni: 'A', kamar: '101', bulan,
    jumlah: 1_000_000, status: 'belum', property_id, createdAt: '2026-01-01',
  }
}

function pengeluaran(tgl: string, property_id = 'p1'): Pengeluaran {
  return {
    id: `p-${tgl}-${property_id}`, deskripsi: 'Listrik', jumlah: 500_000,
    kategori: 'Listrik', tgl, property_id,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-03'))
  useAppStore().currentPropertyId = 'all'
})

afterEach(() => vi.useRealTimers())

describe('useMonths', () => {
  it('always offers the current month, even with no data at all', () => {
    expect(useMonths().availableMonths.value).toEqual(['Agustus 2026'])
  })

  it('includes a month that only has tagihan', () => {
    useTagihanStore().items = [tagihan('Maret 2026')]
    expect(useMonths().availableMonths.value).toContain('Maret 2026')
  })

  it('includes a month that only has pengeluaran', () => {
    usePengeluaranStore().items = [pengeluaran('2026-04-10')]
    expect(useMonths().availableMonths.value).toContain('April 2026')
  })

  // Ini bug yang dilaporkan: Maret 2026 punya tagihan tapi belum punya
  // pengeluaran, sehingga tab bulannya tidak pernah muncul di halaman Pengeluaran.
  it('offers a month that has tagihan but no pengeluaran yet', () => {
    useTagihanStore().items = [tagihan('Maret 2026')]
    usePengeluaranStore().items = [pengeluaran('2026-08-01')]
    expect(useMonths().availableMonths.value).toContain('Maret 2026')
  })

  it('merges duplicates across both sources', () => {
    useTagihanStore().items = [tagihan('Maret 2026'), tagihan('Maret 2026', 'p2')]
    usePengeluaranStore().items = [pengeluaran('2026-03-05')]
    const months = useMonths().availableMonths.value
    expect(months.filter(m => m === 'Maret 2026')).toHaveLength(1)
  })

  it('sorts chronologically descending, not alphabetically', () => {
    useTagihanStore().items = [
      tagihan('Maret 2026'), tagihan('Desember 2025'), tagihan('Mei 2026'),
    ]
    expect(useMonths().availableMonths.value).toEqual([
      'Agustus 2026', 'Mei 2026', 'Maret 2026', 'Desember 2025',
    ])
  })

  it('respects the active property filter', () => {
    useAppStore().currentPropertyId = 'p1'
    useTagihanStore().items = [tagihan('Maret 2026', 'p1'), tagihan('Januari 2026', 'p2')]
    const months = useMonths().availableMonths.value
    expect(months).toContain('Maret 2026')
    expect(months).not.toContain('Januari 2026')
  })

  it('ignores pengeluaran with a missing or malformed date', () => {
    usePengeluaranStore().items = [
      pengeluaran(''), pengeluaran('bukan tanggal'),
    ]
    expect(useMonths().availableMonths.value).toEqual(['Agustus 2026'])
  })
})
