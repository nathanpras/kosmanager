<script setup lang="ts">
/* Beranda shell mobile: sapaan, ringkasan hari ini, dan daftar properti.
 *
 * Chip statistik di sini sengaja BUKAN tombol. Di mockup ia membuka layar
 * hasil filter, dan layar itu belum diport. Merendernya sebagai tombol yang
 * tidak menuju ke mana-mana persis mengulang jalan buntu yang baru saja
 * dihabiskan di ronde 5 — lebih baik ia jadi angka yang jujur dulu.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import MobMenuSheet from '../../components/mobile/MobMenuSheet.vue'
import { useMobile } from '../../composables/useMobile'
import { useSettingsStore } from '../../stores/settings'
import { useTagihanStore } from '../../stores/tagihan'
import { usePengeluaranStore } from '../../stores/pengeluaran'
import { hitungSaldo, gabungSaldo } from '../../utils/saldo'
import { fmt } from '../../utils/format'
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

/* Saldo berjalan seluruh properti. Angkanya hanya seakurat data yang dicatat
   di aplikasi — bukan saldo bank sungguhan — dan properti yang belum mengatur
   saldo awal ditandai, bukan diam-diam dihitung nol. */
const tagihanStore = useTagihanStore()
const pengeluaranStore = usePengeluaranStore()

const saldo = computed(() => gabungSaldo(
  daftarProperti.value.map(p => hitungSaldo(p, tagihanStore.items, pengeluaranStore.items))))

const adaYangBelumDiatur = computed(() =>
  daftarProperti.value.some(p =>
    hitungSaldo(p, tagihanStore.items, pengeluaranStore.items).belumDiatur))

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

const menuTerbuka = ref(false)

/* Yang bukan pekerjaan harian. Tiga tab bawah sudah dikunci di kontrak desain;
   menambah tab keempat membuat ketiganya lebih sempit demi layar yang jarang
   dibuka. */
/* Hanya yang rutenya sudah ada. Menu yang menampilkan tujuan belum jadi
   persis jalan buntu yang dihabiskan di ronde 5 mockup — sisanya ditambahkan
   di sini begitu layarnya berdiri. */
const MENU = [
  { ikon: 'receipt', judul: 'Tagihan',    sub: 'Seluruh tagihan per bulan',       ke: 'm-tagihan' },
  { ikon: 'build',   judul: 'Keluhan',    sub: 'Laporan kerusakan dan perbaikan', ke: 'm-keluhan' },
  { ikon: 'money',   judul: 'Laporan',    sub: 'Pemasukan, pengeluaran, hunian',  ke: 'm-laporan' },
  { ikon: 'note',    judul: 'Riwayat',    sub: 'Catatan aktivitas aplikasi',      ke: 'm-log' },
  { ikon: 'sliders', judul: 'Pengaturan', sub: 'Data kos, PIN, cadangan',         ke: 'm-pengaturan' },
]

function keMenu(ke: string) {
  menuTerbuka.value = false
  router.push({ name: ke })
}

/* Jalan keluar. Selama shell ini belum jadi bawaan, orang bisa mendarat di
   sini tanpa riwayat navigasi — tanpa tombol ini mereka terjebak, dan satu-
   satunya jalan keluar adalah mengetik ulang alamatnya. */
const AKSI = [
  { ikon: 'more', label: 'Menu', onKlik: () => { menuTerbuka.value = true } },
  { ikon: 'x', label: 'Kembali ke tampilan lama', onKlik: () => router.push('/') },
]
</script>

<template>
  <MobScreen judul="Daftar properti" :aksi="AKSI">
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

      <div class="sechead"><h2>Saldo berjalan</h2></div>
      <section class="card">
        <div class="mlabel">Saldo seluruh properti</div>
        <div class="price">{{ fmt(saldo.saldo) }}</div>
        <div class="lease-grid" style="padding:14px 0 0">
          <div class="kv">
            <div>
              <div class="mlabel">Masuk</div>
              <div class="mval" style="color:var(--ok)">{{ fmt(saldo.masuk) }}</div>
            </div>
            <div>
              <div class="mlabel">Keluar</div>
              <div class="mval" style="color:var(--bad)">{{ fmt(saldo.keluar) }}</div>
            </div>
          </div>
        </div>
        <p v-if="adaYangBelumDiatur" class="fnote" style="margin:12px 0 0">
          Sebagian properti belum mengatur saldo awal, jadi angkanya dihitung
          dari nol. Atur di tampilan desktop.
        </p>
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

    <MobMenuSheet
      v-if="menuTerbuka"
      :items="MENU"
      @tutup="menuTerbuka = false"
      @pilih="keMenu"
    />
  </MobScreen>
</template>
