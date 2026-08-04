import { describe, it, expect } from 'vitest'
import { bufferKeBase64url, base64urlKeBuffer, byteAcak } from '../../utils/base64url'

function buf(...bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer
}

describe('base64url', () => {
  it('round-trips arbitrary bytes', () => {
    const asal = new Uint8Array([0, 1, 2, 250, 251, 255, 128, 64])
    const kembali = new Uint8Array(base64urlKeBuffer(bufferKeBase64url(asal.buffer)))
    expect([...kembali]).toEqual([...asal])
  })

  it('round-trips every byte value', () => {
    const asal = new Uint8Array(256).map((_, i) => i)
    const kembali = new Uint8Array(base64urlKeBuffer(bufferKeBase64url(asal.buffer)))
    expect([...kembali]).toEqual([...asal])
  })

  it('produces no characters that need URL escaping', () => {
    // Byte-byte ini menghasilkan '+' dan '/' pada base64 biasa.
    const s = bufferKeBase64url(buf(251, 255, 190, 255))
    expect(s).not.toMatch(/[+/=]/)
  })

  it('round-trips at every padding length', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const asal = new Uint8Array(n).map((_, i) => i * 7 + 1)
      const kembali = new Uint8Array(base64urlKeBuffer(bufferKeBase64url(asal.buffer)))
      expect([...kembali]).toEqual([...asal])
    }
  })

  it('handles an empty buffer', () => {
    expect(bufferKeBase64url(new ArrayBuffer(0))).toBe('')
    expect(base64urlKeBuffer('').byteLength).toBe(0)
  })
})

describe('byteAcak', () => {
  it('returns the requested length', () => {
    expect(byteAcak(32)).toHaveLength(32)
    expect(byteAcak(16)).toHaveLength(16)
  })

  it('does not repeat itself', () => {
    expect([...byteAcak(32)]).not.toEqual([...byteAcak(32)])
  })
})
