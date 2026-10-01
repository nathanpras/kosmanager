<script setup lang="ts">
/* Cari: properti, kamar, dan penghuni sekaligus.
 *
 * Kamar dicocokkan ke NOMORNYA saja. Kalau nama propertinya ikut dicocokkan,
 * satu kata "Citra" akan mengembalikan seluruh kamar properti itu — hasil yang
 * benar secara harfiah tapi tidak berguna.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import { useMobile, LABEL_STATUS, inisial } from '../../composables/useMobile'
import { usePropertiesStore } from '../../stores/properties'
import { useKamarStore } from '../../stores/kamar'
import { kamarDiBulan } from '../../utils/riwayatKamar'
import { fmt } from '../../utils/format'

const router = useRouter()
const properties = usePropertiesStore()
const kamarStore = useKamarStore()
const { penghuniAktif, statusKini, statusPenghuni, namaPenghuni, bulan } = useMobile()

const q = ref('')
const kunci = computed(() => q.value.trim().toLowerCase())

const hasilProperti = computed(() => !kunci.value ? [] :
  properties.items.filter(p =>
    `${p.nama} ${p.alamat ?? ''}`.toLowerCase().includes(kunci.value)))

const hasilKamar = computed(() => !kunci.value ? [] :
  kamarStore.items.filter(k => k.nomor.toLowerCase().includes(kunci.value)))

const hasilPenghuni = computed(() => !kunci.value ? [] :
  penghuniAktif().filter(p =>
    `${p.nama} ${p.hp ?? ''}`.toLowerCase().includes(kunci.value)))

const adaHasil = computed(() =>
  hasilProperti.value.length + hasilKamar.value.length + hasilPenghuni.value.length > 0)

function namaProperti(id: string): string {
  return properties.items.find(p => p.id === id)?.nama ?? ''
}
</script>

<template>
  <MobScreen judul="Cari" back>
    <div class="search">
      <MobIcon name="search" :size="18" />
      <input v-model="q" placeholder="Nama, nomor kamar, atau properti" aria-label="Cari">
    </div>

    <template v-if="!kunci">
      <div class="card emptystate" style="margin-top:16px">
        <h3>Mau cari apa?</h3>
        <p>Ketik nama penghuni, nomor kamar, atau nama properti.</p>
      </div>
    </template>

    <template v-else-if="adaHasil">
      <template v-if="hasilProperti.length">
        <div class="sechead"><h2>Properti</h2><span class="count">{{ hasilProperti.length }}</span></div>
        <div class="stack-v">
          <button
            v-for="p in hasilProperti"
            :key="p.id"
            class="card tap lrow"
            @click="router.push({ name: 'm-prop', params: { id: p.id } })"
          >
            <span class="av sq">{{ inisial(p.nama) }}</span>
            <span class="lrow-body">
              <span class="lrow-title">{{ p.nama }}</span>
              <span class="lrow-sub">{{ p.alamat || 'Alamat belum diisi' }}</span>
            </span>
            <span class="chev"><MobIcon name="chev" :size="18" /></span>
          </button>
        </div>
      </template>

      <template v-if="hasilKamar.length">
        <div class="sechead"><h2>Kamar</h2><span class="count">{{ hasilKamar.length }}</span></div>
        <div class="stack-v">
          <button
            v-for="k in hasilKamar"
            :key="k.id"
            class="card tap lrow"
            @click="router.push({ name: 'm-kamar', params: { id: k.property_id, nomor: k.nomor } })"
          >
            <span class="roomno" :class="{ vacant: statusKini(k) === 'kosong' }">{{ k.nomor }}</span>
            <span class="lrow-body">
              <span class="lrow-title">{{ namaPenghuni(k) || `Kamar ${k.nomor}` }}</span>
              <span class="lrow-sub">{{ namaProperti(k.property_id) }} · {{ fmt(k.harga) }}</span>
            </span>
            <span class="chip" :class="LABEL_STATUS[statusKini(k)].cls">
              <i class="dot"></i>{{ LABEL_STATUS[statusKini(k)].label }}
            </span>
          </button>
        </div>
      </template>

      <template v-if="hasilPenghuni.length">
        <div class="sechead"><h2>Penghuni</h2><span class="count">{{ hasilPenghuni.length }}</span></div>
        <div class="stack-v">
          <button
            v-for="p in hasilPenghuni"
            :key="p.id"
            class="card tap lrow"
            @click="router.push({ name: 'm-kamar', params: { id: p.property_id, nomor: kamarDiBulan(p, bulan) || p.kamar } })"
          >
            <span class="av">{{ inisial(p.nama) }}</span>
            <span class="lrow-body">
              <span class="lrow-title">{{ p.nama }}</span>
              <span class="lrow-sub">
                Kamar {{ kamarDiBulan(p, bulan) || p.kamar }} · {{ namaProperti(p.property_id) }}
              </span>
            </span>
            <span class="chip" :class="LABEL_STATUS[statusPenghuni(p)].cls">
              <i class="dot"></i>{{ LABEL_STATUS[statusPenghuni(p)].label }}
            </span>
          </button>
        </div>
      </template>
    </template>

    <div v-else class="card emptystate" style="margin-top:16px">
      <h3>Tidak ditemukan</h3>
      <p>Tidak ada yang cocok dengan “{{ q.trim() }}”.</p>
    </div>
  </MobScreen>
</template>
