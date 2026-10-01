<script setup lang="ts">
/* Sheet "Ubah data kos" — keterangan properti.
 *
 * Saldo awal sengaja TIDAK ada di sini, walau ada di formulir desktop. Angka
 * itu jadi titik nol seluruh perhitungan saldo berjalan, dan desktop
 * menjelaskannya dengan satu paragraf penuh sebelum orang mengisinya.
 * Memerasnya jadi satu kolom di layar HP mengundang salah isi pada angka yang
 * paling tidak boleh salah. Sheet ini berkata ke mana harus pergi.
 */
import { ref } from 'vue'
import MobSheet from './MobSheet.vue'
import MobIcon from './MobIcon.vue'
import type { Property } from '../../types'

/** `properti` kosong berarti membuat yang baru. */
const props = defineProps<{ properti?: Property | null }>()
const emit = defineEmits<{ tutup: []; simpan: [data: Partial<Property>] }>()

const nama = ref(props.properti?.nama ?? '')
const alamat = ref(props.properti?.alamat ?? '')
const noHp = ref(props.properti?.no_hp ?? '')
const bankNama = ref(props.properti?.bank_nama ?? '')
const bankRekening = ref(props.properti?.bank_rekening ?? '')
const bankAn = ref(props.properti?.bank_an ?? '')
const galat = ref('')

function simpan() {
  if (!nama.value.trim()) { galat.value = 'Nama properti wajib diisi.'; return }
  galat.value = ''
  emit('simpan', {
    nama: nama.value.trim(),
    alamat: alamat.value.trim(),
    no_hp: noHp.value.trim(),
    bank_nama: bankNama.value.trim(),
    bank_rekening: bankRekening.value.trim(),
    bank_an: bankAn.value.trim(),
  })
}
</script>

<template>
  <MobSheet
    :judul="props.properti ? 'Ubah data kos' : 'Properti baru'"
    :sub="props.properti?.nama ?? ''"
    @tutup="emit('tutup')"
  >
    <div class="fstack" style="padding:6px 10px 4px">
      <label class="field">
        <span class="field-lbl">Nama properti<span class="req"> *</span></span>
        <input v-model="nama" class="field-in" maxlength="60" aria-label="Nama properti">
      </label>

      <label class="field">
        <span class="field-lbl">Alamat</span>
        <input v-model="alamat" class="field-in" maxlength="200" aria-label="Alamat">
      </label>

      <label class="field">
        <span class="field-lbl">No. HP</span>
        <input v-model="noHp" class="field-in" inputmode="tel" aria-label="No HP">
      </label>

      <label class="field">
        <span class="field-lbl">Bank</span>
        <input v-model="bankNama" class="field-in" placeholder="Mis. BCA" aria-label="Bank">
      </label>

      <label class="field">
        <span class="field-lbl">No. rekening</span>
        <input v-model="bankRekening" class="field-in" inputmode="numeric" aria-label="Nomor rekening">
      </label>

      <label class="field">
        <span class="field-lbl">Atas nama</span>
        <input v-model="bankAn" class="field-in" aria-label="Nama pemilik rekening">
      </label>

      <div v-if="props.properti" class="note info">
        <MobIcon name="info" :size="18" />
        <span>
          Saldo awal diatur di tampilan desktop. Angka itu jadi titik nol seluruh
          perhitungan saldo berjalan, jadi tempatnya di layar yang bisa
          menjelaskannya dengan utuh.
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
