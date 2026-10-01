<script setup lang="ts">
/* Sheet "Tambah tagihan".
 *
 * Nominal awalnya diambil dari tagihanUntukKamar() — rumus yang sama dengan
 * desktop dan dengan generator bulanan, termasuk prorata hari-orang. Menghitung
 * ulang di sini berarti dua rumus tagihan dalam satu aplikasi.
 *
 * Bila bulan yang dipilih sudah punya tagihan untuk orang ini, sheet berkata
 * begitu sebelum menyimpan. Tagihan ganda tidak dilarang — kadang memang ada
 * tagihan tambahan — tapi dibuat tanpa sadar adalah cerita lain.
 */
import { computed, ref, watch } from 'vue'
import MobSheet from './MobSheet.vue'
import MobIcon from './MobIcon.vue'
import { useTagihanCalc } from '../../composables/useTagihanCalc'
import { useTagihanStore } from '../../stores/tagihan'
import { kamarDiBulan } from '../../utils/riwayatKamar'
import { fmt } from '../../utils/format'
import { bulanIni, today } from '../../utils/date'
import { MONTHS_FULL } from '../../utils/format'
import type { Penghuni } from '../../types'

const props = defineProps<{ penghuni: Penghuni }>()
const emit = defineEmits<{
  tutup: []
  simpan: [bulan: string, kamar: string, jumlah: number, jatuhTempo: string]
}>()

const { tagihanUntukKamar } = useTagihanCalc()
const tagihanStore = useTagihanStore()

/** Dua belas bulan ke belakang dan satu ke depan — cukup untuk susulan. */
const PILIHAN_BULAN = (() => {
  const [y, m] = today().split('-').map(Number)
  const out: string[] = []
  for (let i = 1; i >= -12; i--) {
    const d = new Date(y, m - 1 + i, 1)
    out.push(`${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`)
  }
  return out
})()

const bulan = ref(bulanIni())
const jumlah = ref(0)
const jatuhTempo = ref(today())
const galat = ref('')

const kamarBulanItu = computed(() => kamarDiBulan(props.penghuni, bulan.value))

/** Tagihan yang sudah ada untuk orang ini di bulan yang dipilih. */
const sudahAda = computed(() => tagihanStore.items.filter(t =>
  t.property_id === props.penghuni.property_id && t.bulan === bulan.value
  && (t.penghuni_id ? t.penghuni_id === props.penghuni.id : t.kamar === kamarBulanItu.value)))

function isiUlang() {
  const draft = tagihanUntukKamar(kamarBulanItu.value, props.penghuni.property_id, bulan.value)
  const milikDia = draft.find(d => d.penghuni_id === props.penghuni.id) ?? draft[0]
  jumlah.value = milikDia?.jumlah ?? 0
}
isiUlang()
watch(bulan, isiUlang)

function onUang(e: Event) {
  const digit = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  jumlah.value = digit ? Number(digit) : 0
}

function simpan() {
  if (jumlah.value <= 0) { galat.value = 'Jumlah tagihan harus lebih dari nol.'; return }
  galat.value = ''
  emit('simpan', bulan.value, kamarBulanItu.value, jumlah.value, jatuhTempo.value)
}
</script>

<template>
  <MobSheet
    judul="Tambah tagihan"
    :sub="`${props.penghuni.nama} · Kamar ${kamarBulanItu}`"
    @tutup="emit('tutup')"
  >
    <div class="fstack" style="padding:6px 10px 4px">
      <div class="field">
        <span class="field-lbl">Bulan</span>
        <select v-model="bulan" class="field-in" aria-label="Bulan tagihan">
          <option v-for="b in PILIHAN_BULAN" :key="b" :value="b">{{ b }}</option>
        </select>
      </div>

      <label class="field">
        <span class="field-lbl">Jumlah<span class="req"> *</span></span>
        <input
          class="field-in"
          inputmode="numeric"
          :value="jumlah ? fmt(jumlah) : ''"
          placeholder="Rp 0"
          aria-label="Jumlah tagihan"
          @input="onUang"
        >
        <span class="field-foot"><span>Isian awal dari hitungan sewa kamar {{ kamarBulanItu }}</span></span>
      </label>

      <label class="field">
        <span class="field-lbl">Jatuh tempo</span>
        <input v-model="jatuhTempo" class="field-in" type="date" aria-label="Jatuh tempo">
      </label>

      <div v-if="sudahAda.length" class="note info">
        <MobIcon name="info" :size="18" />
        <span>
          {{ props.penghuni.nama }} sudah punya {{ sudahAda.length }} tagihan untuk
          {{ bulan }}. Menyimpan akan menambah tagihan kedua, bukan menggantinya.
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
