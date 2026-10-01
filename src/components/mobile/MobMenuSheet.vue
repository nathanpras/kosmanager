<script setup lang="ts">
/* Menu ⋮ di beranda.
 *
 * Tempat hal-hal yang bukan pekerjaan harian. Kontrak desain mengunci tiga tab
 * bawah, dan menambah tab keempat membuat ketiganya lebih sempit demi layar
 * yang jarang dibuka. Di sini semuanya tetap terjangkau tanpa menuntut
 * sepertiga lebar dok.
 */
import MobSheet from './MobSheet.vue'
import MobIcon from './MobIcon.vue'

defineProps<{ items: { ikon: string; judul: string; sub: string; ke: string }[] }>()
const emit = defineEmits<{ tutup: []; pilih: [ke: string] }>()
</script>

<template>
  <MobSheet judul="Menu" @tutup="emit('tutup')">
    <button
      v-for="it in items"
      :key="it.ke"
      class="aitem"
      @click="emit('pilih', it.ke)"
    >
      <span class="aitem-ic"><MobIcon :name="it.ikon" :size="19" /></span>
      <span class="aitem-t">{{ it.judul }}<small>{{ it.sub }}</small></span>
      <span class="chev" style="color:var(--ink-3)"><MobIcon name="chev" :size="17" /></span>
    </button>
  </MobSheet>
</template>
