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
import { today }              from '../utils/date'
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

// Group by kategori
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

// Modal state
const showModal = ref(false)
const editId    = ref<string | null>(null)
const form      = ref<Partial<Kamar>>({})
const modalTitle = computed(() => editId.value ? 'Edit Kamar' : 'Tambah Kamar')

function openAdd() {
  editId.value = null
  form.value = { status: 'kosong', tipe: properties.tipeKamar[0]?.nama ?? 'Standard', property_id: app.currentPropertyId === 'all' ? (properties.items[0]?.id ?? '') : app.currentPropertyId }
  showModal.value = true
}

function openEdit(k: Kamar) {
  editId.value = k.id
  form.value = { ...k }
  showModal.value = true
}

async function save() {
  if (!form.value.nomor || !form.value.harga) { toast('Nomor dan harga wajib diisi', 'error'); return }
  if (editId.value) {
    await kamar.update(editId.value, form.value)
    toast('Kamar diperbarui', 'success')
  } else {
    await kamar.add(form.value as Omit<Kamar, 'id'>)
    await log.add(`Kamar ${form.value.nomor} ditambahkan`, 'green', form.value.property_id ?? '')
    toast('Kamar ditambahkan', 'success')
  }
  showModal.value = false
}

// Confirm delete
const confirmOpen = ref(false)
const deleteTarget = ref<Kamar | null>(null)

function askDelete(k: Kamar) { deleteTarget.value = k; confirmOpen.value = true }
async function doDelete() {
  if (!deleteTarget.value) return
  await kamar.remove(deleteTarget.value.id)
  await log.add(`Kamar ${deleteTarget.value.nomor} dihapus`, 'red', deleteTarget.value.property_id)
  toast('Kamar dihapus', 'success')
  confirmOpen.value = false
}

// Detail modal
const showDetail = ref(false)
const detailKamar = ref<Kamar | null>(null)
function openDetail(k: Kamar) { detailKamar.value = k; showDetail.value = true }

const statusLabel: Record<string, string> = {
  kosong: 'Kosong', terisi: 'Terisi', telat: 'Telat Bayar', booked: 'Booked'
}
const statusCls: Record<string, string> = {
  kosong: 'empty', terisi: 'occupied', telat: 'late', booked: 'booked'
}
</script>

<template>
  <div>
    <button class="btn btn-primary" style="margin-bottom:16px" @click="openAdd">+ Tambah Kamar</button>

    <div v-for="group in groups" :key="group.name" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3)">{{ group.name }}</span>
        <span style="flex:1;height:1px;background:var(--border)"></span>
        <span style="font-size:11px;color:var(--text3)">{{ group.items.filter(k => k.status !== 'kosong').length }}/{{ group.items.length }} terisi</span>
      </div>
      <div class="room-grid">
        <div
          v-for="k in group.items"
          :key="k.id"
          class="room-box"
          :class="statusCls[k.status] ?? 'empty'"
          @click="openDetail(k)"
        >
          <div class="room-num">{{ k.nomor }}</div>
          <div class="room-type">{{ k.tipe }}</div>
          <div class="room-stat">{{ statusLabel[k.status] }}</div>
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
            <div class="fg">
              <label>Nomor Kamar</label>
              <input v-model="form.nomor" placeholder="cth: A1, B2" />
            </div>
            <div class="fg">
              <label>Tipe</label>
              <select v-model="form.tipe">
                <option v-for="t in properties.tipeKamar" :key="t.id" :value="t.nama">{{ t.nama }}</option>
              </select>
            </div>
            <div class="fg">
              <label>Harga / Bulan (Rp)</label>
              <input v-model.number="form.harga" type="number" placeholder="1500000" />
            </div>
            <div class="fg">
              <label>Status</label>
              <select v-model="form.status">
                <option value="kosong">Kosong</option>
                <option value="terisi">Terisi</option>
                <option value="telat">Telat Bayar</option>
                <option value="booked">Booked</option>
              </select>
            </div>
            <div class="fg">
              <label>Deposit (Rp)</label>
              <input v-model.number="form.deposit" type="number" placeholder="500000" />
            </div>
            <div class="fg">
              <label>Kategori</label>
              <select v-model="form.kategori">
                <option value="">— Tanpa Kategori —</option>
                <option v-for="k in properties.kategori" :key="k.id" :value="k.nama">{{ k.nama }}</option>
              </select>
            </div>
            <div class="fg full">
              <label>Keterangan</label>
              <textarea v-model="form.keterangan" placeholder="Fasilitas, catatan, dsb..."></textarea>
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
    <div class="overlay" :class="{ open: showDetail }" @click.self="showDetail = false">
      <div v-if="detailKamar" class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <h2>Kamar {{ detailKamar.nomor }}</h2>
          <button class="close-btn" @click="showDetail = false">✕</button>
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
            <div v-for="p in penghuni.items.filter(p => p.kamar === detailKamar!.nomor)" :key="p.id">
              <div class="info-row"><span class="info-label">Nama</span><span class="info-val">{{ p.nama }}</span></div>
              <div class="info-row"><span class="info-label">No HP</span><span class="info-val">{{ p.no_hp }}</span></div>
              <div class="info-row"><span class="info-label">Kontrak s/d</span><span class="info-val">{{ fmtTgl(p.kontrak_selesai ?? '') }}</span></div>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showDetail = false; openEdit(detailKamar!)">✏️ Edit</button>
          <button class="btn btn-danger" @click="showDetail = false; askDelete(detailKamar!)">🗑 Hapus</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      icon="🗑"
      :msg="`Hapus kamar ${deleteTarget?.nomor}?`"
      sub="Semua data terkait kamar ini akan terhapus."
      ok-label="Hapus"
      :danger="true"
      @confirm="doDelete"
      @cancel="confirmOpen = false"
    />
  </div>
</template>
