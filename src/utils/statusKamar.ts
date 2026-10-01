import { today } from './date'
import { statusTagihan } from './statusTagihan'
import type { Kamar, Tagihan } from '../types'

/**
 * Status yang ditampilkan pada kartu kamar di shell mobile.
 *
 * Aplikasi memisahkan dua hal yang di mockup tampak satu: `Kamar.status`
 * (kosong / terisi / telat / booked) soal hunian, dan `Tagihan.status` soal
 * uang. Kartu kamar harus menunjukkan keduanya dalam satu chip, jadi di sinilah
 * keduanya digabung — satu tempat, bukan tersebar di tiap layar.
 */
export type StatusKamarTampil = 'lunas' | 'belum' | 'telat' | 'kosong' | 'booked'

/**
 * @param kamar       kamar yang dinilai
 * @param tagihanBulan tagihan kamar itu untuk SATU bulan yang sedang dilihat
 * @param per         tanggal acuan untuk menilai telat
 */
export function statusKamar(
  kamar: Kamar,
  tagihanBulan: Tagihan[],
  per = today(),
): StatusKamarTampil {
  /* Hunian menang lebih dulu: kamar kosong atau booked tidak punya cerita uang
     yang perlu ditampilkan, dan tagihan nyasar tidak boleh mengubahnya. */
  if (kamar.status === 'kosong') return 'kosong'
  if (kamar.status === 'booked') return 'booked'

  /* Hangus = sudah dibayar di muka tapi penghuninya keluar duluan. Menagihnya
     lagi lewat chip status akan menyesatkan, jadi tidak ikut dinilai. */
  const berlaku = tagihanBulan.filter(t => !t.hangus)
  if (!berlaku.length) return 'belum'

  const hasil = berlaku.map(t => statusTagihan(t, per))

  /* Yang paling mendesak yang tampil. Satu tagihan telat membuat kamarnya
     telat walau tagihan lain sudah lunas — kabar buruk tidak boleh tenggelam. */
  if (hasil.some(h => h.status === 'telat' || h.telat)) return 'telat'
  if (hasil.every(h => h.status === 'lunas')) return 'lunas'
  return 'belum'
}
