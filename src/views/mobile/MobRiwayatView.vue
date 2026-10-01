<script setup lang="ts">
/* Riwayat penghuni sebuah properti atau kamar.
 *
 * Tidak memerlukan koleksi baru: orang yang keluar tetap ada di `penghuni`,
 * hanya dengan `tgl_keluar` terisi. Kamarnya dibaca pada TANGGAL KELUAR, bukan
 * dari field `kamar` — yang pernah pindah harus muncul di riwayat kamar tempat
 * ia benar-benar terakhir tinggal.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import { useMobile, inisial } from '../../composables/useMobile'
import { usePropertiesStore } from '../../stores/properties'
import { tglKeluar } from '../../composables/useOccupancy'
import { kamarPada } from '../../utils/riwayatKamar'
import { lamaHuni } from '../../utils/lamaHuni'
import { fmtTgl } from '../../utils/format'

const route = useRoute()
const properties = usePropertiesStore()
const { riwayatPenghuni } = useMobile()

const pid = computed(() => String(route.params.id))
const nomor = computed(() => (route.params.nomor ? String(route.params.nomor) : undefined))

const judul = computed(() =>
  nomor.value ? `Riwayat kamar ${nomor.value}` : 'Riwayat penghuni')

const lingkup = computed(() =>
  nomor.value
    ? `Kamar ${nomor.value}`
    : properties.items.find(p => p.id === pid.value)?.nama ?? '')

const daftar = computed(() =>
  riwayatPenghuni({ property_id: pid.value, nomor: nomor.value }))

function kamarTerakhir(p: Parameters<typeof tglKeluar>[0] & { kamar: string }): string {
  const keluar = tglKeluar(p)
  return keluar ? kamarPada(p as never, keluar) : p.kamar
}
</script>

<template>
  <MobScreen :judul="judul" back>
    <div class="sechead">
      <h2>{{ lingkup }}</h2>
      <span class="count">{{ daftar.length }}</span>
    </div>

    <div v-if="daftar.length" class="stack-v stagger">
      <div v-for="p in daftar" :key="p.id" class="card lrow">
        <span class="av ghost">{{ inisial(p.nama) }}</span>
        <span class="lrow-body">
          <span class="lrow-title">{{ p.nama }}</span>
          <span class="lrow-sub">{{ fmtTgl(p.masuk) }} – {{ fmtTgl(tglKeluar(p)!) }}</span>
          <span class="lrow-sub">
            <template v-if="!nomor">Kamar {{ kamarTerakhir(p) }} · </template>
            {{ lamaHuni(p.masuk, tglKeluar(p)!) }}
          </span>
        </span>
        <span class="chip mute">Mantan</span>
      </div>
    </div>

    <div v-else class="card emptystate">
      <div class="emptystate-art"><MobIcon name="users" :size="40" /></div>
      <h3>Belum ada riwayat</h3>
      <p>
        Penghuni yang sudah keluar dari {{ nomor ? 'kamar' : 'properti' }} ini
        akan tercatat di sini.
      </p>
    </div>
  </MobScreen>
</template>
