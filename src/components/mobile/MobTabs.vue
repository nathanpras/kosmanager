<script setup lang="ts">
/* Tab pil dengan indikator yang bergeser.
 *
 * Mockup memosisikan indikatornya dengan mengukur DOM (offsetLeft/offsetWidth)
 * lalu menulis style lewat JS. Di sini tidak perlu: tiap `.ptab` memakai
 * `flex: 1`, jadi lebarnya sama persis dan posisinya bisa dihitung di CSS.
 * Satu pengukuran yang tidak dilakukan adalah satu sumber bug yang hilang —
 * yang diukur sebelum font selesai dimuat akan meleset.
 *
 * Jarak antar tab 2px (gap di `.ptabs`), jadi lebar tiap tab adalah
 * (100% - 2px x (n-1)) / n, dan pergeserannya i x (lebar + 2px). Di dalam
 * translateX, 100% berarti lebar indikatornya sendiri — yaitu lebar satu tab.
 */
import { computed } from 'vue'

const props = defineProps<{ tabs: readonly string[]; modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [number] }>()

const JARAK = 2

const gayaIndikator = computed(() => {
  const n = props.tabs.length || 1
  return {
    width: `calc((100% - ${JARAK * (n - 1)}px) / ${n})`,
    transform: `translateX(calc(${props.modelValue} * (100% + ${JARAK}px)))`,
  }
})
</script>

<template>
  <div class="tabdock">
    <div class="ptabs" role="tablist">
      <span class="ptabs-ind" :style="gayaIndikator"></span>
      <button
        v-for="(t, i) in props.tabs"
        :key="t"
        class="ptab"
        :class="{ 'is-on': i === props.modelValue }"
        role="tab"
        :aria-selected="i === props.modelValue"
        @click="emit('update:modelValue', i)"
      >{{ t }}</button>
    </div>
  </div>
</template>
