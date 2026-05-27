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
import { fmt, fmtTgl }         from '../utils/format'
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

const months = computed(() => monthsBack(6))
const activeBulan = ref(bulanIni())

const filtered = computed(() => filterByProperty(tagihan.items))
const byMonth = computed(() => filtered.value.filter(t => t.bulan === activeBulan.value))

function tagStatusInfo(t: Tagihan): TagihanStatus {
  const total = Number(t.jumlah) || 0
  const dibayar = Number(t.jumlah_bayar) || (t.status === 'lunas' ? total : 0)
  const telat = !!(t.jatuh_tempo && t.jatuh_tempo < today() && t.status !== 'lunas')
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

// Pay modal
const showPay = ref(false)
const payTarget = ref<Tagihan | null>(null)
const payForm = ref({ jumlah_bayar: 0, tgl: today() })

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
    await tagihan.update(payTarget.value.id, {
      jumlah_bayar: payForm.value.jumlah_bayar,
      tgl: payForm.value.tgl,
      status
    })
    await log.add(`${payTarget.value.penghuni} bayar kamar ${payTarget.value.kamar} ${payTarget.value.bulan}`, 'green', payTarget.value.property_id)
    toast('Pembayaran dicatat', 'success')
    showPay.value = false
  } catch {
    toast('Gagal mencatat pembayaran', 'error')
  }
}

async function undoPay(t: Tagihan) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tagihan.update(t.id, { status: 'belum', jumlah_bayar: 0, tgl: deleteField() as any })
    toast('Pembayaran dibatalkan', 'success')
  } catch {
    toast('Gagal membatalkan pembayaran', 'error')
  }
}

// Add tagihan modal
const showAdd = ref(false)
const addForm = ref<Partial<Tagihan>>({})

function openAddTagihan() {
  if (app.currentPropertyId === 'all' && properties.items.length === 0) {
    toast('Tambah properti terlebih dahulu', 'error'); return
  }
  addForm.value = {
    bulan: activeBulan.value,
    status: 'belum',
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
    toast('Tagihan ditambahkan', 'success')
    showAdd.value = false
  } catch {
    toast('Gagal menambahkan tagihan', 'error')
  }
}

const confirmDelete = ref(false)
const deleteTarget = ref<Tagihan | null>(null)
function askDelete(t: Tagihan) { deleteTarget.value = t; confirmDelete.value = true }
async function doDelete() {
  if (!deleteTarget.value) return
  try {
    await tagihan.remove(deleteTarget.value.id)
    toast('Tagihan dihapus', 'success')
    confirmDelete.value = false
    deleteTarget.value = null
  } catch {
    toast('Gagal menghapus tagihan', 'error')
  }
}
</script>

<template>
  <div>
    <!-- Month tabs -->
    <div class="tabs" style="margin-bottom:16px">
      <button
        v-for="m in months"
        :key="m"
        class="tab-btn"
        :class="{ active: activeBulan === m }"
        @click="activeBulan = m"
      >{{ m }}</button>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn btn-primary" @click="openAddTagihan">+ Tambah Tagihan</button>
    </div>

    <!-- Summary for this month -->
    <div class="alert" style="background:var(--surf2);border:1px solid var(--border);color:var(--text)">
      📋 {{ activeBulan }}: <strong>{{ byMonth.filter(t => t.status === 'lunas').length }}/{{ byMonth.length }}</strong> lunas ·
      Terkumpul <strong>{{ fmt(byMonth.reduce((s, t) => s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? t.jumlah : 0)), 0)) }}</strong>
    </div>

    <!-- Desktop table -->
    <div class="card table-wrap">
      <table>
        <thead>
          <tr><th>Penghuni</th><th>Kamar</th><th>Jumlah</th><th>Status</th><th>Tgl Bayar</th><th>Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="byMonth.length === 0">
            <td colspan="6" style="text-align:center;color:var(--text3);padding:20px">Belum ada tagihan {{ activeBulan }}</td>
          </tr>
          <tr v-for="t in byMonth" :key="t.id">
            <td><strong>{{ t.penghuni }}</strong></td>
            <td>{{ t.kamar }}</td>
            <td>{{ fmt(t.jumlah) }}</td>
            <td><span class="badge" :class="statusMap.get(t.id)?.cls">{{ statusMap.get(t.id)?.label }}</span></td>
            <td>{{ fmtTgl(t.tgl ?? '') }}</td>
            <td style="white-space:nowrap">
              <button v-if="t.status !== 'lunas'" class="btn-sm btn-ok" @click="openPay(t)">💰 Bayar</button>
              <button v-else class="btn-sm btn-undo" @click="undoPay(t)">↩ Undo</button>
              <button class="btn-sm btn-del" @click="askDelete(t)">🗑</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile cards -->
    <div class="mobile-list">
      <div v-if="byMonth.length === 0" class="empty-state"><div class="ei">🧾</div><p>Belum ada tagihan {{ activeBulan }}</p></div>
      <div v-for="t in byMonth" :key="t.id" class="mc">
        <div class="mc-top">
          <span class="mc-name">{{ t.kamar }} <span style="font-size:12px;font-weight:400;color:var(--text2)">{{ t.penghuni }}</span></span>
          <span class="badge" :class="statusMap.get(t.id)?.cls">{{ statusMap.get(t.id)?.label }}</span>
        </div>
        <div class="mc-rows">
          <div class="mc-row"><span class="mc-label">Jumlah</span><span class="mc-val">{{ fmt(t.jumlah) }}</span></div>
          <div v-if="t.tgl" class="mc-row"><span class="mc-label">Dibayar</span><span class="mc-val">{{ fmtTgl(t.tgl) }}</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button v-if="t.status !== 'lunas'" class="btn btn-primary" style="flex:1;font-size:13px" @click="openPay(t)">💰 Bayar</button>
          <button v-else class="btn btn-ghost" style="flex:1;font-size:13px" @click="undoPay(t)">↩ Undo</button>
          <button class="btn btn-ghost" style="font-size:13px" @click="askDelete(t)">🗑</button>
        </div>
      </div>
    </div>

    <!-- Pay Modal -->
    <div class="overlay" :class="{ open: showPay }" @click.self="showPay = false">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head">
          <h2>Catat Pembayaran</h2>
          <button class="close-btn" @click="showPay = false">✕</button>
        </div>
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
        <div class="modal-head">
          <h2>Tambah Tagihan</h2>
          <button class="close-btn" @click="showAdd = false">✕</button>
        </div>
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

    <ConfirmDialog
      :open="confirmDelete"
      icon="🗑"
      :msg="`Hapus tagihan ${deleteTarget?.penghuni} bulan ${deleteTarget?.bulan}?`"
      ok-label="Hapus"
      :danger="true"
      @confirm="doDelete"
      @cancel="confirmDelete = false"
    />
  </div>
</template>
