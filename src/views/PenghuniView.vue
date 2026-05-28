<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePenghuniStore }   from '../stores/penghuni'
import { useKamarStore }      from '../stores/kamar'
import { usePropertiesStore } from '../stores/properties'
import { useAppStore }        from '../stores/app'
import { useLogStore }        from '../stores/log'
import { useProperty }        from '../composables/useProperty'
import { useToast }           from '../composables/useToast'
import { fmtTgl }             from '../utils/format'
import { today }              from '../utils/date'
import type { Penghuni }      from '../types'
import ConfirmDialog          from '../components/shared/ConfirmDialog.vue'

const penghuni   = usePenghuniStore()
const kamar      = useKamarStore()
const properties = usePropertiesStore()
const app        = useAppStore()
const log        = useLogStore()
const { filterByProperty } = useProperty()
const { show: toast } = useToast()

const filtered = computed(() =>
  filterByProperty(penghuni.items).sort((a, b) => a.nama.localeCompare(b.nama))
)

// Avatar
const AVATAR_COLORS = ['#0070C0','#004E86','#B38600','#DC4A4A','#3B7BF5','#7C3AED','#059669','#D97706']
function getInitials(name: string) {
  return (name || '?').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'
}
function avatarBg(idx: number) { return AVATAR_COLORS[idx % AVATAR_COLORS.length] }

function statusPenghuni(p: Penghuni) {
  if (!p.kontrak_selesai) return { cls: 'bg', label: 'Aktif' }
  const days = Math.ceil((new Date(p.kontrak_selesai).getTime() - Date.now()) / 86400000)
  if (days < 0) return { cls: 'br', label: 'Kontrak Habis' }
  if (days <= 30) return { cls: 'ba', label: `Habis ${days}h` }
  return { cls: 'bg', label: 'Aktif' }
}

const showModal  = ref(false)
const editId     = ref<string | null>(null)
const form       = ref<Partial<Penghuni>>({})
const modalTitle = computed(() => editId.value ? 'Edit Penghuni' : 'Tambah Penghuni')

function openAdd() {
  if (app.currentPropertyId === 'all' && properties.items.length === 0) {
    toast('Tambah properti terlebih dahulu', 'error'); return
  }
  editId.value = null
  form.value = { masuk: today(), property_id: app.currentPropertyId === 'all' ? (properties.items[0]?.id ?? '') : app.currentPropertyId }
  showModal.value = true
}
function openEdit(p: Penghuni) { editId.value = p.id; form.value = { ...p }; showModal.value = true }

async function save() {
  if (!form.value.nama || !form.value.kamar || !form.value.no_hp) { toast('Nama, kamar, dan no HP wajib diisi', 'error'); return }
  try {
    if (editId.value) {
      const original = penghuni.items.find(p => p.id === editId.value)
      await penghuni.update(editId.value, form.value)
      if (original && original.kamar !== form.value.kamar) {
        const oldRoom = kamar.items.find(k => k.nomor === original.kamar && k.property_id === original.property_id)
        if (oldRoom) await kamar.update(oldRoom.id, { status: 'kosong' })
        const newRoom = kamar.items.find(k => k.nomor === form.value.kamar)
        if (newRoom) await kamar.update(newRoom.id, { status: 'terisi' })
      }
      toast('Penghuni diperbarui', 'success')
    } else {
      await penghuni.add(form.value as Omit<Penghuni, 'id'>)
      const k = kamar.items.find(k => k.nomor === form.value.kamar)
      if (k) await kamar.update(k.id, { status: 'terisi' })
      await log.add(`${form.value.nama} masuk kamar ${form.value.kamar}`, 'green', form.value.property_id ?? '')
      toast('Penghuni ditambahkan', 'success')
    }
    showModal.value = false
  } catch { toast('Gagal menyimpan penghuni', 'error') }
}

const confirmEvict = ref(false)
const evictTarget  = ref<Penghuni | null>(null)
function askEvict(p: Penghuni) { evictTarget.value = p; confirmEvict.value = true }
async function doEvict() {
  if (!evictTarget.value) return
  try {
    const p = evictTarget.value
    const k = kamar.items.find(k => k.nomor === p.kamar && k.property_id === p.property_id)
    if (k) await kamar.update(k.id, { status: 'kosong' })
    await penghuni.remove(p.id)
    await log.add(`${p.nama} keluar dari kamar ${p.kamar}`, 'red', p.property_id)
    toast(`${p.nama} dikeluarkan`, 'success')
    confirmEvict.value = false; evictTarget.value = null
  } catch { toast('Gagal mengeluarkan penghuni', 'error') }
}

function openWA(p: Penghuni) {
  const num = p.no_hp.replace(/\D/g, '').replace(/^0/, '62')
  window.open(`https://wa.me/${num}`, '_blank')
}
</script>

