<script setup lang="ts">
import { ref, computed } from 'vue'
import { useKamarStore }       from '../stores/kamar'
import { usePenghuniStore }    from '../stores/penghuni'
import { useTagihanStore }     from '../stores/tagihan'
import { usePengeluaranStore } from '../stores/pengeluaran'
import { usePropertiesStore }  from '../stores/properties'
import { useAppStore }         from '../stores/app'
import { useProperty }         from '../composables/useProperty'
import { useMonths }           from '../composables/useMonths'
import { useSaldo }            from '../composables/useSaldo'
import { fmt, fmtTgl }         from '../utils/format'
import { bulanIni, today }     from '../utils/date'
import type { TagihanStatus }  from '../types'
import SesuaikanSaldoDialog    from '../components/shared/SesuaikanSaldoDialog.vue'

const kamar       = useKamarStore()
const penghuni    = usePenghuniStore()
const tagihan     = useTagihanStore()
const pengeluaran = usePengeluaranStore()
const properties  = usePropertiesStore()
const app         = useAppStore()
const { filterByProperty } = useProperty()

// ── 3-MODE TIME FILTER ──
type DashMode = 'bulan_ini' | 'all_time' | 'pilih_bulan'
const dashMode   = ref<DashMode>('bulan_ini')
const dashBulan  = ref(bulanIni())

const filteredKamar    = computed(() => filterByProperty(kamar.items))
const filteredPenghuni = computed(() => filterByProperty(penghuni.items))
const filteredTagihan  = computed(() => filterByProperty(tagihan.items))
const filteredExp      = computed(() => filterByProperty(pengeluaran.items))

// All available months (for picker)
const { availableMonths: allBulan } = useMonths()

// Saldo tidak ikut filter bulan: ini posisi uang sekarang, bukan angka periode.
const { saldo } = useSaldo()
const showSesuaikan = ref(false)
const propertiAktif = computed(() => properties.items.find(p => p.id === app.currentPropertyId) ?? null)

const selectedBulan = computed(() =>
  dashMode.value === 'bulan_ini' ? bulanIni() : dashBulan.value
)

function expMatchesBulan(tgl: string | undefined, bln: string): boolean {
  if (!tgl) return false
  const d = new Date(tgl)
  return ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][d.getUTCMonth()] + ' ' + d.getUTCFullYear() === bln
}

// Filtered by mode
const tgFiltered = computed(() => {
  if (dashMode.value === 'all_time') return filteredTagihan.value
  return filteredTagihan.value.filter(t => t.bulan === selectedBulan.value)
})
const expFiltered = computed(() => {
  if (dashMode.value === 'all_time') return filteredExp.value
  return filteredExp.value.filter(p => expMatchesBulan(p.tgl, selectedBulan.value))
})

const masuk  = computed(() => tgFiltered.value.reduce((s, t) => s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? Number(t.jumlah) || 0 : 0)), 0))
const keluar = computed(() => expFiltered.value.reduce((s, p) => s + (p.jumlah || 0), 0))
const net    = computed(() => masuk.value - keluar.value)

const periodLabel = computed(() => dashMode.value === 'all_time' ? 'Semua Waktu' : selectedBulan.value)
const subTagihan  = computed(() =>
  dashMode.value === 'all_time'
    ? `${filteredTagihan.value.filter(t => t.status === 'lunas').length} lunas dari ${filteredTagihan.value.length} total`
    : `${tgFiltered.value.filter(t => t.status === 'lunas').length}/${tgFiltered.value.length} kamar lunas`
)
const subExp = computed(() =>
  dashMode.value === 'all_time'
    ? `${filteredExp.value.length} transaksi total`
    : `${expFiltered.value.length} transaksi`
)

// Occupancy always real-time
const terisi  = computed(() => filteredKamar.value.filter(k => k.status === 'terisi' || k.status === 'telat').length)
const booked  = computed(() => filteredKamar.value.filter(k => k.status === 'booked').length)
const total   = computed(() => filteredKamar.value.length || 1)
const pct     = computed(() => Math.round((terisi.value + booked.value) / total.value * 100))

