<script setup lang="ts">
/* Shell mobile bergaya Kamaru.
 *
 * Akar `.kmob` adalah syarat, bukan hiasan: seluruh aturan di
 * src/style.mobile.css diawali `.kmob`, supaya menang atas src/style.css tanpa
 * bergantung pada lapisan CSS, dan supaya tampilan desktop tidak tersentuh.
 * Melepas class itu berarti melucuti seluruh gaya shell ini.
 *
 * Tiga tab bawah mengikuti keputusan yang sudah dikunci di kontrak desain
 * 27 September: Properti / Kalender / Penghuni. Tagihan sengaja bukan tab —
 * ia dicapai lewat chip di beranda dan chip status di kartu kamar.
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobIcon from './MobIcon.vue'

const route  = useRoute()
const router = useRouter()

const TABS = [
  { nama: 'm-properti', ikon: 'door',  label: 'Properti' },
  { nama: 'm-kalender', ikon: 'cal',   label: 'Kalender' },
  { nama: 'm-penghuni', ikon: 'users', label: 'Penghuni' },
] as const

/* Dok hanya tampil di layar tab. Begitu masuk drill-down ia turun, supaya
 * layar detail memakai seluruh tinggi — persis perilaku mockup. */
const diTab = computed(() => TABS.some(t => t.nama === route.name))

function ke(nama: string) {
  if (route.name !== nama) router.push({ name: nama })
}
</script>

<template>
  <div class="kmob">
    <div class="stack">
      <RouterView />
    </div>

    <nav class="dock" :class="{ 'is-hidden': !diTab }" aria-label="Navigasi utama">
      <button
        v-for="t in TABS"
        :key="t.nama"
        class="tabitem"
        :class="{ 'is-on': route.name === t.nama }"
        :aria-current="route.name === t.nama ? 'page' : undefined"
        @click="ke(t.nama)"
      >
        <span class="tabicon"><MobIcon :name="t.ikon" :size="21" /></span>
        {{ t.label }}
      </button>
    </nav>
  </div>
</template>
