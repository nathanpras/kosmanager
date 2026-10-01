<script setup lang="ts">
/* Sheet "Pindah kamar".
 *
 * Aturan penagihannya ditulis terang-terangan di dalam sheet, dengan nomor
 * kamar dan nama bulan yang sebenarnya. Pindah kamar mengubah ke mana uang
 * ditagih selama berbulan-bulan ke depan; menyembunyikan aturannya di balik
 * tombol "Simpan" berarti meminta orang menebak.
 */
import { computed, ref } from 'vue'
import MobSheet from './MobSheet.vue'
import { usePindahKamar } from '../../composables/usePindahKamar'
import { awalBulanBerikutnya } from '../../utils/riwayatKamar'
import { bulanFromTgl, today } from '../../utils/date'
import type { Penghuni } from '../../types'

const props = defineProps<{ penghuni: Penghuni }>()
const emit = defineEmits<{ tutup: []; simpan: [tujuan: string, tgl: string] }>()

const { kamarTujuan } = usePindahKamar()

const tujuan = ref('')
const tgl = ref(today())
const galat = ref('')

const pilihan = computed(() => kamarTujuan(props.penghuni))
const efektif = computed(() => awalBulanBerikutnya(tgl.value))
const bulanBaru = computed(() => bulanFromTgl(efektif.value) ?? '')

function simpan() {
  if (!tujuan.value) {
    galat.value = 'Pilih kamar tujuan dulu.'
    return
  }
  galat.value = ''
  emit('simpan', tujuan.value, tgl.value)
}
</script>

<template>
  <MobSheet
    judul="Pindah kamar"
    :sub="`${props.penghuni.nama} · Kamar ${props.penghuni.kamar}`"
    @tutup="emit('tutup')"
  >
    <div class="fstack" style="padding:6px 10px 4px">
      <template v-if="pilihan.length">
        <div class="field">
          <span class="field-lbl">Pindah ke<span class="req"> *</span></span>
          <select v-model="tujuan" class="field-in" aria-label="Kamar tujuan">
            <option value="">Pilih kamar kosong</option>
            <option v-for="k in pilihan" :key="k.id" :value="k.nomor">
              Kamar {{ k.nomor }} · kosong
            </option>
          </select>
        </div>

        <label class="field">
          <span class="field-lbl">Tanggal pindah</span>
          <input v-model="tgl" class="field-in" type="date" aria-label="Tanggal pindah">
        </label>

        <div class="note info">
          <span>
            Bulan berjalan tetap ditagih <b>kamar {{ props.penghuni.kamar }}</b> penuh.
            <template v-if="tujuan"><b>Kamar {{ tujuan }}</b></template>
            <template v-else>Kamar tujuan</template>
            mulai ditagih 1 {{ bulanBaru }}. Sisa hari bulan ini tidak ditagih.
          </span>
        </div>

        <div v-if="galat" class="note bad"><span>{{ galat }}</span></div>
      </template>

      <div v-else class="note bad">
        <span>Tidak ada kamar kosong di properti ini. Kosongkan satu kamar dulu.</span>
      </div>
    </div>

    <template #kaki>
      <button class="btn" @click="emit('tutup')">{{ pilihan.length ? 'Batal' : 'Tutup' }}</button>
      <button v-if="pilihan.length" class="btn primary" @click="simpan">Simpan</button>
    </template>
  </MobSheet>
</template>
