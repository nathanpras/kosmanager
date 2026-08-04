import { ref } from 'vue'
import { bufferKeBase64url, base64urlKeBuffer, byteAcak } from '../utils/base64url'

const KUNCI_SIMPAN = 'kosmanager.biometrik.credentialId'

/**
 * Buka aplikasi dengan Face ID / sidik jari, menggantikan ketik PIN.
 *
 * PENTING — ini **gerbang kenyamanan, bukan lapisan keamanan.**
 * Tidak ada server yang memverifikasi tanda tangan WebAuthn di sini: challenge
 * dibuat di browser dan hasilnya hanya dicek "berhasil atau tidak". Siapa pun
 * yang bisa membuka URL aplikasi tetap bisa membaca data, persis seperti dengan
 * PIN sekarang — PIN pun disimpan di Firestore dan dibandingkan di sisi klien.
 * Yang berubah hanyalah pemilik tidak perlu mengetik 6 digit lagi.
 *
 * Keamanan sesungguhnya butuh Firebase Auth plus aturan Firestore, dan itu
 * pekerjaan tersendiri di luar paket ini.
 *
 * Credential id disimpan di localStorage, bukan Firestore: kredensial WebAuthn
 * terikat pada perangkat, jadi menyimpannya di server tidak ada gunanya.
 */
export function useBiometrik() {
  const sedangProses = ref(false)

  /** Perangkat punya autentikator bawaan (Face ID, Touch ID, sidik jari)? */
  async function didukung(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    if (!window.PublicKeyCredential) return false
    // WebAuthn hanya jalan di secure context (HTTPS atau localhost).
    if (!window.isSecureContext) return false
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    } catch {
      return false
    }
  }

  function terdaftar(): boolean {
    return !!localStorage.getItem(KUNCI_SIMPAN)
  }

  function lupakan() {
    localStorage.removeItem(KUNCI_SIMPAN)
  }

  /** Mendaftarkan biometrik perangkat ini. Mengembalikan true bila berhasil. */
  async function daftar(namaPemilik = 'Pemilik Kos'): Promise<boolean> {
    if (!(await didukung())) return false
    sedangProses.value = true
    try {
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: byteAcak(32),
          rp: { name: 'KosManager' },
          user: { id: byteAcak(16), name: namaPemilik, displayName: namaPemilik },
          // -7 = ES256, -257 = RS256. Dua ini cukup untuk semua platform arus utama.
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',   // biometrik bawaan, bukan kunci USB
            userVerification: 'required',          // wajib wajah/sidik jari, bukan sekadar tap
            residentKey: 'preferred',
          },
          timeout: 60_000,
        },
      })) as PublicKeyCredential | null

      if (!cred) return false
      localStorage.setItem(KUNCI_SIMPAN, bufferKeBase64url(cred.rawId))
      return true
    } catch {
      return false
    } finally {
      sedangProses.value = false
    }
  }

  /** Meminta verifikasi biometrik. True bila pengguna lolos. */
  async function buka(): Promise<boolean> {
    const id = localStorage.getItem(KUNCI_SIMPAN)
    if (!id) return false
    sedangProses.value = true
    try {
      const hasil = await navigator.credentials.get({
        publicKey: {
          challenge: byteAcak(32),
          allowCredentials: [{ type: 'public-key', id: base64urlKeBuffer(id) }],
          userVerification: 'required',
          timeout: 60_000,
        },
      })
      return !!hasil
    } catch {
      // Dibatalkan, gagal, atau kredensial sudah tidak ada di perangkat.
      return false
    } finally {
      sedangProses.value = false
    }
  }

  return { didukung, terdaftar, daftar, buka, lupakan, sedangProses }
}
