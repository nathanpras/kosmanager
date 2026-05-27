<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore }    from '../stores/settings'
import { usePropertiesStore }  from '../stores/properties'
import { useAppStore }         from '../stores/app'
import { useToast }            from '../composables/useToast'
import type { Property }       from '../types'
import ConfirmDialog           from '../components/shared/ConfirmDialog.vue'

const settings   = useSettingsStore()
const properties = usePropertiesStore()
const app        = useAppStore()
const { show: toast } = useToast()

const activeTab = ref<'umum' | 'properti' | 'kategori' | 'tipe'>('umum')

// General settings
const settingsForm = ref({ ...settings.data })
async function saveSettings() {
  try {
    await settings.save(settingsForm.value)
    toast('Pengaturan disimpan', 'success')
  } catch {
    toast('Gagal menyimpan pengaturan', 'error')
  }
}

// Property management
const showPropModal = ref(false)
const propEditId    = ref<string | null>(null)
const propForm      = ref<Partial<Property>>({})

function openAddProp() {
  propEditId.value = null
  propForm.value = { created_at: new Date().toISOString() }
  showPropModal.value = true
}

function openEditProp(p: Property) {
  propEditId.value = p.id
  propForm.value = { ...p }
  showPropModal.value = true
}

async function saveProp() {
  if (!propForm.value.nama) { toast('Nama properti wajib diisi', 'error'); return }
  try {
    if (propEditId.value) {
      await properties.updateProperty(propEditId.value, propForm.value)
    } else {
      await properties.addProperty(propForm.value as Omit<Property, 'id'>)
    }
    toast('Properti disimpan', 'success')
    showPropModal.value = false
  } catch {
    toast('Gagal menyimpan properti', 'error')
  }
}

const confirmDelProp = ref(false)
const delPropTarget = ref<Property | null>(null)
function askDelProp(p: Property) { delPropTarget.value = p; confirmDelProp.value = true }
async function doDelProp() {
  if (!delPropTarget.value) return
  try {
    await properties.removeProperty(delPropTarget.value.id)
    if (app.currentPropertyId === delPropTarget.value.id) app.setProperty('all')
    toast('Properti dihapus', 'success')
    confirmDelProp.value = false
    delPropTarget.value = null
  } catch {
    toast('Gagal menghapus properti', 'error')
  }
}

// Kategori management
const newKategori = ref('')
async function addKategori() {
  if (!newKategori.value.trim()) return
  try {
    await properties.addKategori(newKategori.value.trim())
    newKategori.value = ''
    toast('Kategori ditambahkan', 'success')
  } catch {
    toast('Gagal menambahkan kategori', 'error')
  }
}

async function removeKategori(id: string) {
  try {
    await properties.removeKategori(id)
    toast('Kategori dihapus', 'success')
  } catch {
    toast('Gagal menghapus kategori', 'error')
  }
}

// App info
const appVersion = '2.0.0'
</script>

