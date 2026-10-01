import { describe, it, expect } from 'vitest'
import { lamaHuni } from '../../utils/lamaHuni'

describe('lamaHuni', () => {
  it('belum mulai bila tanggal masuknya masih di depan', () => {
    expect(lamaHuni('2026-10-01', '2026-09-20')).toBe('Belum mulai')
  })

  it('hari pertama dihitung nol hari, bukan satu', () => {
    /* Masuk hari ini berarti belum menghuni sehari pun. */
    expect(lamaHuni('2026-09-20', '2026-09-20')).toBe('0 hari')
  })

  it('kurang dari sepekan disebut dalam hari', () => {
    expect(lamaHuni('2026-09-15', '2026-09-20')).toBe('5 hari')
  })

  it('di bawah sebulan disebut dalam minggu dan hari', () => {
    expect(lamaHuni('2026-09-01', '2026-09-20')).toBe('2 minggu 5 hari')
  })

  it('minggu bulat tidak menyebut sisa hari', () => {
    expect(lamaHuni('2026-09-06', '2026-09-20')).toBe('2 minggu')
  })

  it('sebulan lebih disebut dalam bulan', () => {
    expect(lamaHuni('2026-07-20', '2026-09-20')).toBe('2 bulan')
  })

  it('bulan dengan sisa hari menyebut keduanya', () => {
    expect(lamaHuni('2026-07-10', '2026-09-20')).toBe('2 bulan 10 hari')
  })

  it('belum genap sebulan sejak tanggal yang sama tidak dibulatkan naik', () => {
    /* 20 Agustus ke 19 September belum genap sebulan. */
    expect(lamaHuni('2026-08-20', '2026-09-19')).toBe('4 minggu 2 hari')
  })

  it('melintasi tahun dihitung benar', () => {
    expect(lamaHuni('2025-09-20', '2026-09-20')).toBe('12 bulan')
  })

  it('akhir bulan pendek tidak melompat', () => {
    /* 31 Januari + 1 bulan jatuh di Februari yang tidak punya tanggal 31;
       yang dihitung tetap selisih bulannya, bukan hasil lompatan Date. */
    expect(lamaHuni('2026-01-31', '2026-02-28')).toBe('4 minggu')
  })

  it('tanggal kosong tidak melempar, hanya tak diketahui', () => {
    expect(lamaHuni('', '2026-09-20')).toBe('–')
  })
})
