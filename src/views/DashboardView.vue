<script setup lang="ts">
import { computed } from 'vue'
import { useKamarStore }       from '../stores/kamar'
import { usePenghuniStore }    from '../stores/penghuni'
import { useTagihanStore }     from '../stores/tagihan'
import { usePengeluaranStore } from '../stores/pengeluaran'
import { usePropertiesStore }  from '../stores/properties'
import { useAppStore }         from '../stores/app'
import { useProperty }         from '../composables/useProperty'
import { fmt, fmtTgl }         from '../utils/format'
import { bulanIni, today }     from '../utils/date'
import type { TagihanStatus }  from '../types'

const kamar       = useKamarStore()
const penghuni    = usePenghuniStore()
const tagihan     = useTagihanStore()
const pengeluaran = usePengeluaranStore()
const properties  = usePropertiesStore()
const app         = useAppStore()
const { filterByProperty } = useProperty()

const bln = computed(() => bulanIni())

const filteredKamar    = computed(() => filterByProperty(kamar.items))
const filteredPenghuni = computed(() => filterByProperty(penghuni.items))
const filteredTagihan  = computed(() => filterByProperty(tagihan.items))
const filteredExp      = computed(() => filterByProperty(pengeluaran.items))
const filteredExpBln   = computed(() => filteredExp.value.filter(p => {
  if (!p.tgl) return false
  const d = new Date(p.tgl)
  const monthStr = `${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][d.getUTCMonth()]} ${d.getUTCFullYear()}`
  return monthStr === bln.value
}))

const terisi  = computed(() => filteredKamar.value.filter(k => k.status === 'terisi' || k.status === 'telat').length)
const booked  = computed(() => filteredKamar.value.filter(k => k.status === 'booked').length)
const total   = computed(() => filteredKamar.value.length || 1)
const pct     = computed(() => Math.round((terisi.value + booked.value) / total.value * 100))

const tgBln   = computed(() => filteredTagihan.value.filter(t => t.bulan === bln.value))
const masuk   = computed(() => tgBln.value.reduce((s, t) => s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? Number(t.jumlah) || 0 : 0)), 0))
const keluar  = computed(() => filteredExpBln.value.reduce((s, p) => s + (p.jumlah || 0), 0))
const net     = computed(() => masuk.value - keluar.value)

const belumBayar = computed(() =>
  tgBln.value.filter(t => {
    if (t.status !== 'belum' && t.status !== 'kurang') return false
    const k = filteredKamar.value.find(x => x.nomor === t.kamar)
    return !(k && k.status === 'booked')
  })
)

const kontrakAlert = computed(() => {
  const soon = new Date()
  soon.setDate(soon.getDate() + 30)
  const soonStr = soon.toISOString().split('T')[0]
  return filteredPenghuni.value.filter(p =>
    p.kontrak_selesai && p.kontrak_selesai <= soonStr && p.kontrak_selesai >= today()
  )
})

function tagStatusInfo(t: typeof tagihan.items[0]): TagihanStatus {
  const total = Number(t.jumlah) || 0
  const dibayar = Number(t.jumlah_bayar) || (t.status === 'lunas' ? total : 0)
  const telat = !!(t.jatuh_tempo && t.jatuh_tempo < today() && t.status !== 'lunas')
  if (dibayar >= total && total > 0) return { status: 'lunas', cls: 'bg', label: '✓ Lunas', dibayar, sisa: 0 }
  if (dibayar > 0 && dibayar < total) return { status: 'kurang', cls: 'ba', label: '⚠ Kurang Bayar', dibayar, sisa: total - dibayar, telat }
  if (telat) return { status: 'telat', cls: 'br', label: '🔴 Telat', dibayar: 0, sisa: total, telat: true }
  return { status: 'belum', cls: 'br', label: 'Belum Bayar', dibayar: 0, sisa: total }
}

const statusMap = computed(() => {
  const m = new Map<string, TagihanStatus>()
  filteredTagihan.value.forEach(t => m.set(t.id, tagStatusInfo(t)))
  return m
})

// Property comparison mode
const isAllView = computed(() => app.currentPropertyId === 'all' && properties.items.length > 1)
</script>

