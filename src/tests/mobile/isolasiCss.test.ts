import { describe, it, expect } from 'vitest'

/* Dibaca langsung dari disk, bukan lewat impor.
 *
 * Vitest sengaja tidak memproses CSS (`css: false` bawaan), jadi `?raw` dan
 * `?inline` sama-sama mengembalikan string kosong — dan uji ini justru tentang
 * TEKS berkasnya. Asersi "lebih dari nol" di bawah yang menangkapnya; tanpa
 * itu, uji ini akan lulus dengan gembira atas berkas kosong.
 *
 * node: tidak diketik di tsconfig.app.json (`types: ["vite/client"]`), dan
 * menambahkan tipe Node di sana akan melonggarkan pengecekan untuk SELURUH
 * kode aplikasi. Jadi pelonggarannya dikurung di dua baris ini saja. */
// @ts-expect-error — modul Node tidak diketik di tsconfig aplikasi
import { readFileSync } from 'node:fs'
// @ts-expect-error — idem
import { fileURLToPath } from 'node:url'

function bacaDariSrc(nama: string): string {
  const diriKu = String(fileURLToPath(import.meta.url))
  const akarSrc = diriKu.slice(0, diriKu.lastIndexOf('/src/') + 5)
  return String(readFileSync(akarSrc + nama, 'utf8'))
}

const mobile = bacaDariSrc('style.mobile.css')
const desktop = bacaDariSrc('style.css')

/**
 * Tahap 1 port shell mobile menaruh seluruh gayanya di src/style.mobile.css,
 * dimuat global dari main.ts. Yang menjaga tampilan desktop tetap utuh hanya
 * satu hal: setiap aturan di sana wajib punya leluhur `.kmob`.
 *
 * Uji ini menegakkan syarat itu. Tanpanya, satu selektor yang lupa diberi
 * awalan akan mengubah desktop tanpa suara — dan `.card`, `.btn`, `.topbar`,
 * `.toast`, serta `.badge` memang ada di kedua stylesheet.
 */

/** Buang komentar supaya isinya tidak terbaca sebagai selektor. */
const bersih = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Telusuri blok tingkat atas, masuk ke dalam @media, lewati @keyframes. */
function selektorTingkatAtas(css: string): string[] {
  const keluar: string[] = []
  const jalan = (teks: string) => {
    let i = 0
    while (i < teks.length) {
      const buka = teks.indexOf('{', i)
      if (buka < 0) break
      const sel = teks.slice(i, buka).trim()
      let j = buka + 1
      let dalam = 1
      while (j < teks.length && dalam > 0) {
        if (teks[j] === '{') dalam++
        else if (teks[j] === '}') dalam--
        j++
      }
      const isi = teks.slice(buka + 1, j - 1)
      if (sel.startsWith('@keyframes')) {
        /* Isi keyframes bukan selektor; namanya diuji terpisah. */
      } else if (sel.startsWith('@media') || sel.startsWith('@supports')) {
        jalan(isi)
      } else if (sel) {
        for (const satu of sel.split(',')) {
          const s = satu.trim()
          if (s) keluar.push(s)
        }
      }
      i = j
    }
  }
  jalan(teks(css))
  return keluar
}

const teks = (s: string) => bersih(s)

describe('isolasi CSS shell mobile', () => {
  it('kedua stylesheet benar-benar terbaca', () => {
    expect(mobile.length).toBeGreaterThan(5000)
    expect(desktop.length).toBeGreaterThan(5000)
  })

  it('setiap selektor berawalan .kmob', () => {
    const bocor = selektorTingkatAtas(mobile).filter(s => !s.startsWith('.kmob'))
    expect(bocor).toEqual([])
  })

  it('tidak mendefinisikan apa pun di :root, html, atau body', () => {
    const t = bersih(mobile)
    expect(/(^|[}\s]):root\s*[,{]/.test(t)).toBe(false)
    expect(/(^|[}\s])html\s*[,{]/.test(t)).toBe(false)
    expect(/(^|[}\s])body\s*[,{]/.test(t)).toBe(false)
  })

  it('nama @keyframes tidak bentrok dengan stylesheet desktop', () => {
    const nama = (css: string) =>
      new Set([...bersih(css).matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]))
    const mob = nama(mobile)
    const desk = nama(desktop)
    const bentrok = [...mob].filter(n => desk.has(n))
    expect(bentrok).toEqual([])
    /* Nama keyframes bersifat global: yang terakhir didefinisikan menang untuk
       kedua stylesheet. modalIn, sheetUp, dan toastIn pernah ada di keduanya. */
    expect(mob.size).toBeGreaterThan(0)
    for (const n of mob) expect(n.startsWith('kmob-')).toBe(true)
  })

  it('setiap animasi yang dirujuk punya definisinya', () => {
    const t = bersih(mobile)
    const ada = new Set([...t.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]))
    const dirujuk = new Set<string>()
    for (const m of t.matchAll(/animation(?:-name)?\s*:([^;}]*)/g)) {
      for (const n of m[1].match(/\bkmob-[\w-]+/g) ?? []) dirujuk.add(n)
    }
    expect([...dirujuk].filter(n => !ada.has(n))).toEqual([])
    expect(dirujuk.size).toBeGreaterThan(0)
  })

  it('src/style.css tidak ikut berubah oleh port', () => {
    /* Penjaga kasar tapi cukup: desktop tidak boleh tahu-menahu soal .kmob. */
    expect(desktop.includes('.kmob')).toBe(false)
  })
})
