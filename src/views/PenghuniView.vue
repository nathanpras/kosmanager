<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePenghuniStore }   from '../stores/penghuni'
import { useKamarStore }      from '../stores/kamar'
import { useTagihanStore }    from '../stores/tagihan'
import { usePropertiesStore } from '../stores/properties'
import { useAppStore }        from '../stores/app'
import { useLogStore }        from '../stores/log'
import { useProperty }        from '../composables/useProperty'
import { useToast }           from '../composables/useToast'
import { useOccupancy }       from '../composables/useOccupancy'
import { useTagihanCalc }     from '../composables/useTagihanCalc'
import { fmtTgl }             from '../utils/format'
import { today, bulanFromTgl } from '../utils/date'
import type { Penghuni }      from '../types'
import ConfirmDialog          from '../components/shared/ConfirmDialog.vue'

const penghuni   = usePenghuniStore()
const kamar      = useKamarStore()
const tagihan    = useTagihanStore()
const properties = usePropertiesStore()
const app        = useAppStore()
const log        = useLogStore()
const { filterByProperty } = useProperty()
const { show: toast } = useToast()
const { kamarMasihTerisi } = useOccupancy()
const { tagihanUntukKamar } = useTagihanCalc()

function sortByKamar<T extends { kamar: string; property_id: string }>(items: T[]): T[] {
  const katList = [...properties.kategori.map(k => k.nama), 'Lainnya']
  return [...items].sort((a, b) => {
    const aRoom = kamar.items.find(k => k.nomor === a.kamar && k.property_id === a.property_id)
    const bRoom = kamar.items.find(k => k.nomor === b.kamar && k.property_id === b.property_id)
    const aIdx = katList.indexOf(aRoom?.kategori ?? 'Lainnya')
    const bIdx = katList.indexOf(bRoom?.kategori ?? 'Lainnya')
    if ((aIdx === -1 ? 999 : aIdx) !== (bIdx === -1 ? 999 : bIdx))
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
    return a.kamar.localeCompare(b.kamar, undefined, { numeric: true })
  })
}

const filtered = computed(() => sortByKamar(filterByProperty(penghuni.items)))

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

function findKamar(nomor: string, property_id: string) {
  return kamar.items.find(k => k.nomor === nomor && k.property_id === property_id)
}

/**
 * Tagihan bulan masuk dibuat di sini karena autoGenerateNextMonth hanya mengurus
 * bulan depan — tanpa ini bulan masuk selalu bolong dan harus diinput manual.
 */
async function buatTagihanBulanMasuk(p: Penghuni) {
  const bln = bulanFromTgl(p.masuk)
  if (!bln) return
  const sudahAda = tagihan.items.some(
    t => t.kamar === p.kamar && t.property_id === p.property_id && t.bulan === bln,
  )
  if (sudahAda) return
  await tagihan.add({
    ...tagihanUntukKamar(p.kamar, p.property_id, bln, { prorata: true }),
    status: 'belum', property_id: p.property_id, createdAt: new Date().toISOString(),
  })
}

const showModal  = ref(false)
const editId     = ref<string | null>(null)
const form       = ref<Partial<Penghuni>>({})
const modalTitle = computed(() => editId.value ? 'Edit Penghuni' : 'Tambah Penghuni')

// Auto-suggest kontrak_selesai = masuk + 12 months when masuk changes
watch(() => form.value.masuk, (newMasuk) => {
  if (newMasuk && !form.value.kontrak_selesai) {
    const d = new Date(newMasuk)
    d.setFullYear(d.getFullYear() + 1)
    form.value.kontrak_selesai = d.toISOString().split('T')[0]
  }
})

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
        // Kamar lama hanya dikosongkan bila tidak ada roommate yang tertinggal.
        if (!kamarMasihTerisi(original.kamar, original.property_id, original.id)) {
          const oldRoom = findKamar(original.kamar, original.property_id)
          if (oldRoom) await kamar.update(oldRoom.id, { status: 'kosong' })
        }
        const newRoom = findKamar(form.value.kamar!, form.value.property_id!)
        if (newRoom && newRoom.status === 'kosong') await kamar.update(newRoom.id, { status: 'terisi' })
      }
      toast('Penghuni diperbarui', 'success')
    } else {
      await penghuni.add(form.value as Omit<Penghuni, 'id'>)
      const k = findKamar(form.value.kamar!, form.value.property_id!)
      if (k && k.status === 'kosong') await kamar.update(k.id, { status: 'terisi' })
      await log.add(`${form.value.nama} masuk kamar ${form.value.kamar}`, 'green', form.value.property_id ?? '')
      await buatTagihanBulanMasuk(form.value as Penghuni)
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
    // Kamar baru kosong kalau orang ini penghuni terakhirnya.
    if (!kamarMasihTerisi(p.kamar, p.property_id, p.id)) {
      const k = findKamar(p.kamar, p.property_id)
      if (k) await kamar.update(k.id, { status: 'kosong' })
    }
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
            <div class="avatar avatar-md anim-avatar" :style="{ background: `linear-gradient(135deg, ${avatarBg(i)}, ${avatarBg(i)}CC)`, animationDelay: `${i * 40}ms` }">
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
