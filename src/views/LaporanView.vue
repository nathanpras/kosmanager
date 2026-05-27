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

const months = monthsBack(6)

// Revenue bar chart — monthly totals over last 6 months
const revenueByMonth = computed(() =>
  months.map(bln =>
    filterByProperty(tagihan.items)
      .filter(t => t.bulan === bln)
      .reduce((s, t) => s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? Number(t.jumlah) || 0 : 0)), 0)
  )
)

// Expense pie chart — grouped by kategori (all time)
const expenseByKategori = computed(() => {
  const map: Record<string, number> = {}
  filterByProperty(pengeluaran.items).forEach(p => {
    map[p.kategori] = (map[p.kategori] ?? 0) + p.jumlah
  })
  return {
    labels: Object.keys(map),
    values: Object.values(map),
  }
})

// Occupancy trend — active tenants per month / total rooms
const occupancyByMonth = computed(() => {
  const totalRooms = filterByProperty(kamar.items).length || 1
  return months.map(bln => {
    const parts = bln.split(' ')
    const monthIdx = MONTHS_FULL.indexOf(parts[0])
    const year = parseInt(parts[1])
    const firstOfMonth = new Date(year, monthIdx, 1)
    const lastOfMonth  = new Date(year, monthIdx + 1, 0)
    const firstStr = firstOfMonth.toISOString().split('T')[0]
    const lastStr  = lastOfMonth.toISOString().split('T')[0]

    const active = filterByProperty(penghuni.items).filter(p => {
      const masuk  = p.masuk ?? '9999-01-01'
      const keluar = p.kontrak_selesai ?? '9999-12-31'
      return masuk <= lastStr && keluar >= firstStr
    }).length

    return Math.round(active / totalRooms * 100)
  })
})

// Summary totals (all-time for selected property)
const totalMasuk  = computed(() =>
  filterByProperty(tagihan.items).reduce((s, t) =>
    s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? Number(t.jumlah) || 0 : 0)), 0)
)
const totalKeluar = computed(() =>
  filterByProperty(pengeluaran.items).reduce((s, p) => s + p.jumlah, 0)
)
const totalNet = computed(() => totalMasuk.value - totalKeluar.value)

const propName = computed(() => {
  if (app.currentPropertyId === 'all') return 'Semua Properti'
  return properties.items.find(p => p.id === app.currentPropertyId)?.nama ?? ''
})
</script>

<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:13px;color:var(--text3)">{{ propName }}</div>
      <button class="btn btn-ghost btn-sm" @click="() => window.print()">📄 Export PDF</button>
    </div>

    <!-- Summary metrics -->
    <div class="metrics" style="margin-bottom:16px">
      <div class="metric mg">
        <div class="m-lbl">Total Pemasukan</div>
        <div class="m-val green">{{ fmt(totalMasuk) }}</div>
      </div>
      <div class="metric mr">
        <div class="m-lbl">Total Pengeluaran</div>
        <div class="m-val red">{{ fmt(totalKeluar) }}</div>
      </div>
      <div class="metric" :class="totalNet >= 0 ? 'mg' : 'mr'">
        <div class="m-lbl">Keuntungan Bersih</div>
        <div class="m-val" :class="totalNet >= 0 ? 'green' : 'red'">{{ fmt(totalNet) }}</div>
      </div>
    </div>

    <!-- Charts grid -->
    <div class="grid2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-hd">
          <div class="card-title">📊 Pemasukan 6 Bulan Terakhir</div>
        </div>
        <RevenueBarChart :labels="months" :values="revenueByMonth" />
      </div>
      <div class="card">
        <div class="card-hd">
          <div class="card-title">🥧 Pengeluaran per Kategori</div>
        </div>
        <div v-if="expenseByKategori.labels.length === 0" class="empty-state" style="padding:24px">
          <div class="ei">💸</div><p>Belum ada data pengeluaran</p>
        </div>
        <ExpensePieChart
          v-else
          :labels="expenseByKategori.labels"
          :values="expenseByKategori.values"
        />
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-hd">
        <div class="card-title">📈 Tingkat Hunian 6 Bulan Terakhir</div>
      </div>
      <OccupancyTrendChart :labels="months" :values="occupancyByMonth" />
    </div>

    <!-- Tagihan detail table -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-hd"><div class="card-title">Rincian Pemasukan</div></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Penghuni</th><th>Kamar</th><th>Periode</th><th>Jumlah</th></tr>
          </thead>
          <tbody>
            <tr v-if="filterByProperty(tagihan.items).filter(t => t.status === 'lunas').length === 0">
              <td colspan="4" style="text-align:center;color:var(--text3);padding:20px">Belum ada data</td>
            </tr>
            <tr v-for="t in filterByProperty(tagihan.items).filter(t => t.status === 'lunas')" :key="t.id">
              <td>{{ t.penghuni }}</td>
              <td>{{ t.kamar }}</td>
              <td>{{ t.bulan }}</td>
              <td>{{ fmt(t.jumlah) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pengeluaran detail table -->
    <div class="card">
      <div class="card-hd"><div class="card-title">Rincian Pengeluaran</div></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Jumlah</th></tr>
          </thead>
          <tbody>
            <tr v-if="filterByProperty(pengeluaran.items).length === 0">
              <td colspan="4" style="text-align:center;color:var(--text3);padding:20px">Belum ada data</td>
            </tr>
            <tr v-for="p in filterByProperty(pengeluaran.items)" :key="p.id">
              <td>{{ fmtTgl(p.tgl) }}</td>
              <td>{{ p.deskripsi }}</td>
              <td><span class="badge bgr">{{ p.kategori }}</span></td>
              <td>{{ fmt(p.jumlah) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
