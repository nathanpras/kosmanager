<script setup lang="ts">
import { ref, computed } from 'vue'
import { deleteField }         from '../firebase'
import { useTagihanStore }     from '../stores/tagihan'
import { usePenghuniStore }    from '../stores/penghuni'
import { useKamarStore }       from '../stores/kamar'
import { usePropertiesStore }  from '../stores/properties'
import { useAppStore }         from '../stores/app'
import { useLogStore }         from '../stores/log'
import { useProperty }         from '../composables/useProperty'
import { useToast }            from '../composables/useToast'
import { useWAReminder, DEFAULT_TEMPLATE } from '../composables/useWAReminder'
import { useSettingsStore }    from '../stores/settings'
import { fmt, fmtTgl, MONTHS_FULL } from '../utils/format'
import { today, bulanIni, monthsBack } from '../utils/date'
import type { Tagihan, TagihanStatus } from '../types'
import ConfirmDialog           from '../components/shared/ConfirmDialog.vue'

const tagihan     = useTagihanStore()
const penghuni    = usePenghuniStore()
const kamar       = useKamarStore()
const properties  = usePropertiesStore()
const app         = useAppStore()
const log         = useLogStore()
const { filterByProperty } = useProperty()
const { show: toast } = useToast()
const settings    = useSettingsStore()
const { generateReminderURL } = useWAReminder()

const months      = computed(() => monthsBack(6))
const activeBulan = ref(bulanIni())

function nextBulanStr(bulan: string): string {
  const [mName, yStr] = bulan.split(' ')
  const idx  = MONTHS_FULL.indexOf(mName)
  const next = (idx + 1) % 12
  return `${MONTHS_FULL[next]} ${next === 0 ? parseInt(yStr) + 1 : yStr}`
}
const nextBulan  = computed(() => nextBulanStr(bulanIni()))
const allMonths  = computed(() => months.value.includes(nextBulan.value) ? months.value : [nextBulan.value, ...months.value])

const filtered  = computed(() => filterByProperty(tagihan.items))
const byMonth   = computed(() => filtered.value.filter(t => t.bulan === activeBulan.value))

const lunasCnt  = computed(() => byMonth.value.filter(t => t.status === 'lunas').length)
const terkumpul = computed(() => byMonth.value.reduce((s, t) => s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? t.jumlah : 0)), 0))
const totalBill = computed(() => byMonth.value.reduce((s, t) => s + (Number(t.jumlah) || 0), 0))
const collPct   = computed(() => totalBill.value > 0 ? Math.min(100, Math.round(terkumpul.value / totalBill.value * 100)) : 0)

function tagStatusInfo(t: Tagihan): TagihanStatus {
  const total   = Number(t.jumlah) || 0
  const dibayar = Number(t.jumlah_bayar) || (t.status === 'lunas' ? total : 0)
  const telat   = !!(t.jatuh_tempo && t.jatuh_tempo < today() && t.status !== 'lunas')
  if (dibayar >= total && total > 0) return { status: 'lunas', cls: 'bg', label: '✓ Lunas', dibayar, sisa: 0 }
  if (dibayar > 0 && dibayar < total) return { status: 'kurang', cls: 'ba', label: '⚠ Kurang Bayar', dibayar, sisa: total - dibayar, telat }
  if (telat) return { status: 'telat', cls: 'br', label: '🔴 Telat', dibayar: 0, sisa: total, telat: true }
  return { status: 'belum', cls: 'br', label: 'Belum Bayar', dibayar: 0, sisa: total }
}
const statusMap = computed(() => {
  const m = new Map<string, TagihanStatus>()
  filtered.value.forEach(t => m.set(t.id, tagStatusInfo(t)))
  return m
})

function trClass(t: Tagihan) {
  const s = statusMap.value.get(t.id)?.status
  if (s === 'lunas') return 'tr-lunas'
  if (s === 'kurang') return 'tr-kurang'
  return 'tr-belum'
}

// Pay modal
const showPay  = ref(false)
const payTarget = ref<Tagihan | null>(null)
const payForm   = ref({ jumlah_bayar: 0, tgl: today() })

function openPay(t: Tagihan) {
  payTarget.value = t
  const info = tagStatusInfo(t)
  payForm.value = { jumlah_bayar: info.sisa || t.jumlah, tgl: today() }
  showPay.value = true
}
async function pay() {
  if (!payTarget.value) return
  try {
    const status = payForm.value.jumlah_bayar >= payTarget.value.jumlah ? 'lunas' : 'kurang'
    await tagihan.update(payTarget.value.id, { jumlah_bayar: payForm.value.jumlah_bayar, tgl: payForm.value.tgl, status })
    await log.add(`${payTarget.value.penghuni} bayar kamar ${payTarget.value.kamar} ${payTarget.value.bulan}`, 'green', payTarget.value.property_id)
    toast('Pembayaran dicatat', 'success')
    showPay.value = false
  } catch { toast('Gagal mencatat pembayaran', 'error') }
}
async function undoPay(t: Tagihan) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tagihan.update(t.id, { status: 'belum', jumlah_bayar: 0, tgl: deleteField() as any })
    toast('Pembayaran dibatalkan', 'success')
  } catch { toast('Gagal membatalkan pembayaran', 'error') }
}

