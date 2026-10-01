<script setup lang="ts">
/* Sheet tambah / ubah kamar. */
import { ref } from 'vue'
import MobSheet from './MobSheet.vue'
import { usePropertiesStore } from '../../stores/properties'
import { fmt } from '../../utils/format'
import type { Kamar } from '../../types'

const props = defineProps<{ propertyId: string; namaProperti: string; kamar?: Kamar | null }>()
const emit = defineEmits<{ tutup: []; simpan: [data: Partial<Kamar>] }>()

const properties = usePropertiesStore()

const nomor = ref(props.kamar?.nomor ?? '')
const harga = ref(props.kamar?.harga ?? 0)
const tipe = ref(props.kamar?.tipe ?? '')
const kategori = ref(props.kamar?.kategori ?? '')
const deposit = ref(props.kamar?.deposit ?? 0)
const galat = ref('')

/* Ref di dalam template sudah ter-unwrap jadi angka, jadi penangannya tidak
   bisa menerima ref sebagai argumen — dua penangan eksplisit lebih jujur
   daripada satu yang menipu pemeriksa tipe. */
const angka = (e: Event) => {
  const d = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  return d ? Number(d) : 0
}
const onHarga = (e: Event) => { harga.value = angka(e) }
const onDeposit = (e: Event) => { deposit.value = angka(e) }

function simpan() {
  if (!nomor.value.trim()) { galat.value = 'Nomor kamar wajib diisi.'; return }
  if (harga.value <= 0) { galat.value = 'Harga sewa harus lebih dari nol.'; return }
  galat.value = ''
  emit('simpan', {
    nomor: nomor.value.trim(),
    harga: harga.value,
    tipe: tipe.value.trim(),
    kategori: kategori.value || undefined,
    deposit: deposit.value || undefined,
    property_id: props.propertyId,
    status: props.kamar?.status ?? 'kosong',
  })
}
</script>

<template>
  <MobSheet
    :judul="props.kamar ? 'Ubah kamar' : 'Tambah kamar'"
    :sub="props.namaProperti"
    @tutup="emit('tutup')"
  >
    <div class="fstack" style="padding:6px 10px 4px">
      <label class="field">
        <span class="field-lbl">Nomor kamar<span class="req"> *</span></span>
        <input v-model="nomor" class="field-in" maxlength="10" placeholder="Mis. 208" aria-label="Nomor kamar">
      </label>

      <label class="field">
        <span class="field-lbl">Harga sewa<span class="req"> *</span></span>
        <input
          class="field-in" inputmode="numeric" placeholder="Rp 0"
          :value="harga ? fmt(harga) : ''" aria-label="Harga sewa" @input="onHarga"
        >
      </label>

      <label class="field">
        <span class="field-lbl">Deposit</span>
        <input
          class="field-in" inputmode="numeric" placeholder="Rp 0"
          :value="deposit ? fmt(deposit) : ''" aria-label="Deposit" @input="onDeposit"
        >
      </label>

      <label class="field">
        <span class="field-lbl">Tipe kamar</span>
        <input v-model="tipe" class="field-in" placeholder="Mis. Kamar mandi dalam" aria-label="Tipe kamar">
      </label>

      <div v-if="properties.kategori.length" class="field">
        <span class="field-lbl">Kategori</span>
        <select v-model="kategori" class="field-in" aria-label="Kategori">
          <option value="">Tanpa kategori</option>
          <option v-for="k in properties.kategori" :key="k.id" :value="k.nama">{{ k.nama }}</option>
        </select>
      </div>

      <div v-if="galat" class="note bad"><span>{{ galat }}</span></div>
    </div>

    <template #kaki>
      <button class="btn" @click="emit('tutup')">Batal</button>
      <button class="btn primary" @click="simpan">Simpan</button>
    </template>
  </MobSheet>
</template>
