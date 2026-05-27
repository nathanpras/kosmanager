<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'

const props = defineProps<{
  labels: string[]
  values: number[]
}>()

const COLORS = [
  'rgba(59,123,245,0.8)', 'rgba(13,155,110,0.8)', 'rgba(208,140,10,0.8)',
  'rgba(220,74,74,0.8)',  'rgba(139,92,246,0.8)', 'rgba(20,184,166,0.8)',
]

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    data: props.values,
    backgroundColor: COLORS.slice(0, props.values.length),
    borderWidth: 2,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: { boxWidth: 12, font: { size: 11 } },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { label: string; raw: unknown }) =>
          `${ctx.label}: Rp ${Number(ctx.raw).toLocaleString('id-ID')}`,
      },
    },
  },
}
</script>

<template>
  <div style="position:relative;height:220px;padding:0 12px 12px">
    <Doughnut :data="chartData" :options="chartOptions" />
  </div>
</template>