// Add tagihan modal
const showAdd = ref(false)
const addForm = ref<Partial<Tagihan>>({})

function openAddTagihan() {
  if (app.currentPropertyId === 'all' && properties.items.length === 0) {
    toast('Tambah properti terlebih dahulu', 'error'); return
  }
  addForm.value = {
    bulan: activeBulan.value, status: 'belum',
    property_id: app.currentPropertyId === 'all' ? (properties.items[0]?.id ?? '') : app.currentPropertyId,
    createdAt: new Date().toISOString()
  }
  showAdd.value = true
}
function onPenghuniChange() {
  const p = penghuni.items.find(x => x.nama === addForm.value.penghuni)
  if (p) {
    addForm.value.kamar = p.kamar
    const k = kamar.items.find(x => x.nomor === p.kamar)
    if (k) addForm.value.jumlah = k.harga
  }
}
async function saveAdd() {
  if (!addForm.value.penghuni || !addForm.value.jumlah) { toast('Penghuni dan jumlah wajib diisi', 'error'); return }
  try {
    await tagihan.add(addForm.value as Omit<Tagihan, 'id'>)
    toast('Tagihan ditambahkan', 'success'); showAdd.value = false
  } catch { toast('Gagal menambahkan tagihan', 'error') }
}

const confirmDelete = ref(false)
const deleteTarget  = ref<Tagihan | null>(null)
function askDelete(t: Tagihan) { deleteTarget.value = t; confirmDelete.value = true }
async function doDelete() {
  if (!deleteTarget.value) return
  try {
    await tagihan.remove(deleteTarget.value.id)
    toast('Tagihan dihapus', 'success'); confirmDelete.value = false; deleteTarget.value = null
  } catch { toast('Gagal menghapus tagihan', 'error') }
}

// Generate next month's tagihan for all active penghuni
const generating = ref(false)
async function generateNextMonth() {
  if (generating.value) return
  const nb = nextBulan.value
  const existing = new Set(filtered.value.filter(t => t.bulan === nb).map(t => `${t.kamar}|${t.property_id}`))
  const [mName, yStr] = nb.split(' ')
  const mIdx = MONTHS_FULL.indexOf(mName)
  const firstOfMonth = new Date(parseInt(yStr), mIdx, 1).toISOString().split('T')[0]
  const activePenghuni = filterByProperty(penghuni.items).filter(p =>
    !p.kontrak_selesai || p.kontrak_selesai >= firstOfMonth
  )
  const toCreate = activePenghuni.filter(p => !existing.has(`${p.kamar}|${p.property_id}`))
  if (toCreate.length === 0) {
    toast(`Tagihan ${nb} sudah ada`, '')
    activeBulan.value = nb
    return
  }
  generating.value = true
  try {
    for (const p of toCreate) {
      const k = kamar.items.find(k => k.nomor === p.kamar && k.property_id === p.property_id)
      await tagihan.add({ penghuni: p.nama, kamar: p.kamar, bulan: nb, jumlah: k?.harga ?? 0, status: 'belum', property_id: p.property_id, createdAt: new Date().toISOString() })
    }
    const propId = app.currentPropertyId === 'all' ? (properties.items[0]?.id ?? '') : app.currentPropertyId
    await log.add(`Generate ${toCreate.length} tagihan ${nb}`, 'green', propId)
    toast(`${toCreate.length} tagihan ${nb} berhasil dibuat`, 'success')
    activeBulan.value = nb
  } catch { toast('Gagal generate tagihan', 'error') }
  finally { generating.value = false }
}

// Reminder
const showReminder  = ref(false)
const reminderBulan = ref('')
const unpaidForReminder = computed(() => {
  if (!reminderBulan.value) return []
  const template = settings.data.wa_template || DEFAULT_TEMPLATE
  const results: Array<{ tagihan: Tagihan; penghuni: typeof penghuni.items[0]; url: string }> = []
  filterByProperty(tagihan.items)
    .filter(t => t.bulan === reminderBulan.value && (t.status === 'belum' || t.status === 'kurang'))
    .forEach(t => {
      const p = penghuni.items.find(p => p.kamar === t.kamar && p.property_id === t.property_id)
      if (p) results.push({ tagihan: t, penghuni: p, url: generateReminderURL(p, t, template) })
    })
  return results
})
function openReminder(bulan: string) { reminderBulan.value = bulan; showReminder.value = true }
</script>

