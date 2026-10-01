<script setup lang="ts">
/* Sheet ubah / hapus pengeluaran.
 *
 * Hapus memakai konfirmasi dua langkah di dalam sheet, bukan confirm(): dialog
 * bawaan browser tidak bisa digaya dan tombolnya mudah tertekan tanpa dibaca di
 * layar sentuh. Pengeluaran yang terhapus ikut menggeser saldo berjalan, jadi
 * salah ketuk di sini bukan kesalahan kecil.
 */
import { ref } from 'vue'
import MobSheet from './MobSheet.vue'
import MobIcon from './MobIcon.vue'
import { NAMA_KATEGORI } from '../../utils/kategoriPengeluaran'
import { fmt } from '../../utils/format'
import type { Pengeluaran } from '../../types'

const props = defineProps<{ pengeluaran: Pengeluaran }>()
const emit = defineEmits<{
  tutup: []
  simpan: [data: Partial<Pengeluaran>]
  hapus: []
}>()

const jumlah = ref(props.pengeluaran.jumlah)
const deskripsi = ref(props.pengeluaran.deskripsi)
const kategori = ref(props.pengeluaran.kategori || NAMA_KATEGORI[0])
const tgl = ref(props.pengeluaran.tgl)
const galat = ref('')
const yakinHapus = ref(false)

function onUang(e: Event) {
  const d = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  jumlah.value = d ? Number(d) : 0
}

function simpan() {
  if (jumlah.value <= 0) { galat.value = 'Nominal harus lebih dari nol.'; return }
  if (!deskripsi.value.trim()) { galat.value = 'Keterangan wajib diisi.'; return }
  galat.value = ''
  emit('simpan', {
    jumlah: jumlah.value,
    deskripsi: deskripsi.value.trim(),
    kategori: kategori.value,
    tgl: tgl.value,
  })
}

function hapus() {
  if (!yakinHapus.value) { yakinHapus.value = true; return }
  emit('hapus')
}
</script>

<template>
  <MobSheet judul="Ubah pengeluaran" :sub="props.pengeluaran.deskripsi" @tutup="emit('tutup')">
    <div class="fstack" style="padding:6px 10px 4px">
      <label class="field">
        <span class="field-lbl">Nominal<span class="req"> *</span></span>
        <input
          class="field-in" inputmode="numeric" placeholder="Rp 0"
          :value="jumlah ? fmt(jumlah) : ''" aria-label="Nominal" @input="onUang"
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
        <input v-model="deskripsi" class="field-in" maxlength="60" aria-label="Keterangan">
      </label>

      <div v-if="galat" class="note bad"><span>{{ galat }}</span></div>

      <button class="btn block" :class="{ danger: yakinHapus }" @click="hapus">
        <MobIcon name="trash" :size="17" />
        {{ yakinHapus ? 'Ketuk sekali lagi untuk menghapus' : 'Hapus pengeluaran' }}
      </button>
    </div>

    <template #kaki>
      <button class="btn" @click="emit('tutup')">Batal</button>
      <button class="btn primary" @click="simpan">Simpan</button>
    </template>
  </MobSheet>
</template>
