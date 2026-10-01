<script setup lang="ts">
/* Sheet "Ubah harga kamar".
 *
 * Harga baru hanya mengubah dokumen Kamar. Tagihan yang sudah terbit menyimpan
 * nominalnya sendiri dan tidak ikut berubah — itu benar, dan dikatakan di sheet
 * supaya tidak ada yang mengira tagihan bulan berjalan ikut terkoreksi.
 */
import { ref } from 'vue'
import MobSheet from './MobSheet.vue'
import MobIcon from './MobIcon.vue'
import { fmt } from '../../utils/format'
import type { Kamar } from '../../types'

const props = defineProps<{ kamar: Kamar }>()
const emit = defineEmits<{ tutup: []; simpan: [harga: number] }>()

const harga = ref(props.kamar.harga)
const galat = ref('')

function onUang(e: Event) {
  const digit = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  harga.value = digit ? Number(digit) : 0
}

function simpan() {
  if (harga.value <= 0) { galat.value = 'Harga sewa harus lebih dari nol.'; return }
  galat.value = ''
  emit('simpan', harga.value)
}
</script>

<template>
  <MobSheet
    judul="Ubah harga"
    :sub="`Kamar ${props.kamar.nomor}`"
    @tutup="emit('tutup')"
  >
    <div class="fstack" style="padding:6px 10px 4px">
      <label class="field">
        <span class="field-lbl">Harga sewa baru<span class="req"> *</span></span>
        <input
          class="field-in"
          inputmode="numeric"
          :value="harga ? fmt(harga) : ''"
          placeholder="Rp 0"
          aria-label="Harga sewa baru"
          @input="onUang"
        >
        <span class="field-foot"><span>Sekarang {{ fmt(props.kamar.harga) }} / bulan</span></span>
      </label>

      <div class="note info">
        <MobIcon name="info" :size="18" />
        <span>
          Tagihan yang sudah terbit menyimpan nominalnya sendiri dan tidak ikut
          berubah. Harga baru berlaku untuk tagihan berikutnya.
        </span>
      </div>

      <div v-if="galat" class="note bad"><span>{{ galat }}</span></div>
    </div>

    <template #kaki>
      <button class="btn" @click="emit('tutup')">Batal</button>
      <button class="btn primary" @click="simpan">Simpan</button>
    </template>
  </MobSheet>
</template>
