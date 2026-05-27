<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTagihanStore }     from '../stores/tagihan'
import { usePengeluaranStore } from '../stores/pengeluaran'
import { useProperty }         from '../composables/useProperty'
import { fmt, fmtTgl, MONTHS_FULL } from '../utils/format'
import { bulanIni, monthsBack } from '../utils/date'

const w = window
const tagihan     = useTagihanStore()
const pengeluaran = usePengeluaranStore()
const { filterByProperty } = useProperty()

const months = computed(() => monthsBack(6))
const activeBulan = ref(bulanIni())

const filteredTagihan  = computed(() => filterByProperty(tagihan.items).filter(t => t.bulan === activeBulan.value))
const filteredExp      = computed(() => filterByProperty(pengeluaran.items))

const totalMasuk = computed(() =>
  filteredTagihan.value.reduce((s, t) =>
    s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? Number(t.jumlah) || 0 : 0)), 0)
)
const totalKeluar = computed(() => filteredExp.value.filter(p => {
  if (!p.tgl) return false
  const d = new Date(p.tgl)
  const monthStr = `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
  return monthStr === activeBulan.value
}).reduce((s, p) => s + (p.jumlah || 0), 0))
const net = computed(() => totalMasuk.value - totalKeluar.value)
</script>

<template>
  <div>
    <!-- Month tabs -->
    <div class="tabs" style="margin-bottom:16px">
      <button
        v-for="m in months"
        :key="m"
        class="tab-btn"
        :class="{ active: activeBulan === m }"
        @click="activeBulan = m"
      >{{ m }}</button>
    </div>

    <!-- Summary cards -->
    <div class="metrics">
      <div class="metric mg">
        <div class="m-lbl">Total Masuk</div>
        <div class="m-val green">{{ fmt(totalMasuk) }}</div>
        <div class="m-sub">{{ filteredTagihan.filter(t => t.status === 'lunas').length }} lunas</div>
      </div>
      <div class="metric mr">
        <div class="m-lbl">Total Keluar</div>
        <div class="m-val red">{{ fmt(totalKeluar) }}</div>
      </div>
      <div class="metric" :class="net >= 0 ? 'mg' : 'mr'">
        <div class="m-lbl">Keuntungan Bersih</div>
        <div class="m-val" :class="net >= 0 ? 'green' : 'red'">{{ fmt(net) }}</div>
      </div>
    </div>

    <!-- Charts section placeholder — filled in Task 15 -->
    <div id="charts-section"></div>

    <!-- Tagihan table -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-hd"><div class="card-title">Tagihan {{ activeBulan }}</div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Penghuni</th><th>Kamar</th><th>Jumlah</th><th>Bayar</th><th>Status</th><th>Tgl Bayar</th></tr></thead>
          <tbody>
            <tr v-if="filteredTagihan.length === 0"><td colspan="6" style="text-align:center;color:var(--text3);padding:16px">Belum ada data</td></tr>
            <tr v-for="t in filteredTagihan" :key="t.id">
              <td>{{ t.penghuni }}</td>
              <td>{{ t.kamar }}</td>
              <td>{{ fmt(t.jumlah) }}</td>
              <td>{{ fmt(Number(t.jumlah_bayar) || (t.status === 'lunas' ? t.jumlah : 0)) }}</td>
              <td><span class="badge" :class="t.status === 'lunas' ? 'bg' : t.status === 'kurang' ? 'ba' : 'br'">{{ t.status === 'lunas' ? '✓ Lunas' : t.status === 'kurang' ? '⚠ Kurang' : 'Belum' }}</span></td>
              <td>{{ fmtTgl(t.tgl ?? '') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="info-row" style="padding:8px 16px"><span class="info-label">Total Terkumpul</span><span class="info-val" style="color:var(--green);font-weight:700">{{ fmt(totalMasuk) }}</span></div>
    </div>

    <!-- Print button -->
    <button class="btn btn-ghost" @click="() => w.print()">🖨 Cetak Laporan</button>
  </div>
</template>
