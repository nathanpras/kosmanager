/**
 * Konversi base64url ↔ ArrayBuffer untuk WebAuthn.
 *
 * WebAuthn bekerja dengan ArrayBuffer, sedangkan localStorage hanya menyimpan
 * teks. base64url dipakai (bukan base64 biasa) karena aman dipakai di URL dan
 * tidak mengandung karakter `+`, `/`, atau `=`.
 */
export function bufferKeBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Buffer dialokasikan lewat `new ArrayBuffer` agar tipenya `Uint8Array<ArrayBuffer>`,
// bukan `Uint8Array<ArrayBufferLike>` — WebAuthn menuntut BufferSource yang
// tidak mungkin berupa SharedArrayBuffer.
export function base64urlKeBuffer(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  // btoa/atob menuntut panjang kelipatan 4; padding dibuang saat encode.
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const buf = new ArrayBuffer(bin.length)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return buf
}

/** Byte acak — dipakai sebagai challenge dan user id. */
export function byteAcak(n: number): Uint8Array<ArrayBuffer> {
  const a = new Uint8Array(new ArrayBuffer(n))
  crypto.getRandomValues(a)
  return a
}