<template>
  <div>
    <!-- Tabs -->
    <div class="tabs" style="margin-bottom:16px">
      <button class="tab-btn" :class="{ active: activeTab === 'umum' }" @click="activeTab = 'umum'">⚙️ Umum</button>
      <button class="tab-btn" :class="{ active: activeTab === 'properti' }" @click="activeTab = 'properti'">🏠 Properti</button>
      <button class="tab-btn" :class="{ active: activeTab === 'kategori' }" @click="activeTab = 'kategori'">🏷️ Kategori</button>
      <button class="tab-btn" :class="{ active: activeTab === 'tipe' }" @click="activeTab = 'tipe'">🛏️ Tipe Kamar</button>
    </div>

    <!-- Umum tab -->
    <div v-if="activeTab === 'umum'">
      <div class="card">
        <div class="card-hd"><div class="card-title">Informasi Kos</div></div>
        <div class="form-grid" style="padding:0 16px 16px">
          <div class="fg full"><label>Nama Kos</label><input v-model="settingsForm.nama" placeholder="Kos Melati" /></div>
          <div class="fg full"><label>Alamat</label><input v-model="settingsForm.alamat" placeholder="Jl. Melati No. 1" /></div>
          <div class="fg"><label>No HP / WA</label><input v-model="settingsForm.wa" placeholder="08xxxxxxxxxx" /></div>
          <div class="fg"><label>Bank</label><input v-model="settingsForm.bank" placeholder="BCA" /></div>
          <div class="fg"><label>No Rekening</label><input v-model="settingsForm.rek" placeholder="1234567890" /></div>
          <div class="fg"><label>Nama Rekening</label><input v-model="settingsForm.namarek" placeholder="Budi Santoso" /></div>
          <div class="fg full"><label>Template Pesan WA Reminder</label>
            <textarea v-model="settingsForm.wa_template" rows="3"
              placeholder="Halo {nama}, tagihan kos bulan {bulan} sebesar {jumlah} belum dibayar. Mohon segera dilunasi. Terima kasih 🙏"></textarea>
            <div style="font-size:11px;color:var(--text3);margin-top:4px">Variabel: {nama} {bulan} {jumlah}</div>
          </div>
        </div>
        <div style="padding:0 16px 16px">
          <button class="btn btn-primary" @click="saveSettings">💾 Simpan Pengaturan</button>
        </div>
      </div>
      <div class="card" style="margin-top:12px">
        <div class="card-hd"><div class="card-title">Informasi Aplikasi</div></div>
        <div style="padding:0 16px 16px">
          <div class="info-row"><span class="info-label">Versi</span><span class="info-val">{{ appVersion }}</span></div>
          <div class="info-row"><span class="info-label">Database</span><span class="info-val">Firebase Firestore</span></div>
        </div>
      </div>
    </div>

    <!-- Properti tab -->
    <div v-else-if="activeTab === 'properti'">
      <button class="btn btn-primary" style="margin-bottom:16px" @click="openAddProp">+ Tambah Properti</button>
      <div v-if="properties.items.length === 0" class="empty-state"><div class="ei">🏠</div><p>Belum ada properti</p></div>
      <div v-for="p in properties.items" :key="p.id" class="card" style="margin-bottom:12px">
        <div class="card-hd">
          <div>
            <div class="card-title">{{ p.nama }}</div>
            <div class="card-sub">{{ p.alamat }}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost" @click="openEditProp(p)">✏️ Edit</button>
            <button class="btn btn-danger" @click="askDelProp(p)">🗑 Hapus</button>
          </div>
        </div>
        <div style="padding:0 16px 12px">
          <div v-if="p.no_hp" class="info-row"><span class="info-label">No HP</span><span class="info-val">{{ p.no_hp }}</span></div>
          <div v-if="p.bank_nama" class="info-row"><span class="info-label">Bank</span><span class="info-val">{{ p.bank_nama }} - {{ p.bank_rekening }} ({{ p.bank_an }})</span></div>
        </div>
      </div>
    </div>

    <!-- Kategori tab -->
    <div v-else-if="activeTab === 'kategori'">
      <div class="card">
        <div class="card-hd"><div class="card-title">Kategori Kamar</div></div>
        <div style="padding:0 16px 12px">
          <div style="display:flex;gap:8px;margin-bottom:16px">
            <input v-model="newKategori" placeholder="Nama kategori baru" style="flex:1" @keyup.enter="addKategori" />
            <button class="btn btn-primary" @click="addKategori">Tambah</button>
          </div>
          <div v-if="properties.kategori.length === 0" class="empty-state" style="padding:20px 0"><p>Belum ada kategori</p></div>
          <div v-for="k in properties.kategori" :key="k.id" class="info-row">
            <span class="info-label">{{ k.nama }}</span>
            <button class="btn-sm btn-del" @click="removeKategori(k.id)">🗑</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tipe Kamar tab -->
    <div v-else-if="activeTab === 'tipe'">
      <div class="card">
        <div class="card-hd"><div class="card-title">Tipe Kamar</div></div>
        <div style="padding:0 16px 12px">
          <div v-if="properties.tipeKamar.length === 0" class="empty-state" style="padding:20px 0"><p>Belum ada tipe kamar</p></div>
          <div v-for="t in properties.tipeKamar" :key="t.id" class="info-row">
            <span class="info-label">{{ t.nama }}</span>
            <span class="badge bgr">{{ t.urutan }}</span>
          </div>
          <div style="margin-top:12px;font-size:12px;color:var(--text3)">Tipe kamar dikelola melalui Firebase Console atau akan ditambahkan di versi berikutnya.</div>
        </div>
      </div>
    </div>

    <!-- Property Add/Edit Modal -->
    <div class="overlay" :class="{ open: showPropModal }" @click.self="showPropModal = false">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <h2>{{ propEditId ? 'Edit' : 'Tambah' }} Properti</h2>
          <button class="close-btn" @click="showPropModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="fg full"><label>Nama Properti</label><input v-model="propForm.nama" placeholder="Kos Melati 1" /></div>
            <div class="fg full"><label>Alamat</label><input v-model="propForm.alamat" placeholder="Jl. Melati No. 1" /></div>
            <div class="fg"><label>No HP</label><input v-model="propForm.no_hp" placeholder="08xxxxxxxxxx" /></div>
            <div class="fg"><label>Bank</label><input v-model="propForm.bank_nama" placeholder="BCA" /></div>
            <div class="fg"><label>No Rekening</label><input v-model="propForm.bank_rekening" placeholder="1234567890" /></div>
            <div class="fg"><label>Nama Rekening</label><input v-model="propForm.bank_an" placeholder="Budi Santoso" /></div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showPropModal = false">Batal</button>
          <button class="btn btn-primary" @click="saveProp">Simpan</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmDelProp"
      icon="⚠️"
      :msg="`Hapus properti ${delPropTarget?.nama}?`"
      sub="Semua data yang terkait dengan properti ini akan terpengaruh."
      ok-label="Hapus"
      :danger="true"
      @confirm="doDelProp"
      @cancel="confirmDelProp = false"
    />
  </div>
</template>
