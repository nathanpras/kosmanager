import { describe, it, expect } from 'vitest'
import { statusKamar } from '../../utils/statusKamar'
import type { Kamar, Tagihan } from '../../types'

const kamar = (patch: Partial<Kamar> = {}): Kamar => ({
  id: 'k1', nomor: '101', tipe: '', harga: 1_500_000,
  status: 'terisi', property_id: 'p1', ...patch,
})

const tagihan = (patch: Partial<Tagihan> = {}): Tagihan => ({
  id: 't1', penghuni: 'Ani', kamar: '101', bulan: 'September 2026',
  jumlah: 1_500_000, status: 'belum', property_id: 'p1',
  createdAt: '2026-09-01', ...patch,
})

const HARI = '2026-09-20'

describe('statusKamar', () => {
  it('kamar kosong tetap kosong walau ada tagihan nyasar', () => {
    const k = kamar({ status: 'kosong' })
    expect(statusKamar(k, [tagihan()], HARI)).toBe('kosong')
  })

  it('kamar booked tetap booked', () => {
    expect(statusKamar(kamar({ status: 'booked' }), [], HARI)).toBe('booked')
  })

  it('terisi tanpa tagihan bulan ini = belum', () => {
    expect(statusKamar(kamar(), [], HARI)).toBe('belum')
  })

  it('semua tagihan lunas = lunas', () => {
    const ts = [
      tagihan({ id: 'a', status: 'lunas', jumlah_bayar: 1_500_000 }),
      tagihan({ id: 'b', status: 'lunas', jumlah_bayar: 1_500_000 }),
    ]
    expect(statusKamar(kamar(), ts, HARI)).toBe('lunas')
  })

  it('satu telat membuat kamarnya telat, walau yang lain lunas', () => {
    const ts = [
      tagihan({ id: 'a', status: 'lunas', jumlah_bayar: 1_500_000 }),
      tagihan({ id: 'b', status: 'belum', jatuh_tempo: '2026-09-05' }),
    ]
    expect(statusKamar(kamar(), ts, HARI)).toBe('telat')
  })

  it('telat menang atas kurang bayar — yang paling mendesak yang tampil', () => {
    const ts = [
      tagihan({ id: 'a', status: 'belum', jumlah_bayar: 500_000 }),
      tagihan({ id: 'b', status: 'belum', jatuh_tempo: '2026-09-05' }),
    ]
    expect(statusKamar(kamar(), ts, HARI)).toBe('telat')
  })

  it('kurang bayar dianggap belum, bukan lunas', () => {
    const ts = [tagihan({ jumlah_bayar: 500_000 })]
    expect(statusKamar(kamar(), ts, HARI)).toBe('belum')
  })

  it('jatuh tempo yang belum lewat belum dihitung telat', () => {
    const ts = [tagihan({ jatuh_tempo: '2026-09-25' })]
    expect(statusKamar(kamar(), ts, HARI)).toBe('belum')
  })

  it('tagihan yang hangus tidak ikut menentukan status', () => {
    /* Hangus = sudah dibayar di muka tapi penghuninya keluar duluan.
       Menagihnya lagi lewat chip status akan menyesatkan. */
    const ts = [
      tagihan({ id: 'a', status: 'lunas', jumlah_bayar: 1_500_000 }),
      tagihan({ id: 'b', status: 'belum', jatuh_tempo: '2026-09-01', hangus: true }),
    ]
    expect(statusKamar(kamar(), ts, HARI)).toBe('lunas')
  })

  it('kamar terisi yang semua tagihannya hangus dianggap belum, bukan lunas', () => {
    const ts = [tagihan({ status: 'belum', hangus: true })]
    expect(statusKamar(kamar(), ts, HARI)).toBe('belum')
  })
})
