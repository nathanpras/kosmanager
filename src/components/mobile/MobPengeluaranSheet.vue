<script setup lang="ts">
/* Sheet "Catat pengeluaran".
 *
 * Kategorinya diambil dari KATEGORI_PENGELUARAN yang sudah dipakai desktop,
 * bukan daftar baru — `Pengeluaran.kategori` menyimpan namanya sebagai teks,
 * jadi daftar kedua yang sedikit berbeda akan melahirkan kategori kembar yang
 * tidak pernah cocok di laporan.
 */
import { ref } from 'vue'
import MobSheet from './MobSheet.vue'
import { NAMA_KATEGORI } from '../../utils/kategoriPengeluaran'
import { fmt } from '../../utils/format'
import { today } from '../../utils/date'

const props = defineProps<{ namaProperti: string }>()
const emit = defineEmits<{
  tutup: []
  simpan: [deskripsi: string, jumlah: number, kategori: string, tgl: string]
}>()

const jumlah = ref(0)
const deskripsi = ref('')
const kategori = ref(NAMA_KATEGORI[0])
const tgl = ref(today())
const galat = ref('')

function onUang(e: Event) {
  const digit = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  jumlah.value = digit ? Number(digit) : 0
}

function simpan() {
  if (jumlah.value <= 0) { galat.value = 'Nominal harus lebih dari nol.'; return }
  if (!deskripsi.value.trim()) { galat.value = 'Keterangan wajib diisi.'; return }
  galat.value = ''
  emit('simpan', deskripsi.value.trim(), jumlah.value, kategori.value, tgl.value)
}
</script>

<template>
  <MobSheet judul="Catat pengeluaran" :sub="props.namaProperti" @tutup="emit('tutup')">
    <div class="fstack" style="padding:6px 10px 4px">
      <label class="field">
        <span class="field-lbl">Nominal<span class="req"> *</span></span>
        <input
          class="field-in"
          inputmode="numeric"
          :value="jumlah ? fmt(jumlah) : ''"
          placeholder="Rp 0"
          aria-label="Nominal"
          @input="onUang"
        >
      </label>

      <label class="field">
        <span class="field-lbl">Tanggal</span>
        <input v-model="tgl" class="field-in" type="date" aria-label="Tanggal">
      </label>

      <div class="field">
        <span class="field-lbl">Kategori</span>
        <select v-model="kategori" class="field-in" aria-label="Kategori">
          <option v-for="k in NAMA_KATEGORI" :key="k" :value="k">{{ k }}</option>
        </select>
      </div>

      <label class="field">
        <span class="field-lbl">Keterangan<span class="req"> *</span></span>
        <input
          v-model="deskripsi"
          class="field-in"
          maxlength="60"
          placeholder="Mis. Token listrik lantai 2"
          aria-label="Keterangan"
        >
      </label>

      <div v-if="galat" class="note bad"><span>{{ galat }}</span></div>
    </div>

    <template #kaki>
      <button class="btn" @click="emit('tutup')">Batal</button>
      <button class="btn primary" @click="simpan">Simpan</button>
    </template>
  </MobSheet>
</template>
