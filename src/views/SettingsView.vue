<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useBiometrik }        from '../composables/useBiometrik'
import { useSettingsStore }    from '../stores/settings'
import { usePropertiesStore }  from '../stores/properties'
import { useAppStore }         from '../stores/app'
import { useToast }            from '../composables/useToast'
import type { Property, AppSettings }       from '../types'
import { useMigrasiKamar }     from '../composables/useMigrasiKamar'
import ConfirmDialog           from '../components/shared/ConfirmDialog.vue'

const settings   = useSettingsStore()
const properties = usePropertiesStore()
const app        = useAppStore()
const { show: toast } = useToast()

const activeTab = ref<'umum' | 'properti' | 'kategori' | 'tipe' | 'migrasi'>('umum')

// --- Migrasi penomoran kamar (B1 → 101, dst) ---
const { rencana, sedangJalan, progres, pratinjau, unduhBackup, terapkan } = useMigrasiKamar()
const migrasiProp = ref('')
const sudahBackup = ref(false)
const confirmMigrasi = ref(false)

function lihatRencana() {
  if (!migrasiProp.value) { toast('Pilih properti dulu', 'error'); return }
  sudahBackup.value = false
  const r = pratinjau(migrasiProp.value)
  if (!r.ubah.length && !r.takDikenal.length) toast('Tidak ada yang perlu diubah', 'success')
}

function ambilBackup() {
  unduhBackup(migrasiProp.value)
  sudahBackup.value = true
  toast('Backup diunduh', 'success')
}

const ringkasPerKoleksi = computed(() => {
  const m: Record<string, number> = {}
  for (const u of rencana.value?.ubah ?? []) m[u.koleksi] = (m[u.koleksi] ?? 0) + 1
  return m
})

const ubahKamarSaja = computed(() =>
  (rencana.value?.ubah ?? []).filter(u => u.koleksi === 'kamar'),
)

async function jalankanMigrasi() {
  confirmMigrasi.value = false
  if (!rencana.value) return
  try {
    const n = await terapkan(rencana.value)
    toast(`${n} data diperbarui`, 'success')
    pratinjau(migrasiProp.value)
  } catch {
    toast('Migrasi gagal — jalankan ulang untuk melanjutkan', 'error')
  }
}

// General settings
const settingsForm = ref<AppSettings>({ ...settings.data })
watch(() => settings.data, (newVal) => {
  settingsForm.value = { ...newVal }
}, { deep: true })
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

// --- Biometrik ---
const biometrik = useBiometrik()
const bioDidukung = ref(false)
const bioAktif = ref(false)

onMounted(async () => {
  bioDidukung.value = await biometrik.didukung()
  bioAktif.value = biometrik.terdaftar()
})

async function aktifkanBio() {
  if (await biometrik.daftar(settings.data.nama || 'Pemilik Kos')) {
    bioAktif.value = true
    toast('Biometrik diaktifkan', 'success')
  } else {
    toast('Gagal mendaftarkan biometrik', 'error')
  }
}

