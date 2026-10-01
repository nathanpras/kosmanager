<script setup lang="ts">
/* Tab Kalender: grid bulan dengan penanda, dan agenda tanggal yang dipilih.
 *
 * Penanda titik dan daftar agenda diturunkan dari fungsi yang SAMA
 * (agendaTanggal). Di mockup keduanya sempat punya aturan sendiri, sehingga
 * tanggal bertitik "jatuh tempo" bisa punya agenda kosong — penanda yang
 * berbohong. Di sini hal itu tidak mungkin terjadi.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import { useMobile, type Acara } from '../../composables/useMobile'
import { usePropertiesStore } from '../../stores/properties'
import { fmt, fmtTgl, MONTHS_FULL } from '../../utils/format'

const router = useRouter()
const properties = usePropertiesStore()
const { agendaTanggal, penandaBulan, hari } = useMobile()

const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const WARNA: Record<Acara['jenis'], string> = {
  checkin: 'var(--ok)', tempo: 'var(--brand)', telat: 'var(--bad)',
}

/* Bulan tampilan diurai tekstual dari hari ini, bukan lewat Date(iso). */
const [thnKini, blnKini] = hari.value.split('-').map(Number)
const tahun = ref(thnKini)
const bulanIdx = ref(blnKini - 1)

/** Tanggal terpilih; kosong berarti hari ini. */
const dipilih = ref('')

const iso = (d: number) =>
  `${tahun.value}-${String(bulanIdx.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const jumlahHari = computed(() => new Date(tahun.value, bulanIdx.value + 1, 0).getDate())
/* Pekan mulai Senin: getDay() memberi 0 untuk Minggu, jadi digeser. */
const kosongDepan = computed(() => (new Date(tahun.value, bulanIdx.value, 1).getDay() + 6) % 7)

const penanda = computed(() => penandaBulan(tahun.value, bulanIdx.value))

const tglAgenda = computed(() => dipilih.value || hari.value)
const agenda = computed(() => agendaTanggal(tglAgenda.value))

function geser(arah: number) {
  const m = bulanIdx.value + arah
  tahun.value += Math.floor(m / 12)
  bulanIdx.value = ((m % 12) + 12) % 12
  /* Tanggal terpilih milik bulan lama; membawanya ikut akan menyesatkan. */
  dipilih.value = ''
}

function pilih(d: number) {
  const t = iso(d)
  dipilih.value = dipilih.value === t ? '' : t
}

function namaProperti(id: string): string {
  return properties.items.find(p => p.id === id)?.nama ?? ''
}

function bukaAcara(a: Acara) {
  router.push({ name: 'm-kamar', params: { id: a.property_id, nomor: a.kamar } })
}

const IKON: Record<Acara['jenis'], string> = {
  checkin: 'in', tempo: 'receipt', telat: 'warn',
}
const NADA: Record<Acara['jenis'], string> = {
  checkin: 'pos', tempo: 'due', telat: 'neg',
}
const JUDUL: Record<Acara['jenis'], string> = {
  checkin: 'Check-in', tempo: 'Jatuh tempo', telat: 'Telat',
}
</script>

<template>
  <MobScreen judul="Kalender">
    <div class="stagger">
      <section class="card" style="padding:16px 14px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px 8px">
          <button class="iconbtn" aria-label="Bulan sebelumnya" @click="geser(-1)">
            <MobIcon name="back" :size="19" />
          </button>
          <strong style="font-family:var(--f-display);font-weight:700;font-size:18px;letter-spacing:-.02em">
            {{ MONTHS_FULL[bulanIdx] }} {{ tahun }}
          </strong>
          <button class="iconbtn" aria-label="Bulan berikutnya" @click="geser(1)">
            <MobIcon name="chev" :size="19" />
          </button>
        </div>

        <div class="cal-grid">
          <span v-for="d in DOW" :key="d" class="cal-dow">{{ d }}</span>
          <span v-for="n in kosongDepan" :key="`k${n}`" class="cal-day blank"></span>
          <button
            v-for="d in jumlahHari"
            :key="d"
            class="cal-day"
            :class="{ today: iso(d) === hari, 'is-sel': iso(d) === dipilih }"
            @click="pilih(d)"
          >
            {{ d }}
            <span v-if="penanda.get(d)" class="cal-dots">
              <i v-for="j in [...penanda.get(d)!]" :key="j" :style="{ background: WARNA[j] }"></i>
            </span>
          </button>
        </div>

        <div class="legend">
          <span><i style="background:var(--ok)"></i>Check-in</span>
          <span><i style="background:var(--brand)"></i>Jatuh tempo</span>
          <span><i style="background:var(--bad)"></i>Telat</span>
        </div>
      </section>

      <div class="sechead">
        <h2>{{ dipilih ? `Agenda ${fmtTgl(dipilih)}` : 'Agenda hari ini' }}</h2>
        <span class="count">{{ agenda.length }}</span>
      </div>

      <div v-if="agenda.length" class="stack-v">
        <button v-for="(a, i) in agenda" :key="i" class="card tap lrow" @click="bukaAcara(a)">
          <span class="av" :class="NADA[a.jenis]"><MobIcon :name="IKON[a.jenis]" :size="19" /></span>
          <span class="lrow-body">
            <span class="lrow-title">{{ JUDUL[a.jenis] }} · {{ a.nama }}</span>
            <span class="lrow-sub">Kamar {{ a.kamar }} · {{ namaProperti(a.property_id) }}</span>
          </span>
          <span class="lrow-trail">
            <span v-if="a.jenis !== 'checkin'" class="chip mute fig">{{ fmt(Number(a.nilai)) }}</span>
            <span class="chev"><MobIcon name="chev" :size="18" /></span>
          </span>
        </button>
      </div>

      <div v-else class="card emptystate">
        <h3>Tidak ada agenda</h3>
        <p>Tidak ada check-in maupun tagihan jatuh tempo pada tanggal ini.</p>
      </div>
    </div>
  </MobScreen>
</template>