<template>
  <div>
    <!-- Pill month tabs -->
    <div class="tabs-pill" style="margin-bottom:4px">
      <button
        v-for="(m, i) in allMonths"
        :key="m"
        class="tab-pill anim-pill"
        :class="{ active: activeBulan === m, 'tab-future': m === nextBulan && !months.includes(m) }"
        :style="{ '--i': i }"
        @click="activeBulan = m"
      >{{ m === nextBulan && !months.includes(m) ? '✦ ' + m : m }}</button>
    </div>

    <!-- Action row -->
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn btn-primary" @click="openAddTagihan">+ Tambah Tagihan</button>
      <button class="action-btn" style="background:var(--amber2);color:var(--amber);border:1px solid rgba(179,134,0,.25);touch-action:manipulation" :disabled="generating" @click="generateNextMonth">
        {{ generating ? '⏳ Generating...' : '⚡ Generate ' + nextBulan }}
      </button>
      <button class="action-btn primary" @click="openReminder(activeBulan)">📱 Reminder</button>
    </div>

    <!-- Month summary card -->
    <div class="month-summary anim-card" style="--n:0;margin-bottom:14px">
      <div class="ms-info">
        <div class="ms-title">{{ activeBulan }}</div>
        <div class="ms-sub">{{ lunasCnt }}/{{ byMonth.length }} kamar lunas · Terkumpul {{ fmt(terkumpul) }}</div>
      </div>
      <div class="ms-pct" :style="{ color: collPct >= 80 ? 'var(--green)' : collPct >= 50 ? 'var(--amber)' : 'var(--red)' }">
        {{ collPct }}%
      </div>
    </div>
    <div class="prog-bar-wrap" style="margin-bottom:16px">
      <div class="prog-bar-fill" :style="{ width: collPct + '%', background: collPct >= 80 ? 'var(--green)' : collPct >= 50 ? 'var(--amber)' : 'var(--red)' }"></div>
    </div>

    <!-- Desktop table -->
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Penghuni</th><th>Kamar</th><th>Jumlah</th><th>Status</th><th>Tgl Bayar</th><th>Aksi</th></tr></thead>
        <tbody>
          <tr v-if="byMonth.length === 0">
            <td colspan="6" style="text-align:center;color:var(--text3);padding:20px">Belum ada tagihan {{ activeBulan }}</td>
          </tr>
          <tr v-for="(t, i) in byMonth" :key="t.id" :class="trClass(t)" class="anim-row" :style="{ '--n': i }">
            <td><strong>{{ t.penghuni }}</strong></td>
            <td><span class="badge bg" style="font-size:11px">{{ t.kamar }}</span></td>
            <td style="font-weight:600">{{ fmt(t.jumlah) }}</td>
            <td><span class="badge" :class="statusMap.get(t.id)?.cls">{{ statusMap.get(t.id)?.label }}</span></td>
            <td style="color:var(--text2)">{{ fmtTgl(t.tgl ?? '') }}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button v-if="t.status !== 'lunas'" class="action-btn primary" @click="openPay(t)">💰 Bayar</button>
                <button v-else class="action-btn" style="background:var(--surf2);color:var(--text2);border:1px solid var(--border)" @click="undoPay(t)">↩ Undo</button>
                <button class="action-btn danger" @click="askDelete(t)">🗑</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile cards -->
    <div class="mobile-list">
      <div v-if="byMonth.length === 0" class="empty-state"><div class="ei">🧾</div><p>Belum ada tagihan {{ activeBulan }}</p></div>
      <div v-for="(t, i) in byMonth" :key="t.id" class="mc anim-card" :style="{ '--n': i }">
        <div class="mc-top">
          <span class="mc-name">
            <span class="badge bg" style="font-size:11px;margin-right:6px">{{ t.kamar }}</span>
            {{ t.penghuni }}
          </span>
          <span class="badge" :class="statusMap.get(t.id)?.cls">{{ statusMap.get(t.id)?.label }}</span>
        </div>
        <div class="mc-rows" style="margin-top:8px">
          <div class="mc-row"><span class="mc-label">Tagihan</span><span class="mc-val" style="color:var(--green);font-weight:700">{{ fmt(t.jumlah) }}</span></div>
          <div v-if="t.tgl" class="mc-row"><span class="mc-label">Dibayar</span><span class="mc-val">{{ fmtTgl(t.tgl) }}</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button v-if="t.status !== 'lunas'" class="action-btn primary" style="flex:1;justify-content:center" @click="openPay(t)">💰 Bayar</button>
          <button v-else class="action-btn" style="flex:1;justify-content:center;background:var(--surf2);color:var(--text2);border:1px solid var(--border)" @click="undoPay(t)">↩ Undo</button>
          <button class="action-btn danger" @click="askDelete(t)">🗑</button>
        </div>
      </div>
    </div>

    <!-- Pay Modal -->
    <div class="overlay" :class="{ open: showPay }" @click.self="showPay = false">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head"><h2>Catat Pembayaran</h2><button class="close-btn" @click="showPay = false">✕</button></div>
        <div class="modal-body" v-if="payTarget">
          <div class="info-row"><span class="info-label">Penghuni</span><span class="info-val">{{ payTarget.penghuni }}</span></div>
          <div class="info-row"><span class="info-label">Kamar</span><span class="info-val">{{ payTarget.kamar }}</span></div>
          <div class="info-row"><span class="info-label">Tagihan</span><span class="info-val">{{ fmt(payTarget.jumlah) }}</span></div>
          <hr class="divider">
          <div class="form-grid">
            <div class="fg"><label>Jumlah Bayar (Rp)</label><input v-model.number="payForm.jumlah_bayar" type="number" /></div>
            <div class="fg"><label>Tanggal Bayar</label><input v-model="payForm.tgl" type="date" /></div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showPay = false">Batal</button>
          <button class="btn btn-primary" @click="pay">Simpan</button>
        </div>
      </div>
    </div>

    <!-- Add Tagihan Modal -->
    <div class="overlay" :class="{ open: showAdd }" @click.self="showAdd = false">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head"><h2>Tambah Tagihan</h2><button class="close-btn" @click="showAdd = false">✕</button></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="fg">
              <label>Penghuni</label>
              <select v-model="addForm.penghuni" @change="onPenghuniChange">
                <option value="">— Pilih —</option>
                <option v-for="p in filterByProperty(penghuni.items)" :key="p.id" :value="p.nama">{{ p.nama }} ({{ p.kamar }})</option>
              </select>
            </div>
            <div class="fg"><label>Kamar</label><input v-model="addForm.kamar" readonly /></div>
            <div class="fg"><label>Bulan</label>
              <select v-model="addForm.bulan">
                <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
            <div class="fg"><label>Jumlah (Rp)</label><input v-model.number="addForm.jumlah" type="number" /></div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showAdd = false">Batal</button>
          <button class="btn btn-primary" @click="saveAdd">Simpan</button>
        </div>
      </div>
    </div>

    <!-- Reminder Sheet -->
    <div class="overlay" :class="{ open: showReminder }" @click.self="showReminder = false">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head"><h2>Reminder {{ reminderBulan }}</h2><button class="close-btn" @click="showReminder = false">✕</button></div>
        <div class="modal-body">
          <div v-if="unpaidForReminder.length === 0" class="empty-state">
            <div class="ei">✅</div><p>Semua sudah lunas bulan ini!</p>
          </div>
          <div v-for="item in unpaidForReminder" :key="item.tagihan.id" class="mc" style="margin-bottom:10px">
            <div class="mc-top">
              <span class="mc-name">{{ item.tagihan.kamar }} · {{ item.penghuni.nama }}</span>
              <span class="mc-val" style="color:var(--red);font-weight:700">{{ fmt(item.tagihan.jumlah) }}</span>
            </div>
            <div class="mc-rows" style="margin-bottom:8px">
              <div class="mc-row"><span class="mc-label">HP</span><span class="mc-val">{{ item.penghuni.no_hp }}</span></div>
            </div>
            <a :href="item.url" target="_blank" rel="noopener" class="action-btn wa" style="width:100%;justify-content:center;display:flex;text-decoration:none">📱 Kirim WA</a>
          </div>
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" @click="showReminder = false">Tutup</button></div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmDelete" icon="🗑"
      :msg="`Hapus tagihan ${deleteTarget?.penghuni} bulan ${deleteTarget?.bulan}?`"
      ok-label="Hapus" :danger="true"
      @confirm="doDelete" @cancel="confirmDelete = false"
    />
  </div>
</template>

<style scoped>
.month-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surf);
  border: 1px solid var(--border);
  border-radius: var(--rl);
  padding: 14px 16px;
  border-left: 4px solid var(--green);
}
.ms-title { font-size: 15px; font-weight: 700; }
.ms-sub   { font-size: 12px; color: var(--text3); margin-top: 2px; }
.ms-pct   { font-size: 22px; font-weight: 800; letter-spacing: -1px; }
:deep(.tab-future) { border-style: dashed; color: var(--amber); border-color: rgba(179,134,0,.4); }
:deep(.tab-future.active) { background: linear-gradient(135deg, var(--amber), var(--accent)); border-style: solid; border-color: transparent; color: #fff; }
</style>
