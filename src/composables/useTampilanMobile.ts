/**
 * Apakah layar sempit dibawa ke shell mobile.
 *
 * Bawaan: ya. Tapi sekali orang menekan "kembali ke tampilan lama", pilihan itu
 * diingat dan ia tidak dibawa ke sana lagi — tampilan bawaan yang tidak bisa
 * ditinggalkan adalah jebakan, bukan bawaan.
 *
 * Pilihannya disimpan di localStorage, per perangkat. Itu memang tepat: yang
 * dipilih adalah bentuk tampilan di layar ini, bukan pengaturan akun.
 * localStorage bisa dilarang (mode privat, situs diblokir), jadi setiap akses
 * dibungkus try/catch dan kegagalannya berarti "pakai bawaan" — bukan error.
 */
const KUNCI = 'kosmanager:tampilan'

export type Tampilan = 'mobile' | 'lama'

export const LEBAR_SEMPIT = 768

function baca(): Tampilan | null {
  try {
    const v = localStorage.getItem(KUNCI)
    return v === 'mobile' || v === 'lama' ? v : null
  } catch {
    return null
  }
}

function tulis(v: Tampilan): void {
  try {
    localStorage.setItem(KUNCI, v)
  } catch {
    /* Tidak bisa diingat bukan alasan untuk gagal; cuma tidak diingat. */
  }
}

export function useTampilanMobile() {
  const layarSempit = (): boolean => {
    try {
      return window.matchMedia(`(max-width: ${LEBAR_SEMPIT}px)`).matches
    } catch {
      return false
    }
  }

  /** Pilihan tersimpan, atau null bila belum pernah memilih. */
  const pilihan = (): Tampilan | null => baca()

  /**
   * Haruskah pembukaan aplikasi dialihkan ke shell mobile?
   * Hanya bila layarnya sempit DAN orangnya belum pernah memilih keluar.
   */
  function perluAlihkan(): boolean {
    return layarSempit() && baca() !== 'lama'
  }

  const pilihMobile = () => tulis('mobile')
  const pilihLama = () => tulis('lama')

  return { layarSempit, pilihan, perluAlihkan, pilihMobile, pilihLama }
}