// Alerts always bulan ini
const tgBln   = computed(() => filteredTagihan.value.filter(t => t.bulan === bulanIni()))
const belumBayar = computed(() =>
  tgBln.value.filter(t => {
    if (t.status !== 'belum' && t.status !== 'kurang') return false
    // property_id wajib ikut dicocokkan: setelah migrasi penomoran, Waru 23 dan
    // Citra 1 sama-sama punya kamar 101–107. Tanpa ini, mode "Semua Properti"
    // akan mengambil kamar milik properti yang salah.
    const k = filteredKamar.value.find(x => x.nomor === t.kamar && x.property_id === t.property_id)
    return !(k && k.status === 'booked')
  })
)
const telatTagihan = computed(() =>
  filteredTagihan.value.filter(t =>
    (t.status === 'belum' || t.status === 'kurang') && t.jatuh_tempo && t.jatuh_tempo < today()
  )
)
const kontrakExpired = computed(() =>
  filteredPenghuni.value.filter(p => p.kontrak_selesai && p.kontrak_selesai < today())
)
const kontrakAlert = computed(() => {
  const soon = new Date(); soon.setDate(soon.getDate() + 30)
  const soonStr = soon.toISOString().split('T')[0]
  return filteredPenghuni.value.filter(p =>
    p.kontrak_selesai && p.kontrak_selesai <= soonStr && p.kontrak_selesai >= today()
  )
})
const kontrakUrgent = computed(() => {
  const d7 = new Date(); d7.setDate(d7.getDate() + 7)
  const d7Str = d7.toISOString().split('T')[0]
  return filteredPenghuni.value.filter(p =>
    p.kontrak_selesai && p.kontrak_selesai <= d7Str && p.kontrak_selesai >= today()
  )
})
const hasAlerts = computed(() =>
  telatTagihan.value.length > 0 || kontrakExpired.value.length > 0 ||
  kontrakUrgent.value.length > 0 || belumBayar.value.length > 0 || kontrakAlert.value.length > 0
)

function tagStatusInfo(t: typeof tagihan.items[0]): TagihanStatus {
  const tot = Number(t.jumlah) || 0
  const dibayar = Number(t.jumlah_bayar) || (t.status === 'lunas' ? tot : 0)
  const telat = !!(t.jatuh_tempo && t.jatuh_tempo < today() && t.status !== 'lunas')
  if (dibayar >= tot && tot > 0) return { status: 'lunas', cls: 'bg', label: '✓ Lunas', dibayar, sisa: 0 }
  if (dibayar > 0 && dibayar < tot) return { status: 'kurang', cls: 'ba', label: '⚠ Kurang Bayar', dibayar, sisa: tot - dibayar, telat }
  if (telat) return { status: 'telat', cls: 'br', label: '🔴 Telat', dibayar: 0, sisa: tot, telat: true }
  return { status: 'belum', cls: 'br', label: 'Belum Bayar', dibayar: 0, sisa: tot }
}
const statusMap = computed(() => {
  const m = new Map<string, TagihanStatus>()
  filteredTagihan.value.forEach(t => m.set(t.id, tagStatusInfo(t)))
  return m
})

const isAllView = computed(() => app.currentPropertyId === 'all' && properties.items.length > 1)

// ── SMART INSIGHT ──
const hasInsight = computed(() => filteredTagihan.value.length > 0)

// Total tunggakan per penghuni (semua bulan yang belum lunas)
const insightTunggakan = computed(() => {
  const m = new Map<string, number>()
  filteredTagihan.value.forEach(t => {
    if (t.status === 'lunas') return
    const sisa = tagStatusInfo(t).sisa
    if (sisa > 0) m.set(t.penghuni, (m.get(t.penghuni) ?? 0) + sisa)
  })
  return [...m.entries()].map(([nama, sisa]) => ({ nama, sisa })).sort((a, b) => b.sisa - a.sisa)
})
const totalTunggakan = computed(() => insightTunggakan.value.reduce((s, x) => s + x.sisa, 0))

// Penghuni "langganan telat": >=2 tagihan dibayar lewat jatuh tempo atau masih nunggak melewati jatuh tempo
const insightSeringTelat = computed(() => {
  const m = new Map<string, number>()
  filteredTagihan.value.forEach(t => {
    const jt = t.jatuh_tempo
    if (!jt) return
    const bayarTelat   = !!(t.tgl && t.tgl > jt)
    const masihNunggak = (t.status === 'belum' || t.status === 'kurang') && jt < today()
    if (bayarTelat || masihNunggak) m.set(t.penghuni, (m.get(t.penghuni) ?? 0) + 1)
  })
  return [...m.entries()].map(([nama, n]) => ({ nama, n })).filter(x => x.n >= 2).sort((a, b) => b.n - a.n)
})