<template>
  <!-- Property comparison view -->
  <div v-if="isAllView">
    <div class="card">
      <div class="card-hd">
        <div>
          <div class="card-title">📊 Perbandingan Properti</div>
          <div class="card-sub">Ringkasan semua lokasi</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div
          v-for="prop in properties.items"
          :key="prop.id"
          style="border:1px solid var(--border);border-radius:var(--r);padding:12px;cursor:pointer"
          @click="app.setProperty(prop.id)"
        >
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
            <div>
              <div style="font-size:15px;font-weight:700">{{ prop.nama }}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px">
                {{ kamar.items.filter(k => k.property_id === prop.id).length }} kamar
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:20px;font-weight:700;color:var(--green)">
                {{ Math.round((kamar.items.filter(k => k.property_id === prop.id && (k.status === 'terisi' || k.status === 'telat')).length) / (kamar.items.filter(k => k.property_id === prop.id).length || 1) * 100) }}%
              </div>
              <div style="font-size:10px;color:var(--text3)">okupansi</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="alert" style="background:var(--blue2);color:var(--blue)">💡 Klik properti untuk melihat detail lengkap</div>
  </div>

  <!-- Single property dashboard -->
  <div v-else>
    <!-- Alerts -->
    <div v-if="belumBayar.length > 0" class="alert alert-amber">
      ⚠️ <strong>{{ belumBayar.length }} kamar</strong> belum bayar {{ bln }}: {{ belumBayar.map(t => t.kamar).join(', ') }}
    </div>
    <div v-else-if="filteredPenghuni.length > 0" class="alert alert-green">
      ✅ Semua kamar sudah lunas bulan {{ bln }}
    </div>
    <div v-if="kontrakAlert.length > 0" class="alert alert-amber">
      📅 <strong>{{ kontrakAlert.length }} kontrak</strong> habis dalam 30 hari:
      {{ kontrakAlert.map(p => `${p.nama} (${p.kamar}) — ${fmtTgl(p.kontrak_selesai!)}`).join(', ') }}
    </div>

    <!-- Metrics -->
    <div class="metrics">
      <div class="metric mb">
        <div class="m-lbl">Hunian</div>
        <div class="m-val blue">{{ pct }}%</div>
        <div class="prog"><div class="prog-fill" :style="{ width: pct + '%' }"></div></div>
        <div class="m-sub">{{ terisi }} terisi · {{ filteredKamar.length - terisi - booked }} kosong</div>
      </div>
      <div class="metric mg">
        <div class="m-lbl">Pemasukan {{ bln }}</div>
        <div class="m-val green">{{ fmt(masuk) }}</div>
        <div class="m-sub">{{ tgBln.filter(t => t.status === 'lunas').length }}/{{ tgBln.length }} kamar lunas</div>
      </div>
      <div class="metric mr">
        <div class="m-lbl">Pengeluaran</div>
        <div class="m-val red">{{ fmt(keluar) }}</div>
        <div class="m-sub">{{ filteredExpBln.length }} transaksi</div>
      </div>
      <div class="metric" :class="net >= 0 ? 'mg' : 'mr'">
        <div class="m-lbl">Keuntungan Bersih</div>
        <div class="m-val" :class="net >= 0 ? 'green' : 'red'">{{ fmt(net) }}</div>
        <div class="m-sub">{{ net >= 0 ? 'Surplus' : 'Defisit' }}</div>
      </div>
    </div>

    <!-- Recent tagihan -->
    <div class="grid2">
      <div class="card">
        <div class="card-hd"><div class="card-title">Tagihan Terbaru</div></div>
        <!-- Desktop table -->
        <div class="table-wrap">
          <table>
            <thead><tr><th>Penghuni</th><th>Kamar</th><th>Periode</th><th>Jumlah</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-if="filteredTagihan.length === 0">
                <td colspan="5" style="text-align:center;color:var(--text3);padding:20px">Belum ada tagihan</td>
              </tr>
              <tr v-for="t in filteredTagihan.slice(0,6)" :key="t.id">
                <td><strong>{{ t.penghuni }}</strong></td>
                <td>{{ t.kamar }}</td>
                <td style="color:var(--text2)">{{ t.bulan }}</td>
                <td>{{ fmt(t.jumlah) }}</td>
                <td><span class="badge" :class="statusMap.get(t.id)!.cls">{{ statusMap.get(t.id)!.label }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Mobile cards -->
        <div class="mobile-list">
          <div v-if="filteredTagihan.length === 0" class="empty-state"><div class="ei">💳</div><p>Belum ada tagihan</p></div>
          <div v-for="t in filteredTagihan.slice(0,4)" :key="t.id" class="mc">
            <div class="mc-top">
              <span class="mc-name">{{ t.kamar }} <span style="font-size:12px;font-weight:400;color:var(--text2)">{{ t.penghuni }}</span></span>
              <span class="badge" :class="statusMap.get(t.id)!.cls">{{ statusMap.get(t.id)!.label }}</span>
            </div>
            <div class="mc-rows">
              <div class="mc-row"><span class="mc-label">Jumlah</span><span class="mc-val">{{ fmt(t.jumlah) }}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent pengeluaran -->
      <div class="card">
        <div class="card-hd"><div class="card-title">Pengeluaran Terakhir</div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Keterangan</th><th>Kategori</th><th>Jumlah</th></tr></thead>
            <tbody>
              <tr v-if="filteredExp.length === 0">
                <td colspan="3" style="text-align:center;color:var(--text3);padding:20px">Belum ada</td>
              </tr>
              <tr v-for="p in filteredExp.slice(0,4)" :key="p.id">
                <td>{{ p.deskripsi }}</td>
                <td><span class="badge bgr">{{ p.kategori }}</span></td>
                <td>{{ fmt(p.jumlah) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mobile-list">
          <div v-if="filteredExp.length === 0" class="empty-state"><div class="ei">💸</div><p>Belum ada pengeluaran</p></div>
          <div v-for="p in filteredExp.slice(0,3)" :key="p.id" class="mc">
            <div class="mc-top">
              <span class="mc-name">{{ p.deskripsi }}</span>
              <span class="mc-val" style="color:var(--red)">{{ fmt(p.jumlah) }}</span>
            </div>
          </div>
        </div>
        <hr class="divider">
        <div class="info-row"><span class="info-label">Total pengeluaran</span><span class="info-val">{{ fmt(keluar) }}</span></div>
        <div class="info-row"><span class="info-label">Keuntungan bersih</span><span class="info-val" :style="{ color: net >= 0 ? 'var(--green)' : 'var(--red)' }">{{ fmt(net) }}</span></div>
      </div>
    </div>
  </div>
</template>
