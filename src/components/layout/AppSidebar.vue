<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useTagihanStore } from '../../stores/tagihan'
import { computed } from 'vue'
import { bulanIni } from '../../utils/date'
import { useProperty } from '../../composables/useProperty'
import AppIcon from '../shared/AppIcon.vue'

defineEmits<{ changePin: [] }>()

const router = useRouter()
const route = useRoute()
const tagihan = useTagihanStore()
const { filterByProperty } = useProperty()

const unreadCount = computed(() => {
  const bln = bulanIni()
  return filterByProperty(tagihan.items).filter(t => t.bulan === bln && t.status === 'belum').length
})

const navItems = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'kamar', label: 'Kamar' },
  { name: 'penghuni', label: 'Penghuni' },
  { name: 'tagihan', label: 'Tagihan', badge: true },
  { name: 'pengeluaran', label: 'Pengeluaran' },
  { name: 'laporan', label: 'Laporan' },
  { name: 'maintenance', label: 'Maintenance' },
  { name: 'log', label: 'Riwayat' },
  { name: 'settings', label: 'Pengaturan' },
]

function go(name: string) { router.push({ name }) }
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-top">
      <div class="brand">
        <div class="brand-icon">🏡</div>Kos<em>Manager</em>
      </div>
    </div>
    <nav class="nav">
      <div class="nav-sec">Menu Utama</div>
      <div
        v-for="item in navItems"
        :key="item.name"
        class="nav-item"
        :class="{ active: route.name === item.name }"
        role="button"
        tabindex="0"
        :aria-current="route.name === item.name ? 'page' : undefined"
        @click="go(item.name)"
        @keydown.enter.prevent="go(item.name)"
        @keydown.space.prevent="go(item.name)"
      >
        <div class="ni"><AppIcon :name="item.name" :size="18" /></div>
        {{ item.label }}
        <span v-if="item.badge && unreadCount > 0" class="nav-badge" style="display:inline-block">{{ unreadCount }}</span>
      </div>
    </nav>
    <div class="sidebar-bot">
      <div><span class="sync-dot"></span><span class="sync-txt">Firebase · Firestore</span></div>
      <button class="reset-btn" style="background:var(--blue2);color:var(--blue);border-color:#B5C8F5;margin-bottom:6px" @click="$emit('changePin')">🔐 Ganti PIN</button>
    </div>
  </aside>
</template>
