import { onMounted, onUnmounted } from 'vue'

// Gerakan toolbar browser saat scroll juga mengecilkan visual viewport, tapi hanya
// beberapa puluh piksel. Ambang ini memisahkannya dari keyboard yang sesungguhnya.
const KEYBOARD_THRESHOLD = 80

/**
 * Menjaga bottom sheet tetap terlihat saat keyboard virtual terbuka.
 *
 * `interactive-widget=resizes-content` di meta viewport sudah menangani Chrome
 * Android, tapi iOS Safari belum mendukungnya: di sana keyboard menutupi layout
 * viewport tanpa mengubah `dvh`, sehingga footer modal berakhir di belakang
 * keyboard. Composable ini menulis dua custom property ke <html> yang dipakai
 * `.overlay`, `.modal`, dan `.modal-foot` di style.css.
 *
 * --kb  berapa piksel keyboard menutupi layout viewport
 * --sab inset home indicator, dipaksa 0 selama keyboard terbuka karena
 *       indicator berada di belakang keyboard
 */
export function useViewportInsets() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : undefined

  function sync() {
    if (!vv) return
    const overlap = window.innerHeight - (vv.height + vv.offsetTop)
    const kb = overlap > KEYBOARD_THRESHOLD ? Math.round(overlap) : 0
    const root = document.documentElement

    root.style.setProperty('--kb', `${kb}px`)
    if (kb > 0) {
      root.style.setProperty('--sab', '0px')
    } else {
      // Dikosongkan, bukan diisi ulang: JS tidak bisa membaca env(), jadi nilai
      // asli dikembalikan dengan melepas override inline dan membiarkan :root menang.
      root.style.removeProperty('--sab')
    }
  }

  onMounted(() => {
    if (!vv) return
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    sync()
  })

  onUnmounted(() => {
    if (!vv) return
    vv.removeEventListener('resize', sync)
    vv.removeEventListener('scroll', sync)
    document.documentElement.style.removeProperty('--kb')
    document.documentElement.style.removeProperty('--sab')
  })
}
