<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useTagihanStore } from '../../stores/tagihan'
import { computed } from 'vue'
import { bulanIni } from '../../utils/date'
import { useProperty } from '../../composables/useProperty'

const router = useRouter()
const route = useRoute()
const tagihan = useTagihanStore()
const { filterByProperty } = useProperty()

const unreadCount = computed(() => {
  const bln = bulanIni()
  return filterByProperty(tagihan.items).filter(t => t.bulan === bln && t.status === 'belum').length
})

const tabs = [
  { name: 'dashboard', icon: '🏡', label: 'Home' },
  { name: 'kamar', icon: '🚪', label: 'Kamar' },
  { name: 'penghuni', icon: '👤', label: 'Penghuni' },
  { name: 'tagihan', icon: '🧾', label: 'Tagihan', badge: true },
  { name: 'laporan', icon: '📈', label: 'Laporan' },
  { name: 'settings', icon: '⚙️', label: 'Setting' },
]

function go(name: string) { router.push({ name }) }
</script>

<template>
  <nav class="bottom-nav">
    <div class="bn-items">
      <div
        v-for="tab in tabs"
        :key="tab.name"
        class="bn-item"
        :class="{ active: route.name === tab.name }"
        @click="go(tab.name)"
      >
        <span v-if="tab.badge && unreadCount > 0" class="bn-bdg" style="display:inline-block">{{ unreadCount }}</span>
        <div class="bni">{{ tab.icon }}</div>
        {{ tab.label }}
      </div>
    </div>
  </nav>
</template>
