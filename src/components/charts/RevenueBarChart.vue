<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { useAppStore } from '../../stores/app'

const props = defineProps<{
  labels: string[]
  values: number[]
}>()

const app = useAppStore()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    label: 'Pemasukan (Rp)',
    data: props.values,
    backgroundColor: 'rgba(13,155,110,0.7)',
    borderColor: '#0D9B6E',
    borderWidth: 1,
    borderRadius: 6,
  }],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { raw: unknown }) => `Rp ${Number(ctx.raw).toLocaleString('id-ID')}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: app.isDark ? '#9B99A6' : '#65636B' },
      grid: { color: app.isDark ? '#2E2E32' : '#E0DDD8' },
    },
    y: {
      ticks: {
        color: app.isDark ? '#9B99A6' : '#65636B',
        callback: (v: number | string) => `Rp ${Number(v).toLocaleString('id-ID')}`,
      },
      grid: { color: app.isDark ? '#2E2E32' : '#E0DDD8' },
    },
  },
}))
</script>

<template>
  <div style="position:relative;height:220px;padding:0 12px 12px">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
