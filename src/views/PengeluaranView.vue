<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePengeluaranStore } from '../stores/pengeluaran'
import { usePropertiesStore }  from '../stores/properties'
import { useAppStore }         from '../stores/app'
import { useLogStore }         from '../stores/log'
import { useProperty }         from '../composables/useProperty'
import { useToast }            from '../composables/useToast'
import { fmt, fmtTgl }         from '../utils/format'
import { today }               from '../utils/date'
import type { Pengeluaran }    from '../types'
import ConfirmDialog           from '../components/shared/ConfirmDialog.vue'

const pengeluaran = usePengeluaranStore()
const properties  = usePropertiesStore()
const app         = useAppStore()
const log         = useLogStore()
const { filterByProperty } = useProperty()
const { show: toast } = useToast()

const filtered = computed(() => filterByProperty(pengeluaran.items))
const total = computed(() => filtered.value.reduce((s, p) => s + (p.jumlah || 0), 0))

const DEFAULT_CATEGORIES = ['Listrik', 'Air', 'Internet', 'Kebersihan', 'Perbaikan', 'Lainnya']

const showModal = ref(false)
const editId    = ref<string | null>(null)
const form      = ref<Partial<Pengeluaran>>({})
const modalTitle = computed(() => editId.value ? 'Edit Pengeluaran' : 'Tambah Pengeluaran')

function openAdd() {
  if (app.currentPropertyId === 'all' && properties.items.length === 0) {
    toast('Tambah properti terlebih dahulu', 'error'); return
  }
  editId.value = null
  form.value = {
    tgl: today(),
    kategori: DEFAULT_CATEGORIES[0],
    property_id: app.currentPropertyId === 'all' ? (properties.items[0]?.id ?? '') : app.currentPropertyId
  }
  showModal.value = true
}

function openEdit(p: Pengeluaran) {
  editId.value = p.id
  form.value = { ...p }
  showModal.value = true
}

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
  } catch {
    toast('Gagal menyimpan pengeluaran', 'error')
  }
}

const confirmOpen = ref(false)
const deleteTarget = ref<Pengeluaran | null>(null)
function askDelete(p: Pengeluaran) { deleteTarget.value = p; confirmOpen.value = true }
async function doDelete() {
  if (!deleteTarget.value) return
  try {
    await pengeluaran.remove(deleteTarget.value.id)
    toast('Pengeluaran dihapus', 'success')
    confirmOpen.value = false
    deleteTarget.value = null
  } catch {
    toast('Gagal menghapus pengeluaran', 'error')
  }
}
</script>

<template>
  <div>
    <button class="btn btn-primary" style="margin-bottom:16px" @click="openAdd">+ Tambah Pengeluaran</button>

    <div class="card table-wrap">
      <table>
        <thead>
          <tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Jumlah</th><th>Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="5" style="text-align:center;color:var(--text3);padding:20px">Belum ada pengeluaran</td>
          </tr>
          <tr v-for="p in filtered" :key="p.id">
            <td>{{ fmtTgl(p.tgl) }}</td>
            <td>{{ p.deskripsi }}</td>
            <td><span class="badge bgr">{{ p.kategori }}</span></td>
            <td style="color:var(--red)">{{ fmt(p.jumlah) }}</td>
            <td style="white-space:nowrap">
              <button class="btn-sm btn-edit" @click="openEdit(p)">✏️</button>
              <button class="btn-sm btn-del" @click="askDelete(p)">🗑</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mobile-list">
      <div v-if="filtered.length === 0" class="empty-state"><div class="ei">💸</div><p>Belum ada pengeluaran</p></div>
      <div v-for="p in filtered" :key="p.id" class="mc">
        <div class="mc-top">
          <span class="mc-name">{{ p.deskripsi }}</span>
          <span class="mc-val" style="color:var(--red)">{{ fmt(p.jumlah) }}</span>
        </div>
        <div class="mc-rows">
          <div class="mc-row"><span class="mc-label">Tanggal</span><span class="mc-val">{{ fmtTgl(p.tgl) }}</span></div>
          <div class="mc-row"><span class="mc-label">Kategori</span><span class="mc-val"><span class="badge bgr">{{ p.kategori }}</span></span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-ghost" style="flex:1;font-size:13px" @click="openEdit(p)">✏️ Edit</button>
          <button class="btn btn-danger" style="flex:1;font-size:13px" @click="askDelete(p)">🗑 Hapus</button>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div class="card" style="margin-top:16px">
      <div class="info-row"><span class="info-label">Total Pengeluaran</span><span class="info-val" style="color:var(--red);font-weight:700">{{ fmt(total) }}</span></div>
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
            <div class="fg full"><label>Keterangan / Deskripsi</label><input v-model="form.deskripsi" placeholder="Bayar listrik PLN" /></div>
            <div class="fg"><label>Jumlah (Rp)</label><input v-model.number="form.jumlah" type="number" placeholder="250000" /></div>
            <div class="fg">
              <label>Kategori</label>
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
      :open="confirmOpen"
      icon="🗑"
      :msg="`Hapus pengeluaran ${deleteTarget?.deskripsi}?`"
      ok-label="Hapus"
      :danger="true"
      @confirm="doDelete"
      @cancel="confirmOpen = false"
    />
  </div>
</template>
