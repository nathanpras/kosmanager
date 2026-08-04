import { describe, it, expect } from 'vitest'
import { kamarKosong, susunListing, listingBerubah } from '../../utils/publik'
import type { Kamar, Property } from '../../types'

const P: Property = {
  id: 'p1', nama: 'Raffles Kos 23', alamat: 'Jl. Waru Raya No.23',
  no_hp: '081703237605', maps_url: 'https://maps.example/x',
  bank_nama: 'BCA', bank_rekening: '5445427583', bank_an: 'Jonathan Prasetyo',
  created_at: '2026-03-29',
}

function kamar(over: Partial<Kamar> & { id: string; nomor: string }): Kamar {
  return { tipe: 'Standard', harga: 1_500_000, status: 'kosong', property_id: 'p1', ...over }
}

describe('kamarKosong', () => {
  it('returns only empty rooms', () => {
    const hasil = kamarKosong([
      kamar({ id: '1', nomor: '101' }),
      kamar({ id: '2', nomor: '102', status: 'terisi' }),
      kamar({ id: '3', nomor: '103', status: 'telat' }),
      kamar({ id: '4', nomor: '104', status: 'booked' }),
    ], 'p1')
    expect(hasil.map(k => k.nomor)).toEqual(['101'])
  })

  it('ignores other properties', () => {
    const hasil = kamarKosong([
      kamar({ id: '1', nomor: '101' }),
      kamar({ id: '2', nomor: '201', property_id: 'p2' }),
    ], 'p1')
    expect(hasil.map(k => k.nomor)).toEqual(['101'])
  })

  it('sorts numerically, not alphabetically', () => {
    const hasil = kamarKosong([
      kamar({ id: '1', nomor: '201' }), kamar({ id: '2', nomor: '101' }),
      kamar({ id: '3', nomor: '99' }),
    ], 'p1')
    expect(hasil.map(k => k.nomor)).toEqual(['99', '101', '201'])
  })
})

describe('susunListing — kebocoran data', () => {
  const listing = susunListing(P, [
    kamar({ id: '1', nomor: '101', keterangan: 'RAHASIA: penghuni lama nunggak', foto: 'f.jpg', deposit: 500_000 }),
  ], { diperbarui: '2026-08-04T00:00:00.000Z' })

  // Ini inti keamanannya: apa pun yang tidak sengaja dimasukkan tidak boleh terbit.
  it('never publishes the owner bank account', () => {
    const teks = JSON.stringify(listing)
    expect(teks).not.toContain('5445427583')
    expect(teks).not.toContain('Jonathan Prasetyo')
    expect(teks).not.toContain('BCA')
  })

  it('never publishes internal room notes', () => {
    expect(JSON.stringify(listing)).not.toContain('RAHASIA')
    expect(listing.kamar[0]).not.toHaveProperty('keterangan')
  })

  it('publishes only whitelisted room fields', () => {
    expect(Object.keys(listing.kamar[0]).sort())
      .toEqual(['deposit', 'foto', 'harga', 'nomor', 'tipe'])
  })

  it('publishes only whitelisted top-level fields', () => {
    expect(Object.keys(listing).sort()).toEqual([
      'alamat', 'denah', 'diperbarui', 'kamar', 'maps_url', 'nama',
      'tambahan_penghuni', 'total_kamar', 'total_kosong', 'wa',
    ])
  })

  it('omits optional fields instead of writing empty ones', () => {
    const polos = susunListing(P, [kamar({ id: '1', nomor: '101' })])
    expect(polos.kamar[0]).not.toHaveProperty('foto')
    expect(polos.kamar[0]).not.toHaveProperty('deposit')
    expect(polos.kamar[0]).not.toHaveProperty('kategori')
  })
})

describe('susunListing — hitungan', () => {
  it('counts total and vacant rooms', () => {
    const l = susunListing(P, [
      kamar({ id: '1', nomor: '101' }),
      kamar({ id: '2', nomor: '102', status: 'terisi' }),
      kamar({ id: '3', nomor: '103' }),
      kamar({ id: '4', nomor: '999', property_id: 'p2' }),
    ])
    expect(l.total_kamar).toBe(3)
    expect(l.total_kosong).toBe(2)
  })

  it('handles a fully occupied property', () => {
    const l = susunListing(P, [kamar({ id: '1', nomor: '101', status: 'terisi' })])
    expect(l.kamar).toEqual([])
    expect(l.total_kosong).toBe(0)
  })
})

describe('listingBerubah', () => {
  const a = susunListing(P, [kamar({ id: '1', nomor: '101' })], { diperbarui: '2026-08-04T00:00:00.000Z' })

  it('is true when there is nothing stored yet', () => {
    expect(listingBerubah(null, a)).toBe(true)
  })

  // Kalau stempel waktu ikut dibandingkan, aplikasi akan menulis ke Firestore
  // setiap kali dibuka walau tidak ada yang berubah.
  it('ignores the timestamp alone', () => {
    const b = susunListing(P, [kamar({ id: '1', nomor: '101' })], { diperbarui: '2026-12-31T23:59:59.000Z' })
    expect(listingBerubah(a, b)).toBe(false)
  })

  it('detects a room becoming occupied', () => {
    const b = susunListing(P, [kamar({ id: '1', nomor: '101', status: 'terisi' })])
    expect(listingBerubah(a, b)).toBe(true)
  })

  it('detects a price change', () => {
    const b = susunListing(P, [kamar({ id: '1', nomor: '101', harga: 1_600_000 })])
    expect(listingBerubah(a, b)).toBe(true)
  })
})