function matikanBio() {
  biometrik.lupakan()
  bioAktif.value = false
  toast('Biometrik dimatikan', 'success')
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
      <button class="tab-btn" :class="{ active: activeTab === 'migrasi' }" @click="activeTab = 'migrasi'">🔢 Migrasi Nomor</button>
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
          <div class="fg">
            <label>Tanggal Jatuh Tempo</label>
            <input v-model.number="settingsForm.tgl_jatuh_tempo" type="number" min="1" max="28" placeholder="1" />
            <div style="font-size:11px;color:var(--text3);margin-top:4px">Tanggal jatuh tempo tagihan tiap bulan (default: 1)</div>
          </div>
          <div class="fg">
            <label>Tambahan per Penghuni</label>
            <input v-model.number="settingsForm.nominal_tambahan" type="number" min="0" step="50000" placeholder="300000" />
            <div style="font-size:11px;color:var(--text3);margin-top:4px">Ditambahkan per orang di atas penghuni pertama (default: 300.000). Bisa ditimpa per kamar.</div>
          </div>
          <div class="fg full"><label>Template Pesan WA Reminder</label>
            <textarea v-model="settingsForm.wa_template" rows="3"
              placeholder="Halo {nama}, tagihan kos kamar {kamar} bulan {bulan} sebesar {sisa} belum dilunasi (jatuh tempo {jatuh_tempo}). Mohon segera dilunasi. Terima kasih 🙏"></textarea>
            <div style="font-size:11px;color:var(--text3);margin-top:4px">Variabel: {nama} {kamar} {bulan} {jumlah} {sisa} {jatuh_tempo}</div>
          </div>
        </div>
        <div style="padding:0 16px 16px">
          <button class="btn btn-primary" @click="saveSettings">💾 Simpan Pengaturan</button>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="card-hd"><div class="card-title">Buka Aplikasi</div></div>
        <div style="padding:0 16px 16px">
          <div v-if="!bioDidukung" style="font-size:13px;color:var(--text2);line-height:1.6">
            Perangkat ini tidak mendukung Face ID / sidik jari untuk web, atau halaman
            tidak diakses lewat HTTPS. Masuk tetap memakai PIN.
          </div>
          <template v-else>
            <div class="info-row">
              <span class="info-label">Face ID / Sidik Jari</span>
              <span class="badge" :class="bioAktif ? 'bg' : 'bgr'">{{ bioAktif ? 'Aktif' : 'Nonaktif' }}</span>
            </div>
            <div style="font-size:12px;color:var(--text3);line-height:1.6;margin:8px 0 12px">
              Mempercepat masuk supaya tidak perlu mengetik PIN. <strong>Bukan lapisan keamanan
              tambahan</strong> — tidak ada server yang memverifikasi, jadi tingkat pengamanannya
              sama dengan PIN sekarang. PIN tetap ada sebagai cadangan, dan tetap diperlukan
              di perangkat lain.
            </div>
            <button v-if="!bioAktif" class="btn btn-primary" @click="aktifkanBio">👤 Aktifkan</button>
            <button v-else class="btn btn-ghost" @click="matikanBio">Matikan di perangkat ini</button>
          </template>
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

    <!-- Migrasi penomoran kamar -->
    <div v-else-if="activeTab === 'migrasi'">
      <div class="card">
        <div class="card-hd"><div class="card-title">Ganti Penomoran Kamar</div></div>
        <div style="padding:0 16px 16px">
          <div class="alert" style="background:var(--amber2);color:var(--amber)">
            <span>⚠️</span>
            <div>
              Mengubah nomor kamar di <strong>empat koleksi sekaligus</strong> — kamar, penghuni,
              tagihan, dan maintenance — karena nomor kamar disimpan sebagai teks, bukan id.
              Riwayat tagihan lama ikut berubah. <strong>Unduh backup dulu.</strong>
            </div>
          </div>

          <div style="font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:12px">
            Pemetaan: <strong>B1–B7 → 101–107</strong>, <strong>A1–A9 → 201–209</strong>,
            <strong>C1–C5 → 301–305</strong>, <strong>D1 → 401</strong>.
            Kamar yang nomornya sudah berupa angka dilewati, jadi aman dijalankan ulang.
          </div>

          <div class="fg" style="margin-bottom:12px">
            <label>Properti</label>
            <select v-model="migrasiProp">
              <option value="">— pilih properti —</option>
              <option v-for="p in properties.items" :key="p.id" :value="p.id">{{ p.nama }}</option>
            </select>
          </div>

          <button class="btn btn-ghost" :disabled="sedangJalan" @click="lihatRencana">
            🔍 Lihat Rencana
          </button>
        </div>
      </div>

      <div v-if="rencana" class="card" style="margin-top:14px">
        <div class="card-hd"><div class="card-title">Rencana Perubahan</div></div>
        <div style="padding:0 16px 16px">
          <div v-if="rencana.bentrok.length" class="alert" style="background:var(--red2);color:var(--red)">
            <span>⛔</span>
            <div>
              <strong>Nomor tujuan sudah dipakai.</strong> Tidak ada yang diubah untuk kamar ini —
              selesaikan dulu secara manual.
              <div v-for="b in rencana.bentrok" :key="b.dari">{{ b.dari }} → {{ b.ke }}</div>
            </div>
          </div>

          <div v-if="rencana.takDikenal.length" class="alert" style="background:var(--amber2);color:var(--amber)">
            <span>❓</span>
            <div>
              <strong>{{ rencana.takDikenal.length }} data tidak dikenali polanya</strong> dan akan
              dilewati, bukan ditebak:
              <div v-for="t in rencana.takDikenal.slice(0, 12)" :key="t.koleksi + t.id">
                {{ t.koleksi }}: "{{ t.nomor }}"
              </div>
              <div v-if="rencana.takDikenal.length > 12">… dan {{ rencana.takDikenal.length - 12 }} lagi</div>
            </div>
          </div>

          <div v-if="rencana.ubah.length === 0" class="empty-state" style="padding:20px">
            <div class="ei">✅</div><p>Tidak ada yang perlu diubah</p>
          </div>

          <template v-else>
            <div style="font-size:13px;color:var(--text2);margin-bottom:10px">
              Total <strong>{{ rencana.ubah.length }}</strong> dokumen —
              <span v-for="(n, k) in ringkasPerKoleksi" :key="k">{{ k }}: {{ n }} &nbsp;</span>
            </div>

            <div style="max-height:240px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r);padding:10px">
              <div v-for="u in ubahKamarSaja" :key="u.id"
                   style="display:flex;gap:8px;align-items:center;padding:4px 0;font-size:13px">
                <span style="color:var(--text2);min-width:44px">{{ u.dari }}</span>
                <span style="color:var(--text3)">→</span>
                <strong>{{ u.ke }}</strong>
              </div>
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
              <button class="btn btn-ghost" :disabled="sedangJalan" @click="ambilBackup">
                💾 Unduh Backup
              </button>
              <button class="btn btn-primary" :disabled="!sudahBackup || sedangJalan"
                      @click="confirmMigrasi = true">
                {{ sedangJalan ? `Menjalankan… ${progres}/${rencana.ubah.length}` : '▶️ Jalankan Migrasi' }}
              </button>
            </div>
            <div v-if="!sudahBackup" style="font-size:11px;color:var(--text3);margin-top:6px">
              Tombol jalankan aktif setelah backup diunduh.
            </div>
          </template>
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
            <div class="fg"><label>Saldo Awal</label><input v-model.number="propForm.saldo_awal" type="number" step="100000" placeholder="0" /></div>
            <div class="fg"><label>Saldo Awal per Tanggal</label><input v-model="propForm.saldo_awal_tgl" type="date" /></div>
            <div class="fg full" style="font-size:11px;color:var(--text3);margin-top:-4px">
              Isi saldo rekening pada tanggal tersebut. Saldo berjalan di Dashboard dihitung dari titik itu:
              saldo awal + pembayaran masuk − pengeluaran. Angkanya hanya seakurat data yang dicatat di aplikasi,
              bukan saldo bank sungguhan.
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showPropModal = false">Batal</button>
          <button class="btn btn-primary" @click="saveProp">Simpan</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmMigrasi"
      icon="🔢"
      :msg="`Ganti nomor ${ubahKamarSaja.length} kamar?`"
      :sub="`${rencana?.ubah.length ?? 0} dokumen di 4 koleksi akan diperbarui. Riwayat tagihan lama ikut berubah.`"
      ok-label="Jalankan"
      :danger="true"
      @confirm="jalankanMigrasi"
      @cancel="confirmMigrasi = false"
    />

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
