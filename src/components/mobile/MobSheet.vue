<script setup lang="ts">
/* Bottom sheet shell mobile.
 *
 * Bisa ditutup dengan tiga cara, dan ketiganya harus ada: mengetuk latar
 * gelap, menekan Escape, dan menariknya turun. Sheet yang hanya bisa ditutup
 * lewat tombol terasa terkunci di layar sentuh.
 *
 * Menarik ke atas dilawan dengan akar pangkat — gerakannya tetap mengikuti
 * jari tapi jelas menolak, alih-alih diam saja seperti elemen mati.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  judul: string
  sub?: string
}>(), { sub: '' })

const emit = defineEmits<{ tutup: [] }>()

const sheet = ref<HTMLElement | null>(null)
const menutup = ref(false)

/** Satu jalur keluar, supaya animasi penutup tidak pernah dijalankan dua kali. */
function tutup() {
  if (menutup.value) return
  menutup.value = true
  emit('tutup')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') tutup()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/* ── Tarik turun ── */
let y0 = 0
let dy = 0
let t0 = 0
let aktif = false

function tinggi(): number {
  return sheet.value?.getBoundingClientRect().height ?? 0
}

function mulai(e: PointerEvent) {
  if (!(e.target as HTMLElement).closest('[data-drag]')) return
  aktif = true; y0 = e.clientY; dy = 0; t0 = performance.now()
  sheet.value?.classList.add('is-dragging')
  sheet.value?.setPointerCapture(e.pointerId)
}

function gerak(e: PointerEvent) {
  if (!aktif || !sheet.value) return
  dy = e.clientY - y0
  const geser = dy < 0 ? -Math.pow(-dy, 0.58) : dy
  sheet.value.style.transform = `translateY(${geser}px)`
}

function lepas() {
  if (!aktif || !sheet.value) return
  aktif = false
  sheet.value.classList.remove('is-dragging')
  const kecepatan = dy / Math.max(1, performance.now() - t0)
  /* Ditutup bila sudah ditarik lebih dari seperempat tingginya, atau bila
     lemparannya cepat — jari yang cepat jelas bermaksud menutup walau jauhnya
     belum seberapa. */
  if (dy > tinggi() * 0.26 || kecepatan > 0.5) {
    tutup()
  } else {
    sheet.value.classList.add('is-settling')
    sheet.value.style.transform = 'translateY(0)'
    setTimeout(() => sheet.value?.classList.remove('is-settling'), 440)
  }
}
</script>

<template>
  <div class="scrim" @click="tutup"></div>
  <div
    ref="sheet"
    class="sheet"
    role="dialog"
    :aria-label="props.judul"
    @pointerdown="mulai"
    @pointermove="gerak"
    @pointerup="lepas"
    @pointercancel="lepas"
  >
    <div class="sheet-grab" data-drag></div>
    <div class="sheet-head" data-drag>
      <div class="sheet-title">{{ props.judul }}</div>
      <div v-if="props.sub" class="sheet-sub">{{ props.sub }}</div>
    </div>
    <div class="sheet-body"><slot /></div>
    <div v-if="$slots.kaki" class="sheet-foot"><slot name="kaki" /></div>
  </div>
</template>