// Kolektibilitas bulan ini (% terkumpul dari total ditagihkan)
const insightKolekt = computed(() => {
  const tg = filteredTagihan.value.filter(t => t.bulan === bulanIni())
  const billed    = tg.reduce((s, t) => s + (Number(t.jumlah) || 0), 0)
  const collected = tg.reduce((s, t) => s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? Number(t.jumlah) || 0 : 0)), 0)
  return { billed, collected, sisa: billed - collected, pct: billed > 0 ? Math.round(collected / billed * 100) : 0 }
})
</script>

<template>
  <!-- Property comparison view -->
  <div v-if="isAllView">
    <div class="card" style="border-top:3px solid var(--green)">
      <div class="card-hd">
        <div>
          <div class="card-title">📊 Perbandingan Properti</div>
          <div class="card-sub">Ringkasan bulan {{ selectedBulan }}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div
          v-for="prop in properties.items"
          :key="prop.id"
          class="prop-row"
          @click="app.setProperty(prop.id)"
        >
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
            <div>
              <div style="font-size:15px;font-weight:700">{{ prop.nama }}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px">
                {{ kamar.items.filter(k => k.property_id === prop.id).length }} kamar
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:22px;font-weight:800;color:var(--green);letter-spacing:-1px">
                {{ Math.round((kamar.items.filter(k => k.property_id === prop.id && (k.status === 'terisi' || k.status === 'telat')).length) / (kamar.items.filter(k => k.property_id === prop.id).length || 1) * 100) }}%
              </div>
              <div style="font-size:10px;color:var(--text3)">hunian</div>
            </div>
          </div>
          <div style="height:4px;background:var(--surf2);border-radius:2px;overflow:hidden">
            <div :style="{ width: Math.round((kamar.items.filter(k => k.property_id === prop.id && (k.status === 'terisi' || k.status === 'telat')).length) / (kamar.items.filter(k => k.property_id === prop.id).length || 1) * 100) + '%', height: '100%', background: 'var(--green)', borderRadius: '2px', transition: 'width .6s ease' }"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="alert" style="background:var(--blue2);color:var(--blue)">💡 Klik properti untuk melihat detail lengkap</div>
  </div>

  <!-- Single property dashboard -->
  <div v-else>
    <!-- Mode switcher -->
    <div class="mode-bar">
      <div class="tabs-pill" style="padding:0;gap:6px">
        <button
          class="tab-pill anim-pill"
          :class="{ active: dashMode === 'bulan_ini' }"
          style="--i:0"
          @click="dashMode = 'bulan_ini'"
        >📅 Bulan Ini</button>
        <button
          class="tab-pill anim-pill"
          :class="{ active: dashMode === 'all_time' }"
          style="--i:1"
          @click="dashMode = 'all_time'"
        >📊 All Time</button>
        <button
          class="tab-pill anim-pill"
          :class="{ active: dashMode === 'pilih_bulan' }"
          style="--i:2"
          @click="dashMode = 'pilih_bulan'"
        >🗓 Pilih Bulan</button>
      </div>
      <div v-if="dashMode === 'pilih_bulan'" class="month-select-wrap">
        <select :value="dashBulan" @change="dashBulan = ($event.target as HTMLSelectElement).value">
          <option v-for="b in allBulan" :key="b" :value="b">{{ b }}</option>
        </select>
      </div>
    </div>

    <!-- All-time summary strip -->
    <div v-if="dashMode === 'all_time'" class="alltime-strip anim-card" style="--n:0">
      <div class="alltime-col">
        <div class="alltime-label">Total Terkumpul</div>
        <div class="alltime-val">{{ fmt(masuk) }}</div>
      </div>
      <div class="alltime-col">
        <div class="alltime-label">Total Pengeluaran</div>
        <div class="alltime-val">{{ fmt(keluar) }}</div>
      </div>
      <div class="alltime-col">
        <div class="alltime-label">Keuntungan Bersih</div>
        <div class="alltime-val">{{ net >= 0 ? '+' : '' }}{{ fmt(net) }}</div>
      </div>
    </div>

    <!-- Smart proactive alerts -->
    <div v-if="telatTagihan.length > 0" class="alert alert-red" style="animation:slideInLeft .35s ease both">
      🔴 <strong>{{ telatTagihan.length }} tagihan melewati jatuh tempo!</strong>
      Kamar: {{ telatTagihan.map(t => t.kamar).join(', ') }}
    </div>
    <div v-if="kontrakExpired.length > 0" class="alert alert-red" style="animation:slideInLeft .38s ease both">
      🚪 <strong>{{ kontrakExpired.length }} kontrak sudah habis:</strong>
      {{ kontrakExpired.map(p => `${p.nama} (${p.kamar})`).join(', ') }}
    </div>
    <div v-if="kontrakUrgent.length > 0" class="alert alert-red" style="animation:slideInLeft .41s ease both">
      🚨 <strong>{{ kontrakUrgent.length }} kontrak habis dalam 7 hari:</strong>
      {{ kontrakUrgent.map(p => `${p.nama} — ${fmtTgl(p.kontrak_selesai!)}`).join(', ') }}
    </div>
    <div v-if="belumBayar.filter(t => !telatTagihan.find(tt => tt.id === t.id)).length > 0" class="alert alert-amber" style="animation:slideInLeft .44s ease both">
      ⚠️ <strong>{{ belumBayar.filter(t => !telatTagihan.find(tt => tt.id === t.id)).length }} kamar</strong>
      belum bayar {{ bulanIni() }}: {{ belumBayar.filter(t => !telatTagihan.find(tt => tt.id === t.id)).map(t => t.kamar).join(', ') }}
    </div>
    <div v-if="kontrakAlert.filter(p => !kontrakUrgent.find(u => u.id === p.id)).length > 0" class="alert alert-amber" style="animation:slideInLeft .47s ease both">
      📅 <strong>{{ kontrakAlert.filter(p => !kontrakUrgent.find(u => u.id === p.id)).length }} kontrak</strong>
      habis dalam 30 hari: {{ kontrakAlert.filter(p => !kontrakUrgent.find(u => u.id === p.id)).map(p => `${p.nama} (${p.kamar})`).join(', ') }}
    </div>
    <div v-if="!hasAlerts && filteredPenghuni.length > 0" class="alert alert-green" style="animation:slideInLeft .4s ease both">
      ✅ Semua beres! Tidak ada tagihan telat atau kontrak bermasalah.
    </div>

    <!-- Smart insight -->
    <div v-if="hasInsight" class="insight-card anim-card" style="--n:0">
      <div class="insight-hd">💡 Insight</div>
      <div class="insight-grid">
        <div class="insight-item">
          <div class="insight-lbl">Kolektibilitas {{ bulanIni() }}</div>
          <div class="insight-val" :style="{ color: insightKolekt.pct >= 80 ? 'var(--green)' : insightKolekt.pct >= 50 ? 'var(--amber)' : 'var(--red)' }">{{ insightKolekt.pct }}%</div>
          <div class="insight-sub">{{ fmt(insightKolekt.collected) }} / {{ fmt(insightKolekt.billed) }}</div>
        </div>
        <div class="insight-item">
          <div class="insight-lbl">Total Tunggakan</div>
          <div class="insight-val" style="color:var(--red)">{{ fmt(totalTunggakan) }}</div>
          <div class="insight-sub">{{ insightTunggakan.length }} penghuni belum lunas</div>
        </div>
        <div class="insight-item">
          <div class="insight-lbl">Langganan Telat</div>
          <div class="insight-val" :style="{ color: insightSeringTelat.length > 0 ? 'var(--amber)' : 'var(--green)' }">{{ insightSeringTelat.length }}</div>
          <div class="insight-sub">penghuni telat ≥2×</div>
        </div>
      </div>
      <div v-if="insightTunggakan.length > 0" class="insight-row">
        <span class="insight-row-lbl">🔻 Penunggak terbesar</span>
        <div class="insight-chips">
          <span v-for="x in insightTunggakan.slice(0, 3)" :key="x.nama" class="insight-chip">{{ x.nama }} · {{ fmt(x.sisa) }}</span>
        </div>
      </div>
      <div v-if="insightSeringTelat.length > 0" class="insight-row">
        <span class="insight-row-lbl">⏰ Sering telat</span>
        <div class="insight-chips">
          <span v-for="x in insightSeringTelat.slice(0, 3)" :key="x.nama" class="insight-chip amber">{{ x.nama }} ({{ x.n }}×)</span>
        </div>
      </div>
    </div>

    <!-- Metrics -->
    <div class="metrics">
      <div class="metric mb anim-metric" style="--n:1">
        <div class="m-lbl">Hunian Saat Ini</div>
        <div class="m-val blue">{{ pct }}%</div>
        <div class="prog"><div class="prog-fill" :style="{ width: pct + '%' }"></div></div>
        <div class="m-sub">{{ terisi }} terisi<span v-if="booked > 0" style="color:var(--amber)"> · 🟡 {{ booked }} booked</span> · {{ filteredKamar.length - terisi - booked }} kosong</div>
      </div>
      <div class="metric mg anim-metric" style="--n:2">
        <div class="m-lbl">Pemasukan <span class="period-badge">{{ periodLabel }}</span></div>
        <div class="m-val green" style="font-size:18px">{{ fmt(masuk) }}</div>
        <div class="m-sub">{{ subTagihan }}</div>
      </div>
      <div class="metric mr anim-metric" style="--n:3">
        <div class="m-lbl">Pengeluaran <span class="period-badge period-badge--exp">{{ periodLabel }}</span></div>
        <div class="m-val red" style="font-size:18px">{{ fmt(keluar) }}</div>
        <div class="m-sub">{{ subExp }}</div>
      </div>
      <div class="metric anim-metric" :class="net >= 0 ? 'mg' : 'mr'" style="--n:4">
        <div class="m-lbl">Keuntungan <span class="period-badge">{{ periodLabel }}</span></div>
        <div class="m-val" :class="net >= 0 ? 'green' : 'red'" style="font-size:18px">{{ fmt(net) }}</div>
        <div class="m-sub">{{ net >= 0 ? '📈 Surplus' : '📉 Defisit' }}</div>
      </div>
      <div class="metric anim-metric" :class="saldo.saldo >= 0 ? 'mb' : 'mr'" style="--n:5">
        <div class="m-lbl" style="display:flex;justify-content:space-between;align-items:center">
          <span>Saldo Berjalan</span>
          <button class="btn btn-ghost btn-sm" style="padding:2px 8px" @click="showSesuaikan = true">Sesuaikan</button>
        </div>
        <div class="m-val" :class="saldo.saldo >= 0 ? 'blue' : 'red'" style="font-size:18px">{{ fmt(saldo.saldo) }}</div>
        <div class="m-sub" v-if="saldo.belumDiatur">⚠️ Saldo awal belum diatur — ini arus kas, bukan saldo rekening</div>
        <div class="m-sub" v-else>Awal {{ fmt(saldo.saldoAwal) }} · masuk {{ fmt(saldo.masuk) }} · keluar {{ fmt(saldo.keluar) }}</div>
        <div class="m-sub" v-if="propertiAktif?.saldo_awal_tgl">terakhir disesuaikan {{ fmtTgl(propertiAktif?.saldo_awal_tgl ?? '') }}</div>
      </div>
    </div>

    <!-- Recent records -->
    <div class="grid2">
      <div class="card">
        <div class="card-hd" style="flex-wrap:wrap;gap:8px">
          <div class="card-title">Tagihan {{ dashMode === 'all_time' ? 'Terbaru' : 'Bulan ' + periodLabel }}</div>
          <span v-if="tgFiltered.length > 0" style="font-size:11px;color:var(--text3)">{{ tgFiltered.length }} record</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Penghuni</th><th>Kamar</th><th>Periode</th><th>Jumlah</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-if="tgFiltered.length === 0">
                <td colspan="5" style="text-align:center;color:var(--text3);padding:24px">Belum ada tagihan periode ini</td>
              </tr>
              <tr v-for="(t, i) in tgFiltered.slice(0,6)" :key="t.id" class="anim-row" :style="{ '--n': i }">
                <td><strong>{{ t.penghuni }}</strong></td>
                <td><span class="badge bg" style="font-size:11px">{{ t.kamar }}</span></td>
                <td style="color:var(--text2)">{{ t.bulan }}</td>
                <td>{{ fmt(t.jumlah) }}</td>
                <td><span class="badge" :class="statusMap.get(t.id)!.cls">{{ statusMap.get(t.id)!.label }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mobile-list">
          <div v-if="tgFiltered.length === 0" class="empty-state"><div class="ei">💳</div><p>Belum ada tagihan</p></div>
          <div v-for="t in tgFiltered.slice(0,4)" :key="t.id" class="mc">
            <div class="mc-top">
              <span class="mc-name">{{ t.kamar }} <span style="font-size:12px;font-weight:400;color:var(--text2)">{{ t.penghuni }}</span></span>
              <span class="badge" :class="statusMap.get(t.id)!.cls">{{ statusMap.get(t.id)!.label }}</span>
            </div>
            <div class="mc-rows">
              <div class="mc-row"><span class="mc-label">Bulan</span><span class="mc-val" style="color:var(--text2)">{{ t.bulan }}</span></div>
              <div class="mc-row"><span class="mc-label">Jumlah</span><span class="mc-val" style="color:var(--green);font-weight:700">{{ fmt(t.jumlah) }}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-hd" style="flex-wrap:wrap;gap:8px">
          <div class="card-title">Pengeluaran {{ dashMode === 'all_time' ? 'Terbaru' : 'Bulan ' + periodLabel }}</div>
          <span v-if="expFiltered.length > 0" style="font-size:11px;color:var(--text3)">{{ expFiltered.length }} record</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Keterangan</th><th>Kategori</th><th>Jumlah</th></tr></thead>
            <tbody>
              <tr v-if="expFiltered.length === 0">
                <td colspan="3" style="text-align:center;color:var(--text3);padding:24px">Belum ada pengeluaran</td>
              </tr>
              <tr v-for="(p, i) in expFiltered.slice(0,4)" :key="p.id" class="anim-row" :style="{ '--n': i }">
                <td>{{ p.deskripsi }}</td>
                <td><span class="badge bgr">{{ p.kategori }}</span></td>
                <td style="color:var(--red);font-weight:600">{{ fmt(p.jumlah) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mobile-list">
          <div v-if="expFiltered.length === 0" class="empty-state"><div class="ei">💸</div><p>Belum ada pengeluaran</p></div>
          <div v-for="p in expFiltered.slice(0,3)" :key="p.id" class="mc">
            <div class="mc-top">
              <span class="mc-name">{{ p.deskripsi }}</span>
              <span class="mc-val" style="color:var(--red);font-weight:700">{{ fmt(p.jumlah) }}</span>
            </div>
            <div class="mc-rows">
              <div class="mc-row"><span class="mc-label">Kategori</span><span class="badge bgr">{{ p.kategori }}</span></div>
            </div>
          </div>
        </div>
        <hr class="divider">
        <div class="info-row"><span class="info-label">Total pengeluaran</span><span class="info-val" style="color:var(--red)">{{ fmt(keluar) }}</span></div>
        <div class="info-row"><span class="info-label">Keuntungan bersih</span><span class="info-val" :style="{ color: net >= 0 ? 'var(--green)' : 'var(--red)' }">{{ fmt(net) }}</span></div>
      </div>
    </div>
  </div>

  <SesuaikanSaldoDialog :open="showSesuaikan" @close="showSesuaikan = false" />
</template>

<style scoped>
.mode-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.period-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--green2);
  color: var(--green3);
  vertical-align: middle;
}
.period-badge--exp {
  background: var(--red2);
  color: var(--red);
}
.alltime-strip {
  background: linear-gradient(135deg, var(--green), var(--green3));
  color: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.alltime-col { flex: 1; min-width: 100px; }
.alltime-label { font-size: 11px; opacity: .8; margin-bottom: 3px; }
.alltime-val { font-size: 16px; font-weight: 700; }
.prop-row {
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px;
  cursor: pointer;
  transition: all .22s cubic-bezier(.34,1.3,.64,1);
}
.prop-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,112,192,.12);
}

/* Smart insight card */
.insight-card {
  background: var(--surf);
  border: 1px solid var(--border);
  border-radius: var(--rl);
  padding: 14px 16px;
  margin-bottom: 16px;
  border-left: 4px solid var(--blue, #0070c0);
}
.insight-hd { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
.insight-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.insight-item {
  background: var(--surf2);
  border-radius: var(--rs, 10px);
  padding: 10px 12px;
}
.insight-lbl { font-size: 11px; color: var(--text3); margin-bottom: 4px; }
.insight-val { font-size: 19px; font-weight: 800; letter-spacing: -.5px; }
.insight-sub { font-size: 10px; color: var(--text3); margin-top: 2px; }
.insight-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.insight-row-lbl { font-size: 12px; color: var(--text2); font-weight: 600; }
.insight-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.insight-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;
  background: var(--red2);
  color: var(--red);
}
.insight-chip.amber { background: var(--amber2, rgba(179,134,0,.12)); color: var(--amber); }
@media (max-width: 560px) {
  .insight-grid { grid-template-columns: 1fr; }
}
</style>
