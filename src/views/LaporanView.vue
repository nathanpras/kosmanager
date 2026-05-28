<script setup lang="ts">
import { computed } from 'vue'
import { useTagihanStore }     from '../stores/tagihan'
import { usePengeluaranStore } from '../stores/pengeluaran'
import { useKamarStore }       from '../stores/kamar'
import { usePenghuniStore }    from '../stores/penghuni'
import { usePropertiesStore }  from '../stores/properties'
import { useAppStore }         from '../stores/app'
import { useProperty }         from '../composables/useProperty'
import { fmt, fmtTgl, MONTHS_FULL } from '../utils/format'
import { monthsBack }          from '../utils/date'
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
  filterByProperty(pengeluaran.items).forEach(p => {
    map[p.kategori] = (map[p.kategori] ?? 0) + p.jumlah
  })
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

const totalMasuk  = computed(() => filterByProperty(tagihan.items).reduce((s, t) => s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? Number(t.jumlah) || 0 : 0)), 0))
const totalKeluar = computed(() => filterByProperty(pengeluaran.items).reduce((s, p) => s + p.jumlah, 0))
const totalNet    = computed(() => totalMasuk.value - totalKeluar.value)
const lunasCount  = computed(() => filterByProperty(tagihan.items).filter(t => t.status === 'lunas').length)
const totalTagihan = computed(() => filterByProperty(tagihan.items).length)

const propName = computed(() => {
  if (app.currentPropertyId === 'all') return 'Semua Properti'
  return properties.items.find(p => p.id === app.currentPropertyId)?.nama ?? ''
})

function exportPDF() { window.print() }
</script>

<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div style="font-size:13px;color:var(--text3)">{{ propName }}</div>
      <button class="btn btn-ghost btn-sm" @click="exportPDF">📄 Export PDF</button>
    </div>

    <!-- KPI summary metrics -->
    <div class="metrics" style="margin-bottom:20px">
      <div class="kpi-card green anim-metric" style="--n:1">
        <div class="m-lbl">Total Pemasukan</div>
        <div class="m-val green">{{ fmt(totalMasuk) }}</div>
        <div class="m-sub">{{ lunasCount }}/{{ totalTagihan }} tagihan lunas</div>
      </div>
      <div class="kpi-card red anim-metric" style="--n:2">
        <div class="m-lbl">Total Pengeluaran</div>
        <div class="m-val red">{{ fmt(totalKeluar) }}</div>
        <div class="m-sub">{{ filterByProperty(pengeluaran.items).length }} transaksi</div>
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
        <div class="card-hd"><div class="card-title">Rincian Pemasukan</div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Penghuni</th><th>Kamar</th><th>Periode</th><th>Jumlah</th></tr></thead>
            <tbody>
              <tr v-if="filterByProperty(tagihan.items).filter(t => t.status === 'lunas').length === 0">
                <td colspan="4" style="text-align:center;color:var(--text3);padding:20px">Belum ada data</td>
              </tr>
              <tr v-for="(t, i) in filterByProperty(tagihan.items).filter(t => t.status === 'lunas')" :key="t.id" class="anim-row" :style="{ '--n': i }">
                <td>{{ t.penghuni }}</td>
                <td><span class="badge bg" style="font-size:11px">{{ t.kamar }}</span></td>
                <td style="color:var(--text2)">{{ t.bulan }}</td>
                <td style="color:var(--green);font-weight:600">{{ fmt(t.jumlah) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-hd"><div class="card-title">Rincian Pengeluaran</div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Jumlah</th></tr></thead>
            <tbody>
              <tr v-if="filterByProperty(pengeluaran.items).length === 0">
                <td colspan="4" style="text-align:center;color:var(--text3);padding:20px">Belum ada data</td>
              </tr>
              <tr v-for="(p, i) in filterByProperty(pengeluaran.items)" :key="p.id" class="anim-row" :style="{ '--n': i }">
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
