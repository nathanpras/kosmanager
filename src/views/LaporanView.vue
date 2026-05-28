<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTagihanStore }     from '../stores/tagihan'
import { usePengeluaranStore } from '../stores/pengeluaran'
import { useKamarStore }       from '../stores/kamar'
import { usePenghuniStore }    from '../stores/penghuni'
import { usePropertiesStore }  from '../stores/properties'
import { useAppStore }         from '../stores/app'
import { useProperty }         from '../composables/useProperty'
import { fmt, fmtTgl, MONTHS_FULL } from '../utils/format'
import { monthsBack, bulanIni } from '../utils/date'
import RevenueBarChart         from '../components/charts/RevenueBarChart.vue'
import ExpensePieChart         from '../components/charts/ExpensePieChart.vue'
import OccupancyTrendChart     from '../components/charts/OccupancyTrendChart.vue'

const tagihan     = useTagihanStore()
const pengeluaran = usePengeluaranStore()
const kamar       = useKamarStore()
const penghuni    = usePenghuniStore()
const properties  = usePropertiesStore()
const app         = useAppStore()
const { filterByProperty } = useProperty()

// ── MODE FILTER ──
type LaporanMode = 'bulan_ini' | 'pilih_bulan' | 'all_time'
const laporanMode  = ref<LaporanMode>('bulan_ini')
const laporanBulan = ref(bulanIni())

