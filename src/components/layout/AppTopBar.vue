<script setup lang="ts">
import { useRoute } from 'vue-router'
import { usePropertiesStore } from '../../stores/properties'
import { useAppStore } from '../../stores/app'
import { computed } from 'vue'
import { MONTHS_FULL } from '../../utils/format'

const route = useRoute()
const props = usePropertiesStore()
const app = useAppStore()

const pageTitle = computed(() => {
  const map: Record<string, string> = {
    dashboard: 'Dashboard', kamar: 'Manajemen Kamar',
    penghuni: 'Data Penghuni', tagihan: 'Tagihan & Pembayaran',
    pengeluaran: 'Pengeluaran', laporan: 'Laporan Keuangan',
    maintenance: 'Maintenance', log: 'Riwayat Aktivitas',
    settings: 'Pengaturan Kos',
  }
  return map[route.name as string] ?? 'KosManager'
})

const dateStr = computed(() => {
  const d = new Date()
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
  return `${days[d.getDay()]}, ${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
})

function switchProperty(e: Event) {
  app.setProperty((e.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="topbar">
    <div>
      <div class="page-title">{{ pageTitle }}</div>
      <div class="date-pill">{{ dateStr }}</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;justify-content:flex-end">
      <select id="property-selector" :value="app.currentPropertyId" @change="switchProperty">
        <option value="all">📍 Semua Properti</option>
        <option v-for="p in props.items" :key="p.id" :value="p.id">{{ p.nama }}</option>
      </select>
      <button id="dm-btn" @click="app.toggleDark()" style="background:none;border:1px solid var(--border2);border-radius:var(--r);width:36px;height:36px;flex-shrink:0;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:var(--text2)">
        {{ app.isDark ? '☀️' : '🌙' }}
      </button>
    </div>
  </div>
</template>
