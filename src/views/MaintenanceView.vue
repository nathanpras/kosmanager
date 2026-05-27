<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMaintenanceStore } from '../stores/maintenance'
import { useKamarStore }       from '../stores/kamar'
import { useLogStore }         from '../stores/log'
import { useAppStore }         from '../stores/app'
import { useProperty }         from '../composables/useProperty'
import { useToast }            from '../composables/useToast'
import { fmtTgl }              from '../utils/format'
import { today }               from '../utils/date'
import type { Maintenance }    from '../types'
import ConfirmDialog           from '../components/shared/ConfirmDialog.vue'

const maintenance = useMaintenanceStore()
const kamar       = useKamarStore()
const log         = useLogStore()
const app         = useAppStore()
const { filterByProperty } = useProperty()
const { show: toast }      = useToast()

const filtered    = computed(() => filterByProperty(maintenance.items))
const open        = computed(() => filtered.value.filter(m => m.status === 'open'))
const inProgress  = computed(() => filtered.value.filter(m => m.status === 'in_progress'))
const selesai     = computed(() => filtered.value.filter(m => m.status === 'selesai'))

const kamarList   = computed(() => filterByProperty(kamar.items).map(k => k.nomor).sort())

// Add/Edit modal
const showModal  = ref(false)
const editId     = ref<string | null>(null)
const form       = ref<Partial<Maintenance>>({})
const modalTitle = computed(() => editId.value ? 'Edit Maintenance' : 'Laporkan Masalah')

function openAdd() {
  editId.value = null
  form.value = {
    status: 'open',
    prioritas: 'medium',
    tgl: today(),
    property_id: app.currentPropertyId === 'all'
      ? (kamar.items[0]?.property_id ?? '')
      : app.currentPropertyId,
  }
  showModal.value = true
}

function openEdit(m: Maintenance) {
  editId.value = m.id
  form.value = { ...m }
  showModal.value = true
}

async function save() {
  if (!form.value.kamar || !form.value.deskripsi) {
    toast('Kamar dan deskripsi wajib diisi', 'error')
    return
  }
  if (!form.value.property_id) {
    toast('Pilih properti terlebih dahulu', 'error')
    return
  }
  try {
    if (editId.value) {
      await maintenance.update(editId.value, form.value)
      toast('Maintenance diperbarui', 'success')
    } else {
      await maintenance.add(form.value as Omit<Maintenance, 'id'>)
      toast('Masalah dilaporkan', 'success')
      // log is best-effort — don't block the modal close
      log.add(`Maintenance dilaporkan: kamar ${form.value.kamar} — ${form.value.deskripsi}`, 'amber', form.value.property_id).catch(() => {})
    }
    showModal.value = false
  } catch {
    toast('Gagal menyimpan laporan', 'error')
  }
}

// Detail modal
const showDetail = ref(false)
const detailItem = ref<Maintenance | null>(null)
const noteInput  = ref('')

function openDetail(m: Maintenance) {
  detailItem.value = m
  noteInput.value  = m.catatan ?? ''
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  detailItem.value = null
}

async function updateStatus(m: Maintenance, status: Maintenance['status']) {
  try {
    await maintenance.update(m.id, { status })
    await log.add(`Maintenance kamar ${m.kamar} → ${status}`, 'blue', m.property_id)
    toast('Status diperbarui', 'success')
    const fresh = maintenance.items.find(item => item.id === m.id)
    if (fresh && detailItem.value?.id === m.id) detailItem.value = { ...fresh, status }
  } catch {
    toast('Gagal memperbarui status', 'error')
  }
}

async function saveNote() {
  if (!detailItem.value) return
  try {
    await maintenance.update(detailItem.value.id, { catatan: noteInput.value })
    if (detailItem.value) detailItem.value = { ...detailItem.value, catatan: noteInput.value }
    toast('Catatan disimpan', 'success')
  } catch {
    toast('Gagal menyimpan catatan', 'error')
  }
}

function handleDetailEdit() {
  const m = detailItem.value
  if (!m) return
  closeDetail()
  openEdit(m)
}

// Confirm delete
const confirmOpen  = ref(false)
const deleteTarget = ref<Maintenance | null>(null)

