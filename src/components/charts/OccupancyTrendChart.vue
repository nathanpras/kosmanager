<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { useAppStore } from '../../stores/app'

const props = defineProps<{
  labels: string[]
  values: number[]
}>()

const app = useAppStore()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    label: 'Tingkat Hunian (%)',
    data: props.values,
    borderColor: '#3B7BF5',
    backgroundColor: 'rgba(59,123,245,0.1)',
    borderWidth: 2,
    pointRadius: 4,
    fill: true,
    tension: 0.4,
  }],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { raw: unknown }) => `${ctx.raw}% hunian`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: app.isDark ? '#9B99A6' : '#65636B' },
      grid: { color: app.isDark ? '#2E2E32' : '#E0DDD8' },
    },
    y: {
      min: 0,
      max: 100,
      ticks: {
        color: app.isDark ? '#9B99A6' : '#65636B',
        callback: (v: number | string) => `${v}%`,
      },
      grid: { color: app.isDark ? '#2E2E32' : '#E0DDD8' },
    },
  },
}))
</script>

<template>
  <div style="position:relative;height:220px;padding:0 12px 12px">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
