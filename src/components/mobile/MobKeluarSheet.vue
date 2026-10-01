<script setup lang="ts">
/* Sheet "Akhiri sewa" — mengeluarkan penghuni.
 *
 * Konfirmasi dua langkah, bukan `confirm()`: dialog bawaan browser tidak bisa
 * digaya, dan di layar sentuh tombolnya kecil dan mudah tertekan tanpa dibaca.
 *
 * Teksnya menyebut apa yang sebenarnya terjadi. Aplikasi ini tidak menghapus
 * siapa pun — yang ditulis adalah `tgl_keluar`, dan orangnya pindah ke riwayat.
 * Menamainya "hapus" tanpa penjelasan akan membuat orang takut menekannya, atau
 * lebih buruk, mengira datanya hilang.
 */
import { ref } from 'vue'
import MobSheet from './MobSheet.vue'
import MobIcon from './MobIcon.vue'
import { today } from '../../utils/date'
import type { Penghuni } from '../../types'

const props = defineProps<{ penghuni: Penghuni }>()
const emit = defineEmits<{ tutup: []; simpan: [tgl: string] }>()

const tgl = ref(today())
const yakin = ref(false)

function tekan() {
  if (!yakin.value) { yakin.value = true; return }
  emit('simpan', tgl.value)
}
</script>

<template>
  <MobSheet
    judul="Akhiri sewa"
    :sub="`${props.penghuni.nama} · Kamar ${props.penghuni.kamar}`"
    @tutup="emit('tutup')"
  >
    <div class="fstack" style="padding:6px 10px 4px">
      <div class="note info">
        <MobIcon name="info" :size="18" />
        <span>
          <b>{{ props.penghuni.nama }}</b> dipindahkan ke riwayat kamar
          {{ props.penghuni.kamar }}, bukan dihapus. Datanya tetap bisa dibuka.
          Tagihan kamar ini ikut dirapikan sampai bulan keluar.
        </span>
      </div>

      <label class="field">
        <span class="field-lbl">Tanggal keluar</span>
        <input v-model="tgl" class="field-in" type="date" aria-label="Tanggal keluar">
      </label>

      <button class="btn block" :class="{ danger: yakin }" @click="tekan">
        <MobIcon name="trash" :size="17" />
        {{ yakin ? 'Ketuk sekali lagi untuk mengakhiri' : `Akhiri sewa kamar ${props.penghuni.kamar}` }}
      </button>
    </div>

    <template #kaki>
      <button class="btn" @click="emit('tutup')">Batal</button>
    </template>
  </MobSheet>
</template>
