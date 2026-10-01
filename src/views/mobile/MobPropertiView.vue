<script setup lang="ts">
/* Beranda shell mobile: sapaan, ringkasan hari ini, dan daftar properti.
 *
 * Chip statistik di sini sengaja BUKAN tombol. Di mockup ia membuka layar
 * hasil filter, dan layar itu belum diport. Merendernya sebagai tombol yang
 * tidak menuju ke mana-mana persis mengulang jalan buntu yang baru saja
 * dihabiskan di ronde 5 — lebih baik ia jadi angka yang jujur dulu.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import { useMobile } from '../../composables/useMobile'
import { useSettingsStore } from '../../stores/settings'
import { fmtTgl } from '../../utils/format'

const router = useRouter()
const settings = useSettingsStore()
const { daftarProperti, hitungan, hari } = useMobile()

const sapaan = computed(() => {
  const j = new Date().getHours()
  if (j < 11) return 'Selamat pagi'
  if (j < 15) return 'Selamat siang'
  if (j < 19) return 'Selamat sore'
  return 'Selamat malam'
})

/* Nama pemilik dari pengaturan; kalau belum diisi, sapaannya berdiri sendiri
   tanpa koma menggantung. */
const namaPemilik = computed(() => (settings.data.nama ?? '').trim())

const semua = computed(() => hitungan())

const STAT = [
  { kunci: 'terisi',   label: 'Terisi',      nada: '' },
  { kunci: 'kosong',   label: 'Kosong',      nada: '' },
  { kunci: 'telat',    label: 'Telat',       nada: 'is-bad' },
  { kunci: 'belum',    label: 'Jatuh tempo', nada: 'is-warn' },
  { kunci: 'booked',   label: 'Booked',      nada: '' },
  { kunci: 'checkin',  label: 'Check-in',    nada: '' },
  { kunci: 'checkout', label: 'Check-out',   nada: '' },
] as const

function inisialProperti(nama: string): string {
  return nama.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function buka(id: string) {
  router.push({ name: 'm-prop', params: { id } })
}
</script>

<template>
  <MobScreen judul="Daftar properti">
    <div class="stagger">
      <section class="card hero">
        <div class="hero-top">
          <div class="hero-txt">
            <h2>{{ sapaan }}<template v-if="namaPemilik">,<br><em>{{ namaPemilik }}</em></template></h2>
            <p>{{ fmtTgl(hari).toUpperCase() }}</p>
          </div>
          <span class="hero-mark"><MobIcon name="key" :size="21" /></span>
        </div>
        <div class="hero-rule"></div>
        <div class="statgrid">
          <span
            v-for="s in STAT"
            :key="s.kunci"
            class="statchip"
            :class="semua[s.kunci] ? s.nada : 'is-zero'"
          >{{ s.label }} <b>{{ semua[s.kunci] }}</b></span>
        </div>
      </section>

      <div class="sechead">
        <h2>Properti</h2>
        <span class="count">{{ daftarProperti.length }}</span>
      </div>

      <div v-if="daftarProperti.length" class="stack-v">
        <button
          v-for="p in daftarProperti"
          :key="p.id"
          class="card tap lrow"
          @click="buka(p.id)"
        >
          <span class="av sq">{{ inisialProperti(p.nama) }}</span>
          <span class="lrow-body">
            <span class="lrow-title">{{ p.nama }}</span>
            <span class="lrow-sub">{{ p.alamat || 'Alamat belum diisi' }}</span>
            <span class="lrow-meta">
              <span class="chip mute fig">
                {{ hitungan(p.id).terisi }}/{{ hitungan(p.id).total }} terisi
              </span>
              <span v-if="hitungan(p.id).telat" class="chip bad">
                <i class="dot"></i>{{ hitungan(p.id).telat }} telat
              </span>
            </span>
          </span>
          <span class="chev"><MobIcon name="chev" :size="18" /></span>
        </button>
      </div>

      <div v-else class="card emptystate">
        <h3>Belum ada properti</h3>
        <p>Tambahkan properti lewat tampilan desktop untuk mulai mencatat kamar dan penghuni.</p>
      </div>
    </div>
  </MobScreen>
</template>
