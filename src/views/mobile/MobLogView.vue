<script setup lang="ts">
/* Riwayat aktivitas aplikasi. Baca saja — log memang hanya untuk ditengok. */
import { computed } from 'vue'
import MobScreen from '../../components/mobile/MobScreen.vue'
import { useLogStore } from '../../stores/log'
import { usePropertiesStore } from '../../stores/properties'
import { fmtTime } from '../../utils/format'

const log = useLogStore()
const properties = usePropertiesStore()

/* Warna log mengikuti kosakata desktop (green/red/amber/blue); dipetakan ke
   nada shell mobile supaya tidak ada palet kedua. */
const NADA: Record<string, string> = {
  green: 'pos', red: 'neg', amber: 'due', blue: '',
}

const daftar = computed(() =>
  log.items.slice().sort((a, b) => (b.ts ?? '').localeCompare(a.ts ?? '')))

function namaProperti(id: string): string {
  return properties.items.find(p => p.id === id)?.nama ?? ''
}
</script>

<template>
  <MobScreen judul="Riwayat" back>
    <div class="sechead"><h2>Aktivitas</h2><span class="count">{{ daftar.length }}</span></div>

    <div v-if="daftar.length" class="card flush divide stagger">
      <div v-for="l in daftar" :key="l.id" class="lrow">
        <span class="av sm" :class="NADA[l.color] ?? ''"></span>
        <span class="lrow-body">
          <span class="lrow-title" style="font-size:14.5px">{{ l.text }}</span>
          <span class="lrow-sub">{{ fmtTime(l.ts) }}</span>
          <span v-if="namaProperti(l.property_id)" class="lrow-sub">
            {{ namaProperti(l.property_id) }}
          </span>
        </span>
      </div>
    </div>

    <div v-else class="card emptystate">
      <h3>Belum ada aktivitas</h3>
      <p>Pencatatan muncul di sini setiap kali ada perubahan data.</p>
    </div>
  </MobScreen>
</template>
