<script setup lang="ts">
/* Notifikasi.
 *
 * Diturunkan dari data, bukan koleksi tersimpan: begitu tagihan dibayar atau
 * keluhan ditutup, barisnya hilang dengan sendirinya. Daftar notifikasi yang
 * disimpan akan basi dan menuntut pembersihan sendiri.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import { useMobile } from '../../composables/useMobile'
import { useTagihanStore } from '../../stores/tagihan'
import { useMaintenanceStore } from '../../stores/maintenance'
import { usePropertiesStore } from '../../stores/properties'
import { statusTagihan } from '../../utils/statusTagihan'
import { fmt, fmtTgl } from '../../utils/format'

const router = useRouter()
const tagihanStore = useTagihanStore()
const maintenance = useMaintenanceStore()
const properties = usePropertiesStore()
const { hari, bulan } = useMobile()

interface Baris {
  av: string
  ikon: string
  judul: string
  nama: string
  kamar: string
  property_id: string
  nilai: string
  ke?: { name: string; params: Record<string, string> }
}

const daftar = computed<Baris[]>(() => {
  const out: Baris[] = []

  /* Paling mendesak dulu: uang yang lewat tempo, lalu yang akan jatuh tempo,
     lalu keluhan yang belum ditangani. */
  for (const t of tagihanStore.items) {
    if (t.hangus || t.bulan !== bulan.value) continue
    const h = statusTagihan(t, hari.value)
    if (h.status === 'lunas') continue
    out.push({
      av: h.telat ? 'neg' : 'due',
      ikon: h.telat ? 'warn' : 'receipt',
      judul: h.telat ? 'Pembayaran telat' : 'Belum dibayar',
      nama: t.penghuni, kamar: t.kamar, property_id: t.property_id,
      nilai: fmt(h.sisa),
      ke: { name: 'm-kamar', params: { id: t.property_id, nomor: t.kamar } },
    })
  }
  out.sort((a, b) => (a.av === 'neg' ? 0 : 1) - (b.av === 'neg' ? 0 : 1))

  for (const m of maintenance.items) {
    if (m.status === 'selesai') continue
    out.push({
      av: '', ikon: 'build',
      judul: m.status === 'open' ? 'Keluhan terbuka' : 'Keluhan dikerjakan',
      nama: m.jenis || 'Kendala', kamar: m.kamar, property_id: m.property_id,
      nilai: fmtTgl(m.tgl),
      ke: { name: 'm-keluhan', params: {} },
    })
  }

  return out
})

function namaProperti(id: string): string {
  return properties.items.find(p => p.id === id)?.nama ?? ''
}
</script>

<template>
  <MobScreen judul="Notifikasi" back>
    <div class="sechead"><h2>Perlu dilihat</h2><span class="count">{{ daftar.length }}</span></div>

    <div v-if="daftar.length" class="stack-v stagger">
      <button
        v-for="(n, i) in daftar"
        :key="i"
        class="card tap lrow"
        @click="n.ke && router.push(n.ke)"
      >
        <span class="av sm" :class="n.av"><MobIcon :name="n.ikon" :size="18" /></span>
        <span class="lrow-body">
          <span class="lrow-title">{{ n.judul }}</span>
          <span class="lrow-sub">{{ n.nama }}</span>
          <span class="lrow-sub">Kamar {{ n.kamar }} · {{ namaProperti(n.property_id) }}</span>
        </span>
        <span class="lrow-trail">
          <span class="chip mute fig">{{ n.nilai }}</span>
          <span class="chev"><MobIcon name="chev" :size="18" /></span>
        </span>
      </button>
    </div>

    <div v-else class="card emptystate">
      <h3>Tidak ada notifikasi</h3>
      <p>Semua tagihan bulan ini lunas dan tidak ada keluhan yang terbuka.</p>
    </div>
  </MobScreen>
</template>
