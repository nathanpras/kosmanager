<script setup lang="ts">
/* Laporan: tiga bagan dan ringkasannya.
 *
 * Bagannya komponen yang sama dengan desktop — dipakai ulang, tidak ditulis
 * ulang untuk layar sempit.
 *
 * Lingkup properti dipilih DI SINI, lewat chip. Desktop punya pemilih properti
 * di bilah atas; shell mobile tidak, dan membiarkan angkanya bergantung pada
 * pilihan yang tidak terlihat di layar ini akan membingungkan.
 */
import { computed, ref } from 'vue'
import MobScreen from '../../components/mobile/MobScreen.vue'
import RevenueBarChart from '../../components/charts/RevenueBarChart.vue'
import ExpensePieChart from '../../components/charts/ExpensePieChart.vue'
import OccupancyTrendChart from '../../components/charts/OccupancyTrendChart.vue'
import { useLaporan } from '../../composables/useLaporan'
import { usePropertiesStore } from '../../stores/properties'
import { fmt } from '../../utils/format'

const properties = usePropertiesStore()
const { bulanTerakhir, pemasukanPerBulan, pengeluaranPerKategori, hunianPerBulan } = useLaporan()

const lingkup = ref('all')

const bulan = computed(() => bulanTerakhir(6))
/* Label dipendekkan: "September 2026" berjejer enam kali tidak muat di 390px. */
const label = computed(() => bulan.value.map(b => b.slice(0, 3)))

const pemasukan = computed(() => pemasukanPerBulan(lingkup.value))
const pengeluaran = computed(() => pengeluaranPerKategori(lingkup.value))
const hunian = computed(() => hunianPerBulan(lingkup.value))

const totalMasuk = computed(() => pemasukan.value.reduce((s, n) => s + n, 0))
const totalKeluar = computed(() => pengeluaran.value.values.reduce((s, n) => s + n, 0))
</script>

<template>
  <MobScreen judul="Laporan" back>
    <div class="filterbar">
      <button class="fchip" :class="{ 'is-on': lingkup === 'all' }" @click="lingkup = 'all'">
        Semua properti
      </button>
      <button
        v-for="p in properties.items"
        :key="p.id"
        class="fchip"
        :class="{ 'is-on': lingkup === p.id }"
        @click="lingkup = p.id"
      >{{ p.nama }}</button>
    </div>

    <div class="stagger">
      <div class="sechead"><h2>Enam bulan terakhir</h2></div>
      <section class="card flush summary">
        <div>
          <div class="mlabel">Masuk</div>
          <div class="amt" style="color:var(--ok)">{{ fmt(totalMasuk) }}</div>
        </div>
        <div>
          <div class="mlabel">Keluar</div>
          <div class="amt" style="color:var(--bad)">{{ fmt(totalKeluar) }}</div>
        </div>
      </section>

      <div class="sechead"><h2>Pemasukan per bulan</h2></div>
      <section class="card">
        <div style="height:210px"><RevenueBarChart :labels="label" :values="pemasukan" /></div>
      </section>

      <div class="sechead"><h2>Pengeluaran per kategori</h2></div>
      <section v-if="pengeluaran.labels.length" class="card">
        <div style="height:230px">
          <ExpensePieChart :labels="pengeluaran.labels" :values="pengeluaran.values" />
        </div>
      </section>
      <div v-else class="card emptystate">
        <h3>Belum ada pengeluaran</h3>
        <p>Catat pengeluaran dari tab Transaksi properti.</p>
      </div>

      <div class="sechead"><h2>Tingkat hunian</h2></div>
      <section class="card">
        <div style="height:210px"><OccupancyTrendChart :labels="label" :values="hunian" /></div>
      </section>
    </div>
  </MobScreen>
</template>
