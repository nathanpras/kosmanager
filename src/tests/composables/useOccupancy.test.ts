import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOccupancy } from '../../composables/useOccupancy'
import { usePenghuniStore } from '../../stores/penghuni'
import type { Penghuni } from '../../types'

function huni(over: Partial<Penghuni> & { id: string }): Penghuni {
  return {
    nama: `Orang ${over.id}`, kamar: '101', hp: '08123456789', masuk: '2026-01-01',
    property_id: 'p1', ...over,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-03'))
})

afterEach(() => vi.useRealTimers())

describe('useOccupancy', () => {
  it('counts occupants of a room', () => {
    usePenghuniStore().items = [huni({ id: 'a' }), huni({ id: 'b' })]
    expect(useOccupancy().jumlahPenghuni('101', 'p1')).toBe(2)
  })

  it('keeps rooms with the same number in different properties separate', () => {
    usePenghuniStore().items = [huni({ id: 'a' }), huni({ id: 'b', property_id: 'p2' })]
    const { jumlahPenghuni } = useOccupancy()
    expect(jumlahPenghuni('101', 'p1')).toBe(1)
    expect(jumlahPenghuni('101', 'p2')).toBe(1)
  })

  it('excludes occupants whose contract has ended', () => {
    usePenghuniStore().items = [
      huni({ id: 'a' }),
      huni({ id: 'b', kontrak_selesai: '2026-06-30' }),   // sudah lewat
    ]
    expect(useOccupancy().jumlahPenghuni('101', 'p1')).toBe(1)
  })

  it('still counts a contract that ends in the future', () => {
    usePenghuniStore().items = [huni({ id: 'a', kontrak_selesai: '2026-12-31' })]
    expect(useOccupancy().jumlahPenghuni('101', 'p1')).toBe(1)
  })

  it('orders occupants by move-in date, longest-standing first', () => {
    usePenghuniStore().items = [
      huni({ id: 'baru', masuk: '2026-05-01' }),
      huni({ id: 'lama', masuk: '2026-02-01' }),
    ]
    expect(useOccupancy().penghuniDiKamar('101', 'p1').map(p => p.id))
      .toEqual(['lama', 'baru'])
  })

  it('reports the room still occupied when a roommate remains', () => {
    usePenghuniStore().items = [huni({ id: 'a' }), huni({ id: 'b' })]
    expect(useOccupancy().kamarMasihTerisi('101', 'p1', 'a')).toBe(true)
  })

  it('reports the room empty when the last occupant leaves', () => {
    usePenghuniStore().items = [huni({ id: 'a' })]
    expect(useOccupancy().kamarMasihTerisi('101', 'p1', 'a')).toBe(false)
  })

  it('returns zero for a room nobody lives in', () => {
    usePenghuniStore().items = [huni({ id: 'a' })]
    expect(useOccupancy().jumlahPenghuni('999', 'p1')).toBe(0)
  })
})