function askDelete(m: Maintenance) {
  deleteTarget.value = m
  confirmOpen.value = true
}

async function doDelete() {
  if (!deleteTarget.value) return
  try {
    await maintenance.remove(deleteTarget.value.id)
    toast('Laporan dihapus', 'success')
    confirmOpen.value  = false
    deleteTarget.value = null
    closeDetail()
  } catch {
    toast('Gagal menghapus laporan', 'error')
  }
}

const priorityBadge: Record<string, { cls: string; label: string }> = {
  high:   { cls: 'br', label: '🔴 Tinggi' },
  medium: { cls: 'ba', label: '🟡 Sedang' },
  low:    { cls: 'bgr', label: '⚪ Rendah' },
}

const statusBadgeCls: Record<string, string> = {
  open: 'br', in_progress: 'ba', selesai: 'bg',
}
const statusLabel: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', selesai: 'Selesai',
}
</script>

<template>
  <div>
    <button class="btn btn-primary" style="margin-bottom:16px" @click="openAdd">
      + Laporkan Masalah
    </button>

    <div v-if="filtered.length === 0" class="empty-state">
      <div class="ei">🔧</div>
      <p>Belum ada laporan maintenance.</p>
    </div>

    <!-- Desktop kanban board -->
    <div v-else style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px" class="table-wrap">
      <!-- Open column -->
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--red);margin-bottom:10px;padding:6px 10px;background:var(--red2);border-radius:8px">
          🔴 Open ({{ open.length }})
        </div>
        <div v-if="open.length === 0" style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Tidak ada</div>
        <div
          v-for="m in open" :key="m.id"
          class="card" style="cursor:pointer;margin-bottom:10px"
          @click="openDetail(m)"
        >
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
            <div style="font-weight:700;font-size:14px">Kamar {{ m.kamar }}</div>
            <span class="badge" :class="priorityBadge[m.prioritas]?.cls ?? 'bgr'">{{ priorityBadge[m.prioritas]?.label ?? m.prioritas }}</span>
          </div>
          <div style="font-size:13px;color:var(--text2)">{{ m.deskripsi }}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:6px">{{ fmtTgl(m.tgl) }}</div>
        </div>
      </div>

      <!-- In Progress column -->
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--amber);margin-bottom:10px;padding:6px 10px;background:var(--amber2);border-radius:8px">
          🟡 In Progress ({{ inProgress.length }})
        </div>
        <div v-if="inProgress.length === 0" style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Tidak ada</div>
        <div
          v-for="m in inProgress" :key="m.id"
          class="card" style="cursor:pointer;margin-bottom:10px"
          @click="openDetail(m)"
        >
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
            <div style="font-weight:700;font-size:14px">Kamar {{ m.kamar }}</div>
            <span class="badge" :class="priorityBadge[m.prioritas]?.cls ?? 'bgr'">{{ priorityBadge[m.prioritas]?.label ?? m.prioritas }}</span>
          </div>
          <div style="font-size:13px;color:var(--text2)">{{ m.deskripsi }}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:6px">{{ fmtTgl(m.tgl) }}</div>
        </div>
      </div>

      <!-- Selesai column -->
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--green3);margin-bottom:10px;padding:6px 10px;background:var(--green2);border-radius:8px">
          ✅ Selesai ({{ selesai.length }})
        </div>
        <div v-if="selesai.length === 0" style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Tidak ada</div>
        <div
          v-for="m in selesai" :key="m.id"
          class="card" style="cursor:pointer;margin-bottom:10px;opacity:0.75"
          @click="openDetail(m)"
        >
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
            <div style="font-weight:700;font-size:14px">Kamar {{ m.kamar }}</div>
            <span class="badge" :class="priorityBadge[m.prioritas]?.cls ?? 'bgr'">{{ priorityBadge[m.prioritas]?.label ?? m.prioritas }}</span>
          </div>
          <div style="font-size:13px;color:var(--text2)">{{ m.deskripsi }}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:6px">{{ fmtTgl(m.tgl) }}</div>
        </div>
      </div>
    </div>

    <!-- Mobile list (stacked cards) -->
    <div class="mobile-list">
      <div v-for="m in filtered" :key="m.id" class="mc" @click="openDetail(m)">
        <div class="mc-top">
          <span class="mc-name">Kamar {{ m.kamar }}</span>
          <span class="badge" :class="priorityBadge[m.prioritas]?.cls ?? 'bgr'">{{ priorityBadge[m.prioritas]?.label ?? m.prioritas }}</span>
        </div>
        <div class="mc-rows">
          <div class="mc-row"><span class="mc-label">Masalah</span><span class="mc-val">{{ m.deskripsi }}</span></div>
          <div class="mc-row">
            <span class="mc-label">Status</span>
            <span class="badge" :class="statusBadgeCls[m.status]">{{ statusLabel[m.status] }}</span>
          </div>
          <div class="mc-row"><span class="mc-label">Tanggal</span><span class="mc-val">{{ fmtTgl(m.tgl) }}</span></div>
        </div>
      </div>
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
            <div class="fg">
              <label>Kamar</label>
              <select v-model="form.kamar">
                <option value="">— Pilih Kamar —</option>
                <option v-for="k in kamarList" :key="k" :value="k">{{ k }}</option>
              </select>
            </div>
            <div class="fg">
              <label>Prioritas</label>
              <select v-model="form.prioritas">
                <option value="low">⚪ Rendah</option>
                <option value="medium">🟡 Sedang</option>
                <option value="high">🔴 Tinggi</option>
              </select>
            </div>
            <div class="fg full">
              <label>Deskripsi Masalah</label>
              <textarea v-model="form.deskripsi" placeholder="cth: AC mati, lampu kamar mandi rusak..."></textarea>
            </div>
            <div class="fg">
              <label>Tanggal Lapor</label>
              <input type="date" v-model="form.tgl" />
            </div>
            <div class="fg">
              <label>Status</label>
              <select v-model="form.status">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>
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
      <div v-if="detailItem" class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <h2>Kamar {{ detailItem.kamar }}</h2>
          <button class="close-btn" @click="closeDetail()">✕</button>
        </div>
        <div class="modal-body">
          <div class="info-row"><span class="info-label">Masalah</span><span class="info-val">{{ detailItem.deskripsi }}</span></div>
          <div class="info-row">
            <span class="info-label">Prioritas</span>
            <span class="info-val">
              <span class="badge" :class="priorityBadge[detailItem.prioritas]?.cls">{{ priorityBadge[detailItem.prioritas]?.label }}</span>
            </span>
          </div>
          <div class="info-row"><span class="info-label">Tanggal</span><span class="info-val">{{ fmtTgl(detailItem.tgl) }}</span></div>
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-val">
              <span class="badge" :class="statusBadgeCls[detailItem.status]">{{ statusLabel[detailItem.status] }}</span>
            </span>
          </div>
          <hr class="divider">
          <div class="fg" style="margin-bottom:10px">
            <label>Catatan Pengerjaan</label>
            <textarea v-model="noteInput" placeholder="Tambah catatan pengerjaan..." rows="3"></textarea>
          </div>
          <button class="btn btn-sm btn-ghost" style="margin-bottom:16px" @click="saveNote">💾 Simpan Catatan</button>
          <hr class="divider">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:8px">Ubah Status</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button v-if="detailItem.status !== 'open'" class="btn btn-sm" style="background:var(--red2);color:var(--red);border-color:#F5A0A0" @click="updateStatus(detailItem, 'open')">🔴 Open</button>
            <button v-if="detailItem.status !== 'in_progress'" class="btn btn-sm" style="background:var(--amber2);color:var(--amber);border-color:#F5D070" @click="updateStatus(detailItem, 'in_progress')">🟡 In Progress</button>
            <button v-if="detailItem.status !== 'selesai'" class="btn btn-sm btn-primary" @click="updateStatus(detailItem, 'selesai')">✅ Selesai</button>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="handleDetailEdit">✏️ Edit</button>
          <button class="btn btn-danger" @click="askDelete(detailItem)">🗑 Hapus</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      icon="🗑"
      msg="Hapus laporan maintenance ini?"
      ok-label="Hapus"
      :danger="true"
      @confirm="doDelete"
      @cancel="confirmOpen = false"
    />
  </div>
</template>