<template>
  <div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <button class="btn btn-primary" @click="openAdd">+ Tambah Penghuni</button>
      <div style="display:flex;gap:8px">
        <span class="badge bg">{{ filtered.filter(p => statusPenghuni(p).cls === 'bg').length }} aktif</span>
        <span class="badge br">{{ filtered.filter(p => statusPenghuni(p).cls === 'br').length }} habis</span>
      </div>
    </div>

    <!-- Desktop table -->
    <div class="card table-wrap">
      <table>
        <thead>
          <tr><th></th><th>Nama</th><th>Kamar</th><th>No HP</th><th>Masuk</th><th>Kontrak s/d</th><th>Status</th><th>Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="8" style="text-align:center;color:var(--text3);padding:20px">Belum ada penghuni</td>
          </tr>
          <tr v-for="(p, i) in filtered" :key="p.id" class="anim-row" :style="{ '--n': i }">
            <td style="padding-right:6px">
              <div class="avatar avatar-sm" :style="{ background: `linear-gradient(135deg, ${avatarBg(i)}, ${avatarBg(i)}CC)` }">{{ getInitials(p.nama) }}</div>
            </td>
            <td><strong>{{ p.nama }}</strong></td>
            <td><span class="badge bg" style="font-size:11px">{{ p.kamar }}</span></td>
            <td style="color:var(--text2)">{{ p.no_hp }}</td>
            <td style="color:var(--text2)">{{ fmtTgl(p.masuk) }}</td>
            <td style="color:var(--text2)">{{ fmtTgl(p.kontrak_selesai ?? '') }}</td>
            <td><span class="badge" :class="statusPenghuni(p).cls">{{ statusPenghuni(p).label }}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="action-btn wa" @click="openWA(p)" title="WhatsApp">💬</button>
                <button class="action-btn primary" @click="openEdit(p)" title="Edit">✏️</button>
                <button class="action-btn danger" @click="askEvict(p)" title="Keluarkan">🚪</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile cards -->
    <div class="mobile-list">
      <div v-if="filtered.length === 0" class="empty-state"><div class="ei">👤</div><p>Belum ada penghuni</p></div>
      <div v-for="(p, i) in filtered" :key="p.id" class="mc anim-card" :style="{ '--n': i }">
        <div class="mc-top" style="align-items:center">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar avatar-md" :style="{ background: `linear-gradient(135deg, ${avatarBg(i)}, ${avatarBg(i)}CC)`, animation: `avatarIn .4s cubic-bezier(.34,1.3,.64,1) ${i * .05}s both` }">
              {{ getInitials(p.nama) }}
            </div>
            <div>
              <div class="mc-name">{{ p.nama }}</div>
              <span class="badge bg" style="font-size:10px">Kamar {{ p.kamar }}</span>
            </div>
          </div>
          <span class="badge" :class="statusPenghuni(p).cls">{{ statusPenghuni(p).label }}</span>
        </div>
        <div class="mc-rows" style="margin-top:10px">
          <div class="mc-row"><span class="mc-label">No HP</span><span class="mc-val">{{ p.no_hp }}</span></div>
          <div class="mc-row"><span class="mc-label">Masuk</span><span class="mc-val">{{ fmtTgl(p.masuk) }}</span></div>
          <div v-if="p.kontrak_selesai" class="mc-row"><span class="mc-label">Kontrak s/d</span><span class="mc-val">{{ fmtTgl(p.kontrak_selesai) }}</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="action-btn wa" style="flex:1;justify-content:center" @click="openWA(p)">💬 WA</button>
          <button class="action-btn primary" style="flex:1;justify-content:center" @click="openEdit(p)">✏️ Edit</button>
          <button class="action-btn danger" style="flex:1;justify-content:center" @click="askEvict(p)">🚪 Keluar</button>
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
            <div class="fg full"><label>Nama Lengkap</label><input v-model="form.nama" placeholder="Budi Santoso" /></div>
            <div class="fg"><label>Kamar</label>
              <select v-model="form.kamar">
                <option value="">— Pilih Kamar —</option>
                <option v-for="k in kamar.items.filter(k => k.status === 'kosong' || (editId && k.nomor === form.kamar))" :key="k.id" :value="k.nomor">{{ k.nomor }} ({{ k.tipe }})</option>
              </select>
            </div>
            <div class="fg"><label>No HP / WA</label><input v-model="form.no_hp" placeholder="08xxxxxxxxxx" /></div>
            <div class="fg"><label>Tanggal Masuk</label><input v-model="form.masuk" type="date" /></div>
            <div class="fg"><label>Kontrak Selesai</label><input v-model="form.kontrak_selesai" type="date" /></div>
            <div class="fg"><label>Jenis Kelamin</label>
              <select v-model="form.jenis_kelamin"><option value="">—</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
            </div>
            <div class="fg"><label>Pekerjaan</label><input v-model="form.pekerjaan" placeholder="Mahasiswa, Karyawan, dsb" /></div>
            <div class="fg"><label>Asal Daerah</label><input v-model="form.asal" placeholder="Surabaya, Jakarta, dsb" /></div>
            <div class="fg full"><label>Keterangan</label><textarea v-model="form.keterangan" placeholder="Catatan tambahan..."></textarea></div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showModal = false">Batal</button>
          <button class="btn btn-primary" @click="save">Simpan</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmEvict" icon="🚪"
      :msg="`Keluarkan ${evictTarget?.nama} dari kamar ${evictTarget?.kamar}?`"
      sub="Status kamar akan dikembalikan ke Kosong."
      ok-label="Keluarkan" :danger="true"
      @confirm="doEvict" @cancel="confirmEvict = false"
    />
  </div>
</template>
