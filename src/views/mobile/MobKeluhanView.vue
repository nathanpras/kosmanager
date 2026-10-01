<script setup lang="ts">
/* Keluhan penghuni.
 *
 * Status diubah langsung dari kartunya — keluhan ditangani sambil berjalan,
 * dan membuka layar detail dulu untuk menggeser satu status adalah satu ketukan
 * yang tidak perlu.
 */
import { computed, ref } from 'vue'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { usePropertiesStore } from '../../stores/properties'
import { useKeluhan } from '../../composables/useKeluhan'
import { useToast } from '../../composables/useToast'
import { jenisIkon, labelDurasi } from '../../utils/keluhan'
import { fmtTgl } from '../../utils/format'
import type { Maintenance } from '../../types'

const maintenance = useMaintenanceStore()
const properties = usePropertiesStore()
const { ubahStatus, urlBalasWA } = useKeluhan()
const { show: toast } = useToast()

const filter = ref<'aktif' | 'semua' | 'selesai'>('aktif')

const FILTER = [
  { kunci: 'aktif', label: 'Aktif' },
  { kunci: 'semua', label: 'Semua' },
  { kunci: 'selesai', label: 'Selesai' },
] as const

const STATUS: Record<Maintenance['status'], { label: string; cls: string }> = {
  open: { label: 'Terbuka', cls: 'bad' },
  in_progress: { label: 'Dikerjakan', cls: 'warn' },
  selesai: { label: 'Selesai', cls: 'ok' },
}

/* Murni: filter dikirim sebagai argumen, bukan dibaca dari state.
   Versi sebelumnya menghitung dengan cara menyetel filter.value sementara lalu
   mengembalikannya — mengubah dependensinya sendiri saat render, yang membuat
   Vue mengulang render tanpa henti. */
function cocok(m: Maintenance, f: string): boolean {
  if (f === 'semua') return true
  if (f === 'selesai') return m.status === 'selesai'
  return m.status !== 'selesai'
}

const daftar = computed(() =>
  maintenance.items.filter(m => cocok(m, filter.value))
    .slice()
    .sort((a, b) => (b.tgl ?? '').localeCompare(a.tgl ?? '')))

function hitung(f: string): number {
  return maintenance.items.filter(m => cocok(m, f)).length
}

function namaProperti(id: string): string {
  return properties.items.find(p => p.id === id)?.nama ?? ''
}

/** Status berikutnya dalam alur penanganan; selesai kembali ke terbuka. */
const BERIKUT: Record<Maintenance['status'], Maintenance['status']> = {
  open: 'in_progress', in_progress: 'selesai', selesai: 'open',
}

async function majukan(m: Maintenance) {
  try {
    await ubahStatus(m, BERIKUT[m.status])
    toast('Status diperbarui', 'success')
  } catch {
    toast('Gagal memperbarui status', 'error')
  }
}

function balas(m: Maintenance) {
  const hasil = urlBalasWA(m)
  if ('galat' in hasil) { toast(hasil.galat, 'error'); return }
  window.open(hasil.url, '_blank')
}
</script>

<template>
  <MobScreen judul="Keluhan" back>
    <div class="filterbar">
      <button
        v-for="f in FILTER"
        :key="f.kunci"
        class="fchip"
        :class="{ 'is-on': filter === f.kunci }"
        @click="filter = f.kunci"
      >{{ f.label }}<i>{{ hitung(f.kunci) }}</i></button>
    </div>

    <div class="sechead"><h2>Laporan</h2><span class="count">{{ daftar.length }}</span></div>

    <div v-if="daftar.length" class="stack-v stagger">
      <div v-for="m in daftar" :key="m.id" class="card">
        <div class="lrow" style="padding:0 0 12px">
          <span class="av sq ghost" style="font-size:18px">{{ jenisIkon(m.jenis) }}</span>
          <span class="lrow-body">
            <span class="lrow-title">{{ m.jenis || 'Kendala' }} · Kamar {{ m.kamar }}</span>
            <span class="lrow-sub">{{ namaProperti(m.property_id) }} · {{ fmtTgl(m.tgl) }}</span>
          </span>
          <span class="chip" :class="STATUS[m.status].cls">
            <i class="dot"></i>{{ STATUS[m.status].label }}
          </span>
        </div>

        <p style="font-size:14px;line-height:1.55;color:var(--ink);margin-bottom:4px">
          {{ m.deskripsi }}
        </p>
        <p v-if="labelDurasi(m)" class="fnote" style="margin:4px 0 12px">{{ labelDurasi(m) }}</p>
        <div v-else style="height:12px"></div>

        <div style="display:flex;gap:8px">
          <button class="btn brandsoft sm" style="flex:1" @click="majukan(m)">
            {{ m.status === 'selesai' ? 'Buka lagi' : `Tandai ${STATUS[BERIKUT[m.status]].label}` }}
          </button>
          <button class="btn sm" style="flex:1" @click="balas(m)">
            <MobIcon name="wa" :size="15" /> Balas
          </button>
        </div>
      </div>
    </div>

    <div v-else class="card emptystate">
      <h3>Tidak ada keluhan</h3>
      <p>Belum ada laporan pada filter ini.</p>
    </div>
  </MobScreen>
</template>