const allBulanOpts = computed(() => {
  const s = new Set<string>()
  filterByProperty(tagihan.items).forEach(t => { if (t.bulan) s.add(t.bulan) })
  filterByProperty(pengeluaran.items).forEach(p => {
    if (!p.tgl) return
    const d = new Date(p.tgl)
    s.add(`${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`)
  })
  const arr = [...s].sort().reverse()
  if (!arr.includes(bulanIni())) arr.unshift(bulanIni())
  return arr
})
const selectedPeriod = computed(() =>
  laporanMode.value === 'all_time' ? 'Semua Waktu'
  : laporanMode.value === 'bulan_ini' ? bulanIni()
  : laporanBulan.value
)
function expMatchesBulan(tgl: string | undefined, bln: string) {
  if (!tgl) return false
  const d = new Date(tgl)
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}` === bln
}

const filteredTg = computed(() =>
  laporanMode.value === 'all_time'
    ? filterByProperty(tagihan.items)
    : filterByProperty(tagihan.items).filter(t => t.bulan === selectedPeriod.value)
)
const filteredExp = computed(() =>
  laporanMode.value === 'all_time'
    ? filterByProperty(pengeluaran.items)
    : filterByProperty(pengeluaran.items).filter(p => expMatchesBulan(p.tgl, selectedPeriod.value))
)

// Sort by kamar order
function sortByKamar<T extends { kamar: string; property_id: string }>(items: T[]): T[] {
  const katList = [...properties.kategori.map(k => k.nama), 'Lainnya']
  return [...items].sort((a, b) => {
    const aRoom = kamar.items.find(k => k.nomor === a.kamar && k.property_id === a.property_id)
    const bRoom = kamar.items.find(k => k.nomor === b.kamar && k.property_id === b.property_id)
    const aIdx = katList.indexOf(aRoom?.kategori ?? 'Lainnya')
    const bIdx = katList.indexOf(bRoom?.kategori ?? 'Lainnya')
    if ((aIdx === -1 ? 999 : aIdx) !== (bIdx === -1 ? 999 : bIdx))
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
    return a.kamar.localeCompare(b.kamar, undefined, { numeric: true })
  })
}

// Charts always show 6-month trend
const months = computed(() => monthsBack(6))

const revenueByMonth = computed(() =>
  months.value.map(bln =>
    filterByProperty(tagihan.items)
      .filter(t => t.bulan === bln)
      .reduce((s, t) => s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? Number(t.jumlah) || 0 : 0)), 0)
  )
)
const expenseByKategori = computed(() => {
  const map: Record<string, number> = {}
  filterByProperty(pengeluaran.items).forEach(p => { map[p.kategori] = (map[p.kategori] ?? 0) + p.jumlah })
  return { labels: Object.keys(map), values: Object.values(map) }
})
const occupancyByMonth = computed(() => {
  const totalRooms = filterByProperty(kamar.items).length || 1
  return months.value.map(bln => {
    const parts = bln.split(' ')
    const monthIdx = MONTHS_FULL.indexOf(parts[0])
    const year = parseInt(parts[1])
    const firstStr = new Date(year, monthIdx, 1).toISOString().split('T')[0]
    const lastStr  = new Date(year, monthIdx + 1, 0).toISOString().split('T')[0]
    const active = filterByProperty(penghuni.items).filter(p => {
      const masuk  = p.masuk ?? '9999-01-01'
      const keluar = p.kontrak_selesai ?? '9999-12-31'
      return masuk <= lastStr && keluar >= firstStr
    }).length
    return Math.round(active / totalRooms * 100)
  })
})

// KPI — respect mode filter
const totalMasuk  = computed(() => filteredTg.value.reduce((s, t) => s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? Number(t.jumlah) || 0 : 0)), 0))
const totalKeluar = computed(() => filteredExp.value.reduce((s, p) => s + p.jumlah, 0))
const totalNet    = computed(() => totalMasuk.value - totalKeluar.value)
const lunasCount  = computed(() => filteredTg.value.filter(t => t.status === 'lunas').length)
const totalTagihan = computed(() => filteredTg.value.length)

// Detail tables — filtered + sorted by kamar
const rincianMasuk = computed(() => sortByKamar(filteredTg.value.filter(t => t.status === 'lunas')))
const rincianKeluar = computed(() => filteredExp.value)

const propName = computed(() => {
  if (app.currentPropertyId === 'all') return 'Semua Properti'
  return properties.items.find(p => p.id === app.currentPropertyId)?.nama ?? ''
})

function exportPDF() { window.print() }
</script>

<template>
  <div>
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div style="font-size:13px;color:var(--text3)">{{ propName }}</div>
      <button class="btn btn-ghost btn-sm" @click="exportPDF">📄 Export PDF</button>
    </div>

    <!-- Mode filter -->
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      <div class="tabs-pill" style="padding:0;gap:6px">
        <button class="tab-pill anim-pill" :class="{ active: laporanMode === 'bulan_ini' }" style="--i:0" @click="laporanMode = 'bulan_ini'">📅 Bulan Ini</button>
        <button class="tab-pill anim-pill" :class="{ active: laporanMode === 'all_time' }" style="--i:1" @click="laporanMode = 'all_time'">📊 All Time</button>
        <button class="tab-pill anim-pill" :class="{ active: laporanMode === 'pilih_bulan' }" style="--i:2" @click="laporanMode = 'pilih_bulan'">🗓 Pilih Bulan</button>
      </div>
      <div v-if="laporanMode === 'pilih_bulan'" class="month-select-wrap">
        <select :value="laporanBulan" @change="laporanBulan = ($event.target as HTMLSelectElement).value">
          <option v-for="b in allBulanOpts" :key="b" :value="b">{{ b }}</option>
        </select>
      </div>
    </div>

    <!-- KPI summary metrics -->
    <div class="metrics" style="margin-bottom:20px">
      <div class="kpi-card green anim-metric" style="--n:1">
        <div class="m-lbl">Total Pemasukan <span style="font-size:10px;color:var(--text3)">{{ selectedPeriod }}</span></div>
        <div class="m-val green">{{ fmt(totalMasuk) }}</div>
        <div class="m-sub">{{ lunasCount }}/{{ totalTagihan }} tagihan lunas</div>
      </div>
      <div class="kpi-card red anim-metric" style="--n:2">
        <div class="m-lbl">Total Pengeluaran <span style="font-size:10px;color:var(--text3)">{{ selectedPeriod }}</span></div>
        <div class="m-val red">{{ fmt(totalKeluar) }}</div>
        <div class="m-sub">{{ filteredExp.length }} transaksi</div>
      </div>
      <div class="kpi-card anim-metric" :class="totalNet >= 0 ? 'green' : 'red'" style="--n:3">
        <div class="m-lbl">Keuntungan Bersih</div>
        <div class="m-val" :class="totalNet >= 0 ? 'green' : 'red'">{{ fmt(totalNet) }}</div>
        <div class="m-sub">{{ totalNet >= 0 ? '📈 Surplus' : '📉 Defisit' }}</div>
      </div>
    </div>

    <!-- Charts grid -->
    <div class="grid2" style="margin-bottom:16px">
      <div class="card anim-card" style="--n:0">
        <div class="card-hd"><div class="card-title">📊 Pemasukan 6 Bulan Terakhir</div></div>
        <div v-if="revenueByMonth.every(v => v === 0)" class="empty-state" style="padding:24px">
          <div class="ei">📊</div><p>Belum ada data pemasukan</p>
        </div>
        <RevenueBarChart v-else :labels="months" :values="revenueByMonth" />
      </div>
      <div class="card anim-card" style="--n:1">
        <div class="card-hd"><div class="card-title">🥧 Pengeluaran per Kategori</div></div>
        <div v-if="expenseByKategori.labels.length === 0" class="empty-state" style="padding:24px">
          <div class="ei">💸</div><p>Belum ada data pengeluaran</p>
        </div>
        <ExpensePieChart v-else :labels="expenseByKategori.labels" :values="expenseByKategori.values" />
      </div>
    </div>

    <div class="card anim-card" style="--n:2;margin-bottom:16px">
      <div class="card-hd"><div class="card-title">📈 Tingkat Hunian 6 Bulan Terakhir</div></div>
      <div v-if="occupancyByMonth.every(v => v === 0)" class="empty-state" style="padding:24px">
        <div class="ei">📈</div><p>Belum ada data hunian</p>
      </div>
      <OccupancyTrendChart v-else :labels="months" :values="occupancyByMonth" />
    </div>

    <!-- Detail tables -->
    <div class="grid2">
      <div class="card">
        <div class="card-hd"><div class="card-title">Rincian Pemasukan</div><span style="font-size:11px;color:var(--text3)">{{ selectedPeriod }}</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Kamar</th><th>Penghuni</th><th>Periode</th><th>Jumlah</th></tr></thead>
            <tbody>
              <tr v-if="rincianMasuk.length === 0">
                <td colspan="4" style="text-align:center;color:var(--text3);padding:20px">Belum ada data</td>
              </tr>
              <tr v-for="(t, i) in rincianMasuk" :key="t.id" class="anim-row" :style="{ '--n': i }">
                <td><span class="badge bg" style="font-size:11px">{{ t.kamar }}</span></td>
                <td>{{ t.penghuni }}</td>
                <td style="color:var(--text2)">{{ t.bulan }}</td>
                <td style="color:var(--green);font-weight:600">{{ fmt(t.jumlah) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-hd"><div class="card-title">Rincian Pengeluaran</div><span style="font-size:11px;color:var(--text3)">{{ selectedPeriod }}</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Jumlah</th></tr></thead>
            <tbody>
              <tr v-if="rincianKeluar.length === 0">
                <td colspan="4" style="text-align:center;color:var(--text3);padding:20px">Belum ada data</td>
              </tr>
              <tr v-for="(p, i) in rincianKeluar" :key="p.id" class="anim-row" :style="{ '--n': i }">
                <td style="color:var(--text2)">{{ fmtTgl(p.tgl) }}</td>
                <td>{{ p.deskripsi }}</td>
                <td><span class="badge bgr">{{ p.kategori }}</span></td>
                <td style="color:var(--red);font-weight:600">{{ fmt(p.jumlah) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
