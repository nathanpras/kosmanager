<script setup lang="ts">
import { computed } from 'vue'
import { useLogStore }   from '../stores/log'
import { useProperty }   from '../composables/useProperty'
import { fmtTime }       from '../utils/format'

const log = useLogStore()
const { filterByProperty } = useProperty()

const filtered = computed(() => filterByProperty(log.items))
</script>

<template>
  <div class="card">
    <div v-if="filtered.length === 0" class="empty-state">
      <div class="ei">📝</div><p>Belum ada riwayat aktivitas</p>
    </div>
    <div v-for="entry in filtered" :key="entry.id" class="log-item">
      <div class="log-dot" :class="entry.color"></div>
      <div>
        <div class="log-text">{{ entry.text }}</div>
        <div class="log-time">{{ fmtTime(entry.ts) }}</div>
      </div>
    </div>
  </div>
</template>
