<script setup lang="ts">
/* Kerangka satu layar mobile: bilah atas, judul besar, dan area gulir.
 *
 * Judul besar memudar saat digulir dan judul kecil di bilah atas naik
 * menggantikannya. Keduanya dipicu satu ambang yang sama (14px) supaya tidak
 * pernah terlihat dua judul sekaligus.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MobIcon from './MobIcon.vue'

export interface AksiBilah {
  ikon: string
  label: string
  /** Lencana tidak dirender saat nol — nol bukan kabar. */
  lencana?: number
  onKlik?: () => void
}

const props = withDefaults(defineProps<{
  judul: string
  back?: boolean
  aksi?: AksiBilah[]
}>(), { back: false, aksi: () => [] })

const router = useRouter()
const digulir = ref(false)

function onScroll(e: Event) {
  digulir.value = (e.target as HTMLElement).scrollTop > 14
}
</script>

<template>
  <section class="screen">
    <header class="topbar" :class="{ 'is-stuck': digulir }">
      <button v-if="props.back" class="iconbtn" aria-label="Kembali" @click="router.back()">
        <MobIcon name="back" />
      </button>
      <h1 class="tb-title">{{ props.judul }}</h1>
      <button
        v-for="a in props.aksi"
        :key="a.label"
        class="iconbtn"
        :aria-label="a.label"
        @click="a.onKlik?.()"
      >
        <MobIcon :name="a.ikon" />
        <span v-if="a.lencana" class="badge">{{ a.lencana }}</span>
      </button>
    </header>

    <div class="scroll" :class="{ 'is-scrolled': digulir }" @scroll.passive="onScroll">
      <h1 class="bigtitle">{{ props.judul }}</h1>
      <slot />
    </div>

    <slot name="fab" />
  </section>
</template>
