<script setup lang="ts">
/* Sheet "Catat pembayaran".
 *
 * Isinya sengaja lebih sedikit daripada mockup: metode pembayaran dan catatan
 * tidak ada di dokumen Tagihan, dan mengarang field baru di sini berarti
 * membuat skema diam-diam. Yang ditulis hanya yang memang disimpan —
 * jumlah dan tanggalnya.
 */
import { computed, ref } from 'vue'
import MobSheet from './MobSheet.vue'
import { statusTagihan } from '../../utils/statusTagihan'
import { fmt } from '../../utils/format'
import { today } from '../../utils/date'
import type { Tagihan } from '../../types'

const props = defineProps<{ tagihan: Tagihan; sub?: string }>()
const emit = defineEmits<{ tutup: []; simpan: [jumlah: number, tgl: string] }>()

const info = computed(() => statusTagihan(props.tagihan))

const jumlah = ref(info.value.sisa || props.tagihan.jumlah)
const tgl = ref(today())
const galat = ref('')

const CEPAT = computed(() => [
  { label: 'Lunas penuh', nilai: info.value.sisa || props.tagihan.jumlah },
  { label: 'Setengah', nilai: Math.round((info.value.sisa || props.tagihan.jumlah) / 2) },
  { label: 'Kosongkan', nilai: 0 },
])

/* Input uang diketik sebagai angka polos lalu ditampilkan terformat, supaya
   tidak perlu mengurai "Rp1.700.000" kembali jadi bilangan. */
function onUang(e: Event) {
  const digit = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  jumlah.value = digit ? Number(digit) : 0
}

function simpan() {
  if (jumlah.value <= 0) {
    galat.value = 'Jumlah dibayar harus lebih dari nol.'
    return
  }
  galat.value = ''
  emit('simpan', jumlah.value, tgl.value)
}
</script>

<template>
  <MobSheet
    judul="Catat pembayaran"
    :sub="props.sub"
    @tutup="emit('tutup')"
  >
    <div class="fstack" style="padding:6px 10px 4px">
      <label class="field">
        <span class="field-lbl">Jumlah dibayar<span class="req"> *</span></span>
        <input
          class="field-in"
          inputmode="numeric"
          :value="jumlah ? fmt(jumlah) : ''"
          placeholder="Rp 0"
          aria-label="Jumlah dibayar"
          @input="onUang"
        >
        <span class="field-foot">
          <span>Tagihan {{ props.tagihan.bulan }} · {{ fmt(props.tagihan.jumlah) }}</span>
        </span>
      </label>
    </div>

    <div class="quick" style="padding:10px 10px 4px">
      <button
        v-for="c in CEPAT"
        :key="c.label"
        class="fchip"
        :class="{ 'is-on': c.nilai > 0 && jumlah === c.nilai }"
        @click="jumlah = c.nilai"
      >{{ c.label }}</button>
    </div>

    <div class="fstack" style="padding:14px 10px 4px">
      <label class="field">
        <span class="field-lbl">Tanggal bayar</span>
        <input v-model="tgl" class="field-in" type="date" aria-label="Tanggal bayar">
      </label>
      <div v-if="galat" class="note bad">
        <span>{{ galat }}</span>
      </div>
    </div>

    <template #kaki>
      <button class="btn" @click="emit('tutup')">Batal</button>
      <button class="btn primary" @click="simpan">Simpan</button>
    </template>
  </MobSheet>
</template>
