<script setup lang="ts">
import { ref, computed } from 'vue'
import { useKamarStore }      from '../stores/kamar'
import { usePenghuniStore }   from '../stores/penghuni'
import { usePropertiesStore } from '../stores/properties'
import { useAppStore }        from '../stores/app'
import { useLogStore }        from '../stores/log'
import { useProperty }        from '../composables/useProperty'
import { useToast }           from '../composables/useToast'
import { fmt, fmtTgl }        from '../utils/format'
import type { Kamar }         from '../types'
import ConfirmDialog          from '../components/shared/ConfirmDialog.vue'

const kamar      = useKamarStore()
const penghuni   = usePenghuniStore()
const properties = usePropertiesStore()
const app        = useAppStore()
const log        = useLogStore()
const { filterByProperty } = useProperty()
const { show: toast } = useToast()

const filtered = computed(() => filterByProperty(kamar.items))

const groups = computed(() => {
  const katList = [...properties.kategori.map(k => k.nama), 'Lainnya']
  const map: Record<string, Kamar[]> = {}
  katList.forEach(k => { map[k] = [] })
  const sorted = [...filtered.value].sort((a, b) => a.nomor.localeCompare(b.nomor, undefined, { numeric: true }))
  sorted.forEach(k => {
    const kat = k.kategori && properties.kategori.find(x => x.nama === k.kategori) ? k.kategori : 'Lainnya'
    if (!map[kat]) map[kat] = []
    map[kat].push(k)
  })
  return katList.filter(k => (map[k]?.length ?? 0) > 0).map(k => ({ name: k, items: map[k] }))
})

// Stats
const terisiCount  = computed(() => filtered.value.filter(k => k.status === 'terisi').length)
const telatCount   = computed(() => filtered.value.filter(k => k.status === 'telat').length)
const bookedCount  = computed(() => filtered.value.filter(k => k.status === 'booked').length)
const kosongCount  = computed(() => filtered.value.filter(k => k.status === 'kosong').length)
const hunianPct    = computed(() => filtered.value.length > 0
  ? Math.round((terisiCount.value + telatCount.value + bookedCount.value) / filtered.value.length * 100) : 0)

function dotClass(status: string) {
  if (status === 'terisi') return 'active'
  if (status === 'telat')  return 'late'
  if (status === 'booked') return 'booked'
  return 'empty'
}
function roomStat(k: Kamar) {
  if (k.status === 'terisi') return '👤 Terisi'
  if (k.status === 'telat')  return '⚠ Telat'
  if (k.status === 'booked') return '📋 Booked'
  return '✓ Kosong'
}

// Modal state
const showModal  = ref(false)
const editId     = ref<string | null>(null)
const form       = ref<Partial<Kamar>>({})
const modalTitle = computed(() => editId.value ? 'Edit Kamar' : 'Tambah Kamar')

function openAdd() {
  if (app.currentPropertyId === 'all' && properties.items.length === 0) {
    toast('Tambah properti terlebih dahulu di Pengaturan', 'error'); return
  }
  editId.value = null
  form.value = { status: 'kosong', tipe: properties.tipeKamar[0]?.nama ?? 'Standard', property_id: app.currentPropertyId === 'all' ? (properties.items[0]?.id ?? '') : app.currentPropertyId }
  showModal.value = true
}
function openEdit(k: Kamar) { editId.value = k.id; form.value = { ...k }; showModal.value = true }

async function save() {
  if (!form.value.nomor || form.value.harga == null) { toast('Nomor dan harga wajib diisi', 'error'); return }
  try {
    if (editId.value) {
      await kamar.update(editId.value, form.value)
      toast('Kamar diperbarui', 'success')
    } else {
      await kamar.add(form.value as Omit<Kamar, 'id'>)
      await log.add(`Kamar ${form.value.nomor} ditambahkan`, 'green', form.value.property_id ?? '')
      toast('Kamar ditambahkan', 'success')
    }
    showModal.value = false
  } catch { toast('Gagal menyimpan kamar', 'error') }
}

const confirmOpen  = ref(false)
const deleteTarget = ref<Kamar | null>(null)
function askDelete(k: Kamar) { deleteTarget.value = k; confirmOpen.value = true }
async function doDelete() {
  if (!deleteTarget.value) return
  try {
    await kamar.remove(deleteTarget.value.id)
    await log.add(`Kamar ${deleteTarget.value.nomor} dihapus`, 'red', deleteTarget.value.property_id)
    toast('Kamar dihapus', 'success')
    confirmOpen.value = false; deleteTarget.value = null
  } catch { toast('Gagal menghapus kamar', 'error') }
}

