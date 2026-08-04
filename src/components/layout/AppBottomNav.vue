<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useTagihanStore } from '../../stores/tagihan'
import { computed } from 'vue'
import { bulanIni } from '../../utils/date'
import { useProperty } from '../../composables/useProperty'
import AppIcon from '../shared/AppIcon.vue'

const router = useRouter()
const route = useRoute()
const tagihan = useTagihanStore()
const { filterByProperty } = useProperty()

const unreadCount = computed(() => {
  const bln = bulanIni()
  return filterByProperty(tagihan.items).filter(t => t.bulan === bln && t.status === 'belum').length
})

const tabs = [
  { name: 'dashboard', label: 'Home' },
  { name: 'kamar', label: 'Kamar' },
  { name: 'penghuni', label: 'Penghuni' },
  { name: 'tagihan', label: 'Tagihan', badge: true },
  { name: 'laporan', label: 'Laporan' },
  { name: 'settings', label: 'Setting' },
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
        role="button"
        tabindex="0"
        :aria-current="route.name === tab.name ? 'page' : undefined"
        @click="go(tab.name)"
        @keydown.enter.prevent="go(tab.name)"
        @keydown.space.prevent="go(tab.name)"
      >
        <span v-if="tab.badge && unreadCount > 0" class="bn-bdg" style="display:inline-block">{{ unreadCount }}</span>
        <div class="bni"><AppIcon :name="tab.name" :size="21" /></div>
        {{ tab.label }}
      </div>
    </div>
  </nav>
</template>
