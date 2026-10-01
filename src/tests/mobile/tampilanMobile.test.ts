import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTampilanMobile, LEBAR_SEMPIT } from '../../composables/useTampilanMobile'

/**
 * Tahap 6: layar sempit dibawa ke shell mobile secara bawaan.
 *
 * Yang dikunci di sini bukan pengalihannya, melainkan jalan keluarnya: sekali
 * seseorang memilih kembali ke tampilan lama, ia tidak boleh dibawa ke sana
 * lagi. Tampilan bawaan yang tidak bisa ditinggalkan adalah jebakan.
 */

function paksaLebar(lebar: number) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes(`${LEBAR_SEMPIT}px`) ? lebar <= LEBAR_SEMPIT : false,
  }))
}

beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('useTampilanMobile', () => {
  it('layar sempit dialihkan saat belum pernah memilih', () => {
    paksaLebar(390)
    expect(useTampilanMobile().perluAlihkan()).toBe(true)
  })

  it('layar lebar tidak pernah dialihkan', () => {
    paksaLebar(1400)
    expect(useTampilanMobile().perluAlihkan()).toBe(false)
  })

  it('tepat di ambang masih dianggap sempit', () => {
    paksaLebar(LEBAR_SEMPIT)
    expect(useTampilanMobile().perluAlihkan()).toBe(true)
  })

  it('memilih tampilan lama diingat dan menghentikan pengalihan', () => {
    paksaLebar(390)
    const t = useTampilanMobile()
    t.pilihLama()
    expect(t.perluAlihkan()).toBe(false)
    /* Dibaca ulang dari penyimpanan, bukan dari memori pemanggil */
    expect(useTampilanMobile().pilihan()).toBe('lama')
  })

  it('memilih mobile lagi mengembalikan pengalihan', () => {
    paksaLebar(390)
    const t = useTampilanMobile()
    t.pilihLama()
    expect(t.perluAlihkan()).toBe(false)
    t.pilihMobile()
    expect(t.perluAlihkan()).toBe(true)
  })

  it('nilai asing di penyimpanan diabaikan, bukan dipercaya', () => {
    paksaLebar(390)
    localStorage.setItem('kosmanager:tampilan', 'entah')
    expect(useTampilanMobile().pilihan()).toBeNull()
    expect(useTampilanMobile().perluAlihkan()).toBe(true)
  })

  it('penyimpanan yang dilarang tidak membuat apa pun melempar', () => {
    paksaLebar(390)
    const asliGet = Storage.prototype.getItem
    const asliSet = Storage.prototype.setItem
    Storage.prototype.getItem = () => { throw new Error('diblokir') }
    Storage.prototype.setItem = () => { throw new Error('diblokir') }
    try {
      const t = useTampilanMobile()
      expect(() => t.pilihLama()).not.toThrow()
      /* Tidak bisa diingat berarti kembali ke bawaan, bukan error. */
      expect(t.perluAlihkan()).toBe(true)
      expect(t.pilihan()).toBeNull()
    } finally {
      Storage.prototype.getItem = asliGet
      Storage.prototype.setItem = asliSet
    }
  })

  it('matchMedia yang tidak tersedia dianggap layar lebar', () => {
    vi.stubGlobal('matchMedia', () => { throw new Error('tidak ada') })
    expect(useTampilanMobile().perluAlihkan()).toBe(false)
  })
})