const showDetail  = ref(false)
const detailKamar = ref<Kamar | null>(null)
function openDetail(k: Kamar) { detailKamar.value = k; showDetail.value = true }
function closeDetail() { showDetail.value = false; detailKamar.value = null }
function handleEdit()   { const k = detailKamar.value; if (!k) return; closeDetail(); openEdit(k) }
function handleDelete() { const k = detailKamar.value; if (!k) return; closeDetail(); askDelete(k) }

const statusCls: Record<string, string> = { kosong: 'empty', terisi: 'occupied', telat: 'late', booked: 'booked' }
const statusLabel: Record<string, string> = { kosong: 'Kosong', terisi: 'Terisi', telat: 'Telat Bayar', booked: 'Booked' }
</script>

<template>
  <div>
    <button class="btn btn-primary" style="margin-bottom:16px" @click="openAdd">+ Tambah Kamar</button>

    <!-- Animated stats -->
    <div v-if="filtered.length > 0" class="kamar-stats">
      <div class="ks-card ks-green anim-metric" style="--n:1">
        <div class="ks-val">{{ terisiCount }}</div>
        <div class="ks-lbl">Terisi</div>
      </div>
      <div class="ks-card ks-red anim-metric" style="--n:2">
        <div class="ks-val">{{ telatCount }}</div>
        <div class="ks-lbl">Telat</div>
      </div>
      <div class="ks-card ks-amber anim-metric" style="--n:3">
        <div class="ks-val">{{ bookedCount }}</div>
        <div class="ks-lbl">Booked</div>
      </div>
      <div class="ks-card ks-gray anim-metric" style="--n:4">
        <div class="ks-val">{{ kosongCount }}</div>
        <div class="ks-lbl">Kosong</div>
      </div>
    </div>

    <!-- Occupancy bar -->
    <div v-if="filtered.length > 0" class="occ-wrap anim-card" style="--n:0;margin-bottom:20px">
      <div class="occ-top">
        <span class="occ-label">Tingkat Hunian</span>
        <span class="occ-pct">{{ hunianPct }}%</span>
      </div>
      <div class="prog-bar-wrap">
        <div class="prog-bar-fill" :style="{ width: hunianPct + '%', background: hunianPct >= 80 ? 'var(--green)' : hunianPct >= 50 ? 'var(--amber)' : 'var(--red)' }"></div>
      </div>
    </div>

    <!-- Groups -->
    <div v-for="group in groups" :key="group.name" style="margin-bottom:20px">
      <div class="kat-header">
        <span class="kat-header-text">{{ group.name }}</span>
        <span class="kat-header-badge">{{ group.items.filter(k => k.status !== 'kosong').length }}/{{ group.items.length }}</span>
        <span class="kat-header-line"></span>
        <span style="font-size:11px;color:var(--text3)">{{ group.items.length > 0 ? Math.round(group.items.filter(k => k.status !== 'kosong').length / group.items.length * 100) : 0 }}%</span>
      </div>
      <div class="room-grid">
        <div
          v-for="(k, bi) in group.items"
          :key="k.id"
          class="room-box anim-card"
          :class="statusCls[k.status] ?? 'empty'"
          :style="{ '--n': bi }"
          @click="openDetail(k)"
        >
          <div style="display:flex;justify-content:center;margin-bottom:3px">
            <span class="status-dot" :class="dotClass(k.status)"></span>
          </div>
          <div class="room-num">{{ k.nomor }}</div>
          <div class="room-type">{{ k.tipe }}</div>
          <div class="room-stat">{{ roomStat(k) }}</div>
        </div>
      </div>
    </div>

    <div v-if="filtered.length === 0" class="empty-state">
      <div class="ei">🚪</div><p>Belum ada kamar. Tambah kamar pertama!</p>
    </div>

    <!-- Add/Edit Modal -->
    <div class="overlay" :class="{ open: showModal }" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <h2>{{ modalTitle }}</h2>
          <button class="close-btn" @click="showModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="fg"><label>Nomor Kamar</label><input v-model="form.nomor" placeholder="cth: A1, B2" /></div>
            <div class="fg"><label>Tipe</label>
              <select v-model="form.tipe">
                <option v-for="t in properties.tipeKamar" :key="t.id" :value="t.nama">{{ t.nama }}</option>
              </select>
            </div>
            <div class="fg"><label>Harga / Bulan (Rp)</label><input v-model.number="form.harga" type="number" placeholder="1500000" /></div>
            <div class="fg"><label>Status</label>
              <select v-model="form.status">
                <option value="kosong">Kosong</option><option value="terisi">Terisi</option>
                <option value="telat">Telat Bayar</option><option value="booked">Booked</option>
              </select>
            </div>
            <div class="fg"><label>Deposit (Rp)</label><input v-model.number="form.deposit" type="number" placeholder="500000" /></div>
            <div class="fg"><label>Kategori</label>
              <select v-model="form.kategori">
                <option value="">— Tanpa Kategori —</option>
                <option v-for="k in properties.kategori" :key="k.id" :value="k.nama">{{ k.nama }}</option>
              </select>
            </div>
            <div class="fg full"><label>Keterangan</label><textarea v-model="form.keterangan" placeholder="Fasilitas, catatan, dsb..."></textarea></div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showModal = false">Batal</button>
          <button class="btn btn-primary" @click="save">Simpan</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div class="overlay" :class="{ open: showDetail }" @click.self="closeDetail()">
      <div v-if="detailKamar" class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <h2>Kamar {{ detailKamar.nomor }}</h2>
          <button class="close-btn" @click="closeDetail()">✕</button>
        </div>
        <div class="modal-body">
          <div class="info-row"><span class="info-label">Tipe</span><span class="info-val">{{ detailKamar.tipe }}</span></div>
          <div class="info-row"><span class="info-label">Harga</span><span class="info-val">{{ fmt(detailKamar.harga) }}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-val"><span class="badge" :class="statusCls[detailKamar.status]">{{ statusLabel[detailKamar.status] }}</span></span></div>
          <div v-if="detailKamar.deposit" class="info-row"><span class="info-label">Deposit</span><span class="info-val">{{ fmt(detailKamar.deposit) }}</span></div>
          <div v-if="detailKamar.keterangan" class="info-row"><span class="info-label">Keterangan</span><span class="info-val">{{ detailKamar.keterangan }}</span></div>
          <div v-if="detailKamar.status === 'terisi' || detailKamar.status === 'telat'">
            <hr class="divider">
            <div class="card-title" style="margin-bottom:8px">Penghuni</div>
            <div v-for="p in penghuni.items.filter(p => p.kamar === detailKamar!.nomor && p.property_id === detailKamar!.property_id)" :key="p.id">
              <div class="info-row"><span class="info-label">Nama</span><span class="info-val">{{ p.nama }}</span></div>
              <div class="info-row"><span class="info-label">No HP</span><span class="info-val">{{ p.no_hp }}</span></div>
              <div class="info-row"><span class="info-label">Kontrak s/d</span><span class="info-val">{{ fmtTgl(p.kontrak_selesai ?? '') }}</span></div>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="handleEdit()">✏️ Edit</button>
          <button class="btn btn-danger" @click="handleDelete()">🗑 Hapus</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmOpen" icon="🗑"
      :msg="`Hapus kamar ${deleteTarget?.nomor}?`"
      sub="Semua data terkait kamar ini akan terhapus."
      ok-label="Hapus" :danger="true"
      @confirm="doDelete" @cancel="confirmOpen = false"
    />
  </div>
</template>

<style scoped>
.kamar-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.ks-card {
  border-radius: var(--rl);
  padding: 14px 10px;
  text-align: center;
  border: 1px solid var(--border);
  background: var(--surf);
  position: relative;
  overflow: hidden;
}
.ks-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.ks-green::before { background: var(--green); }
.ks-red::before   { background: var(--red); }
.ks-amber::before { background: var(--amber); }
.ks-gray::before  { background: var(--border2); }
.ks-val { font-size: 24px; font-weight: 800; letter-spacing: -1px; }
.ks-green .ks-val { color: var(--green); }
.ks-red .ks-val   { color: var(--red); }
.ks-amber .ks-val { color: var(--amber); }
.ks-gray .ks-val  { color: var(--text3); }
.ks-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text3); margin-top: 3px; }
.occ-wrap { background: var(--surf); border: 1px solid var(--border); border-radius: var(--rl); padding: 14px 16px; }
.occ-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.occ-label { font-size: 12px; font-weight: 600; color: var(--text2); }
.occ-pct { font-size: 18px; font-weight: 800; color: var(--green); letter-spacing: -0.5px; }
@media(max-width:768px) {
  .kamar-stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
