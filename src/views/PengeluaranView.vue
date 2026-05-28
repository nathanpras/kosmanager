<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePengeluaranStore } from '../stores/pengeluaran'
import { usePropertiesStore }  from '../stores/properties'
import { useAppStore }         from '../stores/app'
import { useLogStore }         from '../stores/log'
import { useProperty }         from '../composables/useProperty'
import { useToast }            from '../composables/useToast'
import { fmt, fmtTgl, MONTHS_FULL } from '../utils/format'
import { today, bulanIni }         from '../utils/date'
import type { Pengeluaran }    from '../types'
import ConfirmDialog           from '../components/shared/ConfirmDialog.vue'

const pengeluaran = usePengeluaranStore()
const properties  = usePropertiesStore()
const app         = useAppStore()
const log         = useLogStore()
const { filterByProperty } = useProperty()
const { show: toast } = useToast()

const allFiltered = computed(() => filterByProperty(pengeluaran.items))

// Month filter
const activeMonth = ref(bulanIni())
const availableMonths = computed(() => {
  const s = new Set<string>()
  allFiltered.value.forEach(p => {
    if (!p.tgl) return
    const d = new Date(p.tgl)
    s.add(`${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`)
  })
  const arr = [...s].sort().reverse()
  if (!arr.includes(bulanIni())) arr.unshift(bulanIni())
  return arr
})
function tglMatchesBulan(tgl: string | undefined, bln: string) {
  if (!tgl) return false
  const d = new Date(tgl)
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}` === bln
}
const filtered = computed(() =>
  activeMonth.value === 'all'
    ? allFiltered.value
    : allFiltered.value.filter(p => tglMatchesBulan(p.tgl, activeMonth.value))
)
const total    = computed(() => filtered.value.reduce((s, p) => s + (p.jumlah || 0), 0))

const DEFAULT_CATEGORIES = ['Listrik', 'Air', 'Internet', 'Kebersihan', 'Perbaikan', 'Lainnya']
const KAT_COLORS: Record<string, string> = {
  Listrik: '#0070C0', Air: '#3B7BF5', Internet: '#7C3AED',
  Kebersihan: '#059669', Perbaikan: '#DC4A4A', Lainnya: '#B38600'
}
const KAT_ICONS: Record<string, string> = {
  Listrik: '💡', Air: '💧', Internet: '📡',
  Kebersihan: '🧹', Perbaikan: '🔧', Lainnya: '📦'
}
function katColor(kat: string) { return KAT_COLORS[kat] || '#0070C0' }
function katIcon(kat: string)  { return KAT_ICONS[kat]  || '📦' }

// Category breakdown
const katBreakdown = computed(() => {
  const map: Record<string, number> = {}
  filtered.value.forEach(p => { map[p.kategori] = (map[p.kategori] ?? 0) + p.jumlah })
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  const max = entries[0]?.[1] || 1
  return entries.map(([kat, val]) => ({ kat, val, pct: Math.round(val / max * 100), share: Math.round(val / (total.value || 1) * 100) }))
})

const showModal  = ref(false)
const editId     = ref<string | null>(null)
const form       = ref<Partial<Pengeluaran>>({})
const modalTitle = computed(() => editId.value ? 'Edit Pengeluaran' : 'Tambah Pengeluaran')

function openAdd() {
  if (app.currentPropertyId === 'all' && properties.items.length === 0) { toast('Tambah properti terlebih dahulu', 'error'); return }
  editId.value = null
  form.value = { tgl: today(), kategori: DEFAULT_CATEGORIES[0], property_id: app.currentPropertyId === 'all' ? (properties.items[0]?.id ?? '') : app.currentPropertyId }
  showModal.value = true
}
function openEdit(p: Pengeluaran) { editId.value = p.id; form.value = { ...p }; showModal.value = true }

async function save() {
  if (!form.value.deskripsi || form.value.jumlah == null) { toast('Deskripsi dan jumlah wajib diisi', 'error'); return }
  try {
    if (editId.value) {
      await pengeluaran.update(editId.value, form.value)
      toast('Pengeluaran diperbarui', 'success')
    } else {
      await pengeluaran.add(form.value as Omit<Pengeluaran, 'id'>)
      await log.add(`Pengeluaran ${form.value.deskripsi} ${fmt(form.value.jumlah ?? 0)}`, 'red', form.value.property_id ?? '')
      toast('Pengeluaran ditambahkan', 'success')
    }
    showModal.value = false
  } catch { toast('Gagal menyimpan pengeluaran', 'error') }
}

const confirmOpen  = ref(false)
const deleteTarget = ref<Pengeluaran | null>(null)
function askDelete(p: Pengeluaran) { deleteTarget.value = p; confirmOpen.value = true }
async function doDelete() {
  if (!deleteTarget.value) return
  try {
    await pengeluaran.remove(deleteTarget.value.id)
    toast('Pengeluaran dihapus', 'success'); confirmOpen.value = false; deleteTarget.value = null
  } catch { toast('Gagal menghapus pengeluaran', 'error') }
}
</script>

<template>
  <div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <button class="btn btn-primary" @click="openAdd">+ Tambah Pengeluaran</button>
      <div class="total-badge">Total: <strong style="color:var(--red)">{{ fmt(total) }}</strong></div>
    </div>

    <!-- Period filter -->
    <div class="tabs-pill" style="margin-bottom:14px">
      <button
        class="tab-pill"
        :class="{ active: activeMonth === 'all' }"
        @click="activeMonth = 'all'"
      >📊 Semua Waktu</button>
      <button
        v-for="m in availableMonths"
        :key="m"
        class="tab-pill"
        :class="{ active: activeMonth === m }"
        @click="activeMonth = m"
      >{{ m }}</button>
    </div>

    <!-- Category breakdown -->
    <div v-if="katBreakdown.length > 0" class="kat-grid anim-card" style="--n:0;margin-bottom:16px">
      <div
        v-for="(k, i) in katBreakdown"
        :key="k.kat"
        class="kat-card anim-metric"
        :style="{ '--n': i + 1 }"
      >
        <div class="kat-icon-wrap" :style="{ background: katColor(k.kat) + '1A', border: `1px solid ${katColor(k.kat)}33` }">
          <span class="kat-icon">{{ katIcon(k.kat) }}</span>
        </div>
        <div class="kat-info">
          <div class="kat-name">{{ k.kat }}</div>
          <div class="kat-val" :style="{ color: katColor(k.kat) }">{{ fmt(k.val) }}</div>
          <div class="cat-bar">
            <div class="cat-bar-track">
              <div class="cat-bar-fill" :style="{ width: k.pct + '%', background: katColor(k.kat) }"></div>
            </div>
            <span class="kat-share">{{ k.share }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop table -->
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Jumlah</th><th>Aksi</th></tr></thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="5" style="text-align:center;color:var(--text3);padding:20px">Belum ada pengeluaran</td>
          </tr>
          <tr v-for="(p, i) in filtered" :key="p.id" class="anim-row" :style="{ '--n': i }">
            <td style="color:var(--text2)">{{ fmtTgl(p.tgl) }}</td>
            <td><strong>{{ p.deskripsi }}</strong></td>
            <td>
              <span class="badge" :style="{ background: katColor(p.kategori) + '18', color: katColor(p.kategori) }">
                {{ katIcon(p.kategori) }} {{ p.kategori }}
              </span>
            </td>
            <td style="color:var(--red);font-weight:700">{{ fmt(p.jumlah) }}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="action-btn primary" @click="openEdit(p)">✏️</button>
                <button class="action-btn danger" @click="askDelete(p)">🗑</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile cards -->
    <div class="mobile-list">
      <div v-if="filtered.length === 0" class="empty-state"><div class="ei">💸</div><p>Belum ada pengeluaran</p></div>
      <div v-for="(p, i) in filtered" :key="p.id" class="mc anim-card" :style="{ '--n': i }">
        <div class="mc-top" style="align-items:center">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="exp-icon-circle" :style="{ background: katColor(p.kategori) + '1A', border: `1px solid ${katColor(p.kategori)}33` }">
              <span style="font-size:18px">{{ katIcon(p.kategori) }}</span>
            </div>
            <div>
              <div class="mc-name">{{ p.deskripsi }}</div>
              <span class="badge" :style="{ background: katColor(p.kategori) + '18', color: katColor(p.kategori), fontSize: '10px' }">{{ p.kategori }}</span>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:15px;font-weight:700;color:var(--red)">{{ fmt(p.jumlah) }}</div>
            <div style="font-size:11px;color:var(--text3)">{{ fmtTgl(p.tgl) }}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="action-btn primary" style="flex:1;justify-content:center" @click="openEdit(p)">✏️ Edit</button>
          <button class="action-btn danger" style="flex:1;justify-content:center" @click="askDelete(p)">🗑 Hapus</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div class="overlay" :class="{ open: showModal }" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head"><h2>{{ modalTitle }}</h2><button class="close-btn" @click="showModal = false">✕</button></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="fg full"><label>Keterangan / Deskripsi</label><input v-model="form.deskripsi" placeholder="Bayar listrik PLN" /></div>
            <div class="fg"><label>Jumlah (Rp)</label><input v-model.number="form.jumlah" type="number" placeholder="250000" /></div>
            <div class="fg"><label>Kategori</label>
              <select v-model="form.kategori">
                <option v-for="c in DEFAULT_CATEGORIES" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="fg"><label>Tanggal</label><input v-model="form.tgl" type="date" /></div>
            <div class="fg full"><label>Keterangan Tambahan</label><textarea v-model="form.keterangan" placeholder="Opsional..."></textarea></div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showModal = false">Batal</button>
          <button class="btn btn-primary" @click="save">Simpan</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmOpen" icon="🗑"
      :msg="`Hapus pengeluaran ${deleteTarget?.deskripsi}?`"
      ok-label="Hapus" :danger="true"
      @confirm="doDelete" @cancel="confirmOpen = false"
    />
  </div>
</template>

<style scoped>
.total-badge {
  font-size: 13px;
  color: var(--text2);
  background: var(--surf2);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
}
.kat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}
.kat-card {
  background: var(--surf);
  border: 1px solid var(--border);
  border-radius: var(--rl);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform .2s, box-shadow .2s;
}
.kat-card:hover { transform: translateY(-2px); box-shadow: var(--shm); }
.kat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.kat-icon { font-size: 20px; }
.kat-name { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text3); }
.kat-val  { font-size: 14px; font-weight: 700; margin-top: 1px; }
.kat-share { font-size: 10px; color: var(--text3); white-space: nowrap; }
.exp-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
