import { describe, it, expect } from 'vitest'
import { nomorBaru, sudahBergayaBaru, susunRencana } from '../../utils/nomorKamar'

describe('nomorBaru', () => {
  it('maps every block to its floor, exactly as specified', () => {
    expect(nomorBaru('B1')).toBe('101')
    expect(nomorBaru('B7')).toBe('107')
    expect(nomorBaru('A1')).toBe('201')
    expect(nomorBaru('A9')).toBe('209')
    expect(nomorBaru('C1')).toBe('301')
    expect(nomorBaru('C5')).toBe('305')
    expect(nomorBaru('D1')).toBe('401')
  })

  it('tolerates lowercase and stray spaces', () => {
    expect(nomorBaru('b1')).toBe('101')
    expect(nomorBaru(' A9 ')).toBe('209')
  })

  it('rejects blocks that are not in the mapping', () => {
    expect(nomorBaru('E1')).toBeNull()
    expect(nomorBaru('Z3')).toBeNull()
  })

  it('rejects anything that is not block + number', () => {
    expect(nomorBaru('101')).toBeNull()
    expect(nomorBaru('')).toBeNull()
    expect(nomorBaru('Kamar B1')).toBeNull()
    expect(nomorBaru('B')).toBeNull()
  })
})

describe('sudahBergayaBaru', () => {
  it('recognises already-migrated numbers', () => {
    expect(sudahBergayaBaru('101')).toBe(true)
    expect(sudahBergayaBaru('401')).toBe(true)
  })

  it('does not mistake old numbers for new ones', () => {
    expect(sudahBergayaBaru('B1')).toBe(false)
    expect(sudahBergayaBaru('')).toBe(false)
  })
})

const P = 'prop-waru'

function kamar(id: string, nomor: string, property_id = P) { return { id, nomor, property_id } }
function ref(id: string, kamarNo: string, property_id = P) { return { id, kamar: kamarNo, property_id } }

function kosong() {
  return { kamar: [], penghuni: [], tagihan: [], maintenance: [] }
}

describe('susunRencana', () => {
  it('renames the room and every reference to it', () => {
    const r = susunRencana(P, {
      ...kosong(),
      kamar: [kamar('k1', 'B1')],
      penghuni: [ref('p1', 'B1')],
      tagihan: [ref('t1', 'B1'), ref('t2', 'B1')],
      maintenance: [ref('m1', 'B1')],
    })
    expect(r.ubah).toHaveLength(5)
    expect(r.ubah.every(u => u.dari === 'B1' && u.ke === '101')).toBe(true)
    expect(r.ubah.map(u => u.koleksi).sort())
      .toEqual(['kamar', 'maintenance', 'penghuni', 'tagihan', 'tagihan'])
  })

  // Kalau referensi tidak ikut diganti, riwayat tagihan menunjuk kamar yang
  // sudah tidak ada — inilah alasan migrasi tidak boleh menyentuh koleksi kamar saja.
  it('leaves no reference behind', () => {
    const r = susunRencana(P, {
      ...kosong(),
      kamar: [kamar('k1', 'B1'), kamar('k2', 'A9')],
      tagihan: [ref('t1', 'B1'), ref('t2', 'A9')],
    })
    expect(r.ubah.filter(u => u.koleksi === 'tagihan').map(u => u.ke).sort())
      .toEqual(['101', '209'])
  })

  it('ignores other properties entirely', () => {
    const r = susunRencana(P, {
      ...kosong(),
      kamar: [kamar('k1', 'B1'), kamar('k2', 'B1', 'prop-lain')],
      penghuni: [ref('p1', 'B1'), ref('p2', 'B1', 'prop-lain')],
    })
    expect(r.ubah).toHaveLength(2)
    expect(r.ubah.every(u => u.id === 'k1' || u.id === 'p1')).toBe(true)
  })

  it('skips rooms that were already migrated, so it is safe to re-run', () => {
    const r = susunRencana(P, {
      ...kosong(),
      kamar: [kamar('k1', '101'), kamar('k2', 'A1')],
      tagihan: [ref('t1', '101'), ref('t2', 'A1')],
    })
    expect(r.dilewati).toEqual(['101'])
    expect(r.ubah.map(u => u.ke)).toEqual(['201', '201'])
  })

  it('reports a collision instead of overwriting an existing room', () => {
    const r = susunRencana(P, {
      ...kosong(),
      kamar: [kamar('k1', 'B1'), kamar('k2', '101')],
    })
    expect(r.bentrok).toEqual([{ dari: 'B1', ke: '101' }])
    expect(r.ubah).toHaveLength(0)
  })

  it('flags unrecognised room numbers rather than guessing', () => {
    const r = susunRencana(P, {
      ...kosong(),
      kamar: [kamar('k1', 'E3')],
      penghuni: [ref('p1', 'Kamar Depan')],
    })
    expect(r.ubah).toHaveLength(0)
    expect(r.takDikenal.map(t => t.nomor).sort()).toEqual(['E3', 'Kamar Depan'])
  })

  it('flags a reference to a room that does not exist', () => {
    const r = susunRencana(P, {
      ...kosong(),
      kamar: [kamar('k1', 'B1')],
      tagihan: [ref('t1', 'B9')],     // kamar B9 tidak ada
    })
    expect(r.takDikenal).toEqual([{ koleksi: 'tagihan', id: 't1', nomor: 'B9' }])
  })

  it('plans the full Waru 23 inventory', () => {
    const semua = [
      ...Array.from({ length: 7 }, (_, i) => `B${i + 1}`),
      ...Array.from({ length: 9 }, (_, i) => `A${i + 1}`),
      ...Array.from({ length: 5 }, (_, i) => `C${i + 1}`),
      'D1',
    ]
    const r = susunRencana(P, {
      ...kosong(),
      kamar: semua.map((n, i) => kamar(`k${i}`, n)),
    })
    expect(r.ubah).toHaveLength(22)
    expect(r.bentrok).toHaveLength(0)
    expect(r.takDikenal).toHaveLength(0)
    expect(r.ubah.map(u => u.ke)).toEqual([
      '101', '102', '103', '104', '105', '106', '107',
      '201', '202', '203', '204', '205', '206', '207', '208', '209',
      '301', '302', '303', '304', '305',
      '401',
    ])
  })

  // Skenario pemulihan: migrasi terhenti setelah koleksi kamar tersimpan tapi
  // sebelum referensinya. Menjalankan ulang harus membereskan sisanya.
  it('repairs references left behind by an interrupted run', () => {
    const r = susunRencana(P, {
      ...kosong(),
      kamar: [kamar('k1', '101')],          // sudah terganti
      tagihan: [ref('t1', 'B1')],           // referensi tertinggal
      penghuni: [ref('p1', 'B1')],
    })
    expect(r.takDikenal).toHaveLength(0)
    expect(r.ubah).toHaveLength(2)
    expect(r.ubah.every(u => u.dari === 'B1' && u.ke === '101')).toBe(true)
  })

  it('is a no-op once everything has been migrated', () => {
    const r = susunRencana(P, {
      ...kosong(),
      kamar: [kamar('k1', '101')],
      tagihan: [ref('t1', '101')],
    })
    expect(r.ubah).toHaveLength(0)
    expect(r.takDikenal).toHaveLength(0)
  })

  it('produces an empty plan when there is nothing to do', () => {
    expect(susunRencana(P, kosong()).ubah).toHaveLength(0)
  })
})
