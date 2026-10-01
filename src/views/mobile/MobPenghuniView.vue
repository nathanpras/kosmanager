<script setup lang="ts">
/* Tab Penghuni: seluruh penghuni aktif lintas properti, dengan cari dan filter.
 *
 * Nama properti selalu ikut tampil. Kamar bernomor sama ada di lebih dari satu
 * properti di data asli, jadi "Kamar 101" sendirian tidak cukup untuk tahu
 * siapa yang dimaksud.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import { useMobile, LABEL_STATUS, inisial } from '../../composables/useMobile'
import { usePropertiesStore } from '../../stores/properties'
import { kamarDiBulan } from '../../utils/riwayatKamar'
import { lamaHuni } from '../../utils/lamaHuni'
import type { Penghuni } from '../../types'

const router = useRouter()
const properties = usePropertiesStore()
const { penghuniAktif, statusPenghuni, bulan, hari } = useMobile()

const cari = ref('')
const filter = ref<'semua' | 'lunas' | 'belum' | 'telat'>('semua')

const FILTER = [
  { kunci: 'semua', label: 'Semua' },
  { kunci: 'lunas', label: 'Lunas' },
  { kunci: 'belum', label: 'Jatuh tempo' },
  { kunci: 'telat', label: 'Telat' },
] as const

const semua = computed(() => penghuniAktif())

function cocokFilter(p: Penghuni, f: string): boolean {
  if (f === 'semua') return true
  return statusPenghuni(p) === f
}

function hitungFilter(f: string): number {
  return semua.value.filter(p => cocokFilter(p, f)).length
}

const tampil = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return semua.value
    .filter(p => cocokFilter(p, filter.value))
    .filter(p => !q
      || p.nama.toLowerCase().includes(q)
      || kamarDiBulan(p, bulan.value).toLowerCase().includes(q)
      || (p.hp ?? '').toLowerCase().includes(q))
})

function namaProperti(id: string): string {
  return properties.items.find(p => p.id === id)?.nama ?? ''
}

function buka(p: Penghuni) {
  router.push({
    name: 'm-kamar',
    params: { id: p.property_id, nomor: kamarDiBulan(p, bulan.value) || p.kamar },
  })
}
</script>

<template>
  <MobScreen judul="Penghuni">
    <div class="search">
      <MobIcon name="search" :size="18" />
      <input v-model="cari" placeholder="Cari nama, kamar, atau nomor HP" aria-label="Cari penghuni">
    </div>
    <div style="height:12px"></div>

    <div class="filterbar">
      <button
        v-for="f in FILTER"
        :key="f.kunci"
        class="fchip"
        :class="{ 'is-on': filter === f.kunci }"
        @click="filter = f.kunci"
      >{{ f.label }}<i>{{ hitungFilter(f.kunci) }}</i></button>
    </div>

    <div class="sechead">
      <h2>Penghuni aktif</h2>
      <span class="count">{{ tampil.length }}</span>
    </div>

    <div v-if="tampil.length" class="stack-v stagger">
      <button v-for="p in tampil" :key="p.id" class="card tap lrow" @click="buka(p)">
        <span class="av">{{ inisial(p.nama) }}</span>
        <span class="lrow-body">
          <span class="lrow-title">{{ p.nama }}</span>
          <span class="lrow-sub">
            Kamar {{ kamarDiBulan(p, bulan) || p.kamar }} · {{ namaProperti(p.property_id) }}
          </span>
          <span class="lrow-sub">{{ lamaHuni(p.masuk, hari) }}</span>
        </span>
        <span class="lrow-trail">
          <span class="chip" :class="LABEL_STATUS[statusPenghuni(p)].cls">
            <i class="dot"></i>{{ LABEL_STATUS[statusPenghuni(p)].label }}
          </span>
          <span class="chev"><MobIcon name="chev" :size="18" /></span>
        </span>
      </button>
    </div>

    <div v-else class="card emptystate">
      <h3>{{ cari.trim() ? 'Tidak ditemukan' : 'Tidak ada penghuni' }}</h3>
      <p v-if="cari.trim()">Tidak ada yang cocok dengan “{{ cari.trim() }}”.</p>
      <p v-else>Belum ada penghuni pada filter ini.</p>
    </div>
  </MobScreen>
</template>
