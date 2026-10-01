<script setup lang="ts">
/* Sheet tambah / ubah penghuni.
 *
 * Kamar tidak bisa dipilih di sini saat menambah: sheetnya dibuka DARI kamar
 * yang bersangkutan, jadi menawarkan pilihan kamar lagi hanya membuka peluang
 * salah pilih. Pindah kamar punya jalurnya sendiri, dengan aturan penagihan
 * yang tidak boleh dilewati.
 */
import { ref } from 'vue'
import MobSheet from './MobSheet.vue'
import MobIcon from './MobIcon.vue'
import { today } from '../../utils/date'
import { isValidPhone } from '../../composables/useWAReminder'
import type { Penghuni } from '../../types'

const props = defineProps<{
  nomorKamar: string
  propertyId: string
  /** Diisi saat mengubah; kosong berarti menambah. */
  penghuni?: Penghuni | null
}>()
const emit = defineEmits<{ tutup: []; simpan: [data: Partial<Penghuni>] }>()

const nama = ref(props.penghuni?.nama ?? '')
const hp = ref(props.penghuni?.hp ?? '')
const masuk = ref(props.penghuni?.masuk ?? today())
const kelamin = ref(props.penghuni?.jenis_kelamin ?? '')
const asal = ref(props.penghuni?.asal ?? '')
const pekerjaan = ref(props.penghuni?.pekerjaan ?? '')
const darurat = ref(props.penghuni?.org2_nama ?? '')
const daruratHp = ref(props.penghuni?.org2_hp ?? '')
const galat = ref('')

function simpan() {
  if (!nama.value.trim()) { galat.value = 'Nama wajib diisi.'; return }
  if (!isValidPhone(hp.value)) {
    galat.value = 'No. HP belum valid. Tulis minimal 8 digit, mis. 0812 3456 7890.'
    return
  }
  if (!masuk.value) { galat.value = 'Tanggal masuk wajib diisi.'; return }
  galat.value = ''
  emit('simpan', {
    nama: nama.value.trim(),
    hp: hp.value.trim(),
    masuk: masuk.value,
    kamar: props.nomorKamar,
    property_id: props.propertyId,
    jenis_kelamin: (kelamin.value || undefined) as Penghuni['jenis_kelamin'],
    asal: asal.value.trim(),
    pekerjaan: pekerjaan.value.trim(),
    org2_nama: darurat.value.trim(),
    org2_hp: daruratHp.value.trim(),
  })
}
</script>

<template>
  <MobSheet
    :judul="props.penghuni ? 'Ubah data penghuni' : 'Tambah penghuni'"
    :sub="`Kamar ${props.nomorKamar}`"
    @tutup="emit('tutup')"
  >
    <div class="fstack" style="padding:6px 10px 4px">
      <label class="field">
        <span class="field-lbl">Nama lengkap<span class="req"> *</span></span>
        <input v-model="nama" class="field-in" maxlength="60" aria-label="Nama lengkap">
      </label>

      <label class="field">
        <span class="field-lbl">No. HP<span class="req"> *</span></span>
        <input v-model="hp" class="field-in" inputmode="tel" placeholder="0812 3456 7890" aria-label="No HP">
        <span class="field-foot"><span>Dipakai untuk pengingat WhatsApp</span></span>
      </label>

      <label class="field">
        <span class="field-lbl">Tanggal masuk<span class="req"> *</span></span>
        <input v-model="masuk" class="field-in" type="date" aria-label="Tanggal masuk">
      </label>

      <div class="field">
        <span class="field-lbl">Jenis kelamin</span>
        <select v-model="kelamin" class="field-in" aria-label="Jenis kelamin">
          <option value="">Tidak diisi</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </div>

      <label class="field">
        <span class="field-lbl">Asal</span>
        <input v-model="asal" class="field-in" aria-label="Asal">
      </label>

      <label class="field">
        <span class="field-lbl">Pekerjaan</span>
        <input v-model="pekerjaan" class="field-in" aria-label="Pekerjaan">
      </label>

      <label class="field">
        <span class="field-lbl">Kontak darurat</span>
        <input v-model="darurat" class="field-in" placeholder="Mis. Orang tua" aria-label="Kontak darurat">
      </label>

      <label class="field">
        <span class="field-lbl">No. HP darurat</span>
        <input v-model="daruratHp" class="field-in" inputmode="tel" aria-label="No HP darurat">
      </label>

      <div v-if="!props.penghuni" class="note info">
        <MobIcon name="info" :size="18" />
        <span>
          Tagihan bulan masuk ikut dibuat otomatis — generator bulanan hanya
          mengurus bulan depan, jadi tanpa ini bulan masuk akan bolong.
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
