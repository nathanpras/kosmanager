<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePenghuniStore }   from '../stores/penghuni'
import { useKamarStore }      from '../stores/kamar'
import { useTagihanStore }    from '../stores/tagihan'
import { usePropertiesStore } from '../stores/properties'
import { useAppStore }        from '../stores/app'
import { useLogStore }        from '../stores/log'
import { useProperty }        from '../composables/useProperty'
import { useToast }           from '../composables/useToast'
import { useOccupancy, tglKeluar, sudahKeluar } from '../composables/useOccupancy'
import { useTagihanCalc, kunciTagihan } from '../composables/useTagihanCalc'
import { useKeluarPenghuni }  from '../composables/useKeluarPenghuni'
import { kamarDiBulan, catatPindah, koreksiKamar, awalBulanBerikutnya } from '../utils/riwayatKamar'
import { fmtTgl, fmt }        from '../utils/format'
import { today, bulanIni, bulanFromTgl, bulanKey } from '../utils/date'
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
const { keluarkan } = useKeluarPenghuni()

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

// Tab aktif/mantan — status mantan diturunkan dari tglKeluar(), tidak disimpan
// sebagai flag terpisah.
const tab = ref<'aktif' | 'mantan'>('aktif')
const cariMantan = ref('')

const aktif = computed(() => filtered.value.filter(p => !sudahKeluar(p)))
const mantan = computed(() => {
  const q = cariMantan.value.trim().toLowerCase()
  return filtered.value
    .filter(p => sudahKeluar(p))
    .filter(p => !q || p.nama.toLowerCase().includes(q) || p.kamar.toLowerCase().includes(q))
    .sort((a, b) => (tglKeluar(b) ?? '').localeCompare(tglKeluar(a) ?? ''))
})

function totalDibayar(p: Penghuni): number {
  return tagihan.items
    .filter(t => t.property_id === p.property_id && (t.penghuni_id === p.id || t.penghuni === p.nama))
    .reduce((s, t) => s + (Number(t.jumlah_bayar) || (t.status === 'lunas' ? Number(t.jumlah) || 0 : 0)), 0)
}

async function pulihkan(p: Penghuni) {
  const keluar = tglKeluar(p)
  // Satu-satunya tempat kontrak_selesai ditulis: ia harus ikut dikosongkan,
  // kalau tidak, tglKeluar() masih membacanya dan orangnya kembali ke arsip.
  await penghuni.update(p.id, { tgl_keluar: '', kontrak_selesai: '' })

  // Kamar dikembalikan terisi: doKeluar() mengosongkannya, dan kalau dibiarkan
  // kosong kamar ini muncul lagi di pemilih kamar dan bisa diisi orang kedua
  // padahal sudah ada penghuninya.
  const k = findKamar(p.kamar, p.property_id)
  if (k && k.status === 'kosong') await kamar.update(k.id, { status: 'terisi' })

  // Bulan yang sempat ditandai hangus karena ia keluar sekarang berlaku lagi.
  const batas = keluar ? bulanKey(bulanFromTgl(keluar) ?? '') : ''
  const dipulihkan = tagihan.items.filter(t =>
    t.property_id === p.property_id
    && (t.penghuni_id === p.id || t.penghuni === p.nama)
    && t.hangus === true
    && bulanKey(t.bulan) >= batas)
  for (const t of dipulihkan) await tagihan.update(t.id, { hangus: false })

  await log.add(`${p.nama} dipulihkan ke kamar ${p.kamar}`, 'green', p.property_id)
  toast('Penghuni dipulihkan', 'success')
}

// Avatar
const AVATAR_COLORS = ['#0070C0','#004E86','#B38600','#DC4A4A','#3B7BF5','#7C3AED','#059669','#D97706']
function getInitials(name: string) {
  return (name || '?').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'
}
function avatarBg(idx: number) { return AVATAR_COLORS[idx % AVATAR_COLORS.length] }

function statusPenghuni(p: Penghuni) {
  const keluar = tglKeluar(p)
  if (!keluar) return { cls: 'bg', label: 'Aktif' }
  return { cls: 'br', label: `Keluar ${fmtTgl(keluar)}` }
}

/**
 * Kamar yang boleh dipilih untuk penghuni ini.
 *
 * Disaring per properti: setelah migrasi penomoran, Waru 23 dan Citra 1
 * sama-sama punya kamar 101–107, sehingga daftar tanpa filter akan menampilkan
 * dua "101" yang tidak bisa dibedakan dan bisa menaruh penghuni di gedung lain.
 */
const kamarPilihan = computed(() =>
  kamar.items.filter(k =>
    k.property_id === form.value.property_id &&
    (k.status === 'kosong' || (editId.value && k.nomor === form.value.kamar)),
  ),
)

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
  const existing = new Set<string>()
  for (const t of tagihan.items.filter(t => t.bulan === bln && t.property_id === p.property_id)) {
    for (const k of kunciTagihan(t)) existing.add(k)
  }
  for (const draft of tagihanUntukKamar(kamarDiBulan(p, bln), p.property_id, bln)) {
    if (kunciTagihan({ ...draft, property_id: p.property_id }).some(k => existing.has(k))) continue
    await tagihan.add({
      ...draft, status: 'belum', property_id: p.property_id,
      createdAt: new Date().toISOString(),
    })
  }
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
function openEdit(p: Penghuni) {
  editId.value = p.id
  // Dokumen lama menyimpan tanggal keluar di kontrak_selesai — baca lewat
  // tglKeluar() supaya field di form tetap terisi, lalu buang kontrak_selesai
  // dari form supaya cuma tgl_keluar yang dibawa saat save().
  const { kontrak_selesai, ...rest } = p
  form.value = { ...rest, tgl_keluar: tglKeluar(p) }
  showModal.value = true
}

async function save() {
  if (!form.value.nama || !form.value.kamar || !form.value.hp) { toast('Nama, kamar, dan no HP wajib diisi', 'error'); return }
  try {
    if (editId.value) {
      const original = penghuni.items.find(p => p.id === editId.value)
      const data: Partial<Penghuni> = { ...form.value }
      // Mengganti kamar di sini adalah pembetulan salah input, bukan pindahan:
      // entri riwayat terakhir ikut ditulis ulang supaya tidak lahir pindahan
      // palsu. Pindah sungguhan lewat tombol Pindah (🔁).
      if (original && original.kamar !== data.kamar && (original.riwayat_kamar?.length ?? 0) > 0) {
        data.riwayat_kamar = koreksiKamar(original, data.kamar ?? '')
      }
      await penghuni.update(editId.value, data)
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

/**
 * Pindah kamar.
 *
 * Aturan yang dipilih pemilik: pindah tengah bulan tidak diprorata. Bulan
 * berjalan tetap ditagih kamar lama sebulan penuh, kamar baru mulai ditagih
 * tanggal 1 bulan berikutnya, dan sisa hari di kamar baru tidak ditagih.
 * Karena itu `riwayat_kamar` yang menentukan kamar mana yang ditagih, bukan
 * `penghuni.kamar` — field itu langsung menunjuk kamar baru supaya daftar dan
 * status kamar mencerminkan tempat orangnya benar-benar tidur.
 */
const showPindah   = ref(false)
const pindahTarget = ref<Penghuni | null>(null)
const pindahTujuan = ref('')
const pindahTgl    = ref(today())

const pindahEfektif = computed(() => awalBulanBerikutnya(pindahTgl.value))
const bulanBerjalan = computed(() => bulanFromTgl(pindahTgl.value) ?? '')
const bulanEfektif  = computed(() => bulanFromTgl(pindahEfektif.value) ?? '')

/** Kamar kosong di properti yang sama — kamar yang ditempati sekarang tidak dihitung. */
const kamarTujuan = computed(() => {
  const p = pindahTarget.value
  if (!p) return []
  return kamar.items.filter(k =>
    k.property_id === p.property_id && k.status === 'kosong' && k.nomor !== p.kamar)
})

/**
 * Kamar yang masih ditagihkan bulan ini bila berbeda dengan kamar yang
 * ditempati — satu-satunya tanda kasat mata bahwa ada pindahan yang tagihannya
 * baru berlaku bulan depan.
 */
function kamarTagihanBulanIni(p: Penghuni): string | null {
  const nomor = kamarDiBulan(p, bulanIni())
  return nomor === p.kamar ? null : nomor
}

function askPindah(p: Penghuni) {
  pindahTarget.value = p
  pindahTujuan.value = ''
  pindahTgl.value = today()
  showPindah.value = true
}

async function doPindah() {
  const p = pindahTarget.value
  if (!p) return
  const tujuan = pindahTujuan.value
  const efektif = pindahEfektif.value
  if (!tujuan || !efektif) { toast('Kamar tujuan dan tanggal pindah wajib diisi', 'error'); return }
  if (tujuan === p.kamar) { toast('Kamar tujuan sama dengan kamar sekarang', 'error'); return }
  // Dibaca sebelum update: store memutakhirkan objek yang sama, jadi setelah
  // ini p.kamar sudah berisi kamar tujuan.
  const kamarLama = p.kamar
  showPindah.value = false
  try {
    await penghuni.update(p.id, {
      kamar: tujuan,
      riwayat_kamar: catatPindah(p, tujuan, efektif),
    })
    // Kamar lama hanya dikosongkan bila tidak ada roommate yang tertinggal.
    if (!kamarMasihTerisi(kamarLama, p.property_id, p.id)) {
      const lama = findKamar(kamarLama, p.property_id)
      if (lama) await kamar.update(lama.id, { status: 'kosong' })
    }
    const baru = findKamar(tujuan, p.property_id)
    if (baru && baru.status === 'kosong') await kamar.update(baru.id, { status: 'terisi' })
    await log.add(
      `${p.nama} pindah dari kamar ${kamarLama} ke ${tujuan} — tagihan kamar ${tujuan} mulai ${bulanFromTgl(efektif)}`,
      'blue', p.property_id,
    )
    toast('Penghuni dipindahkan', 'success')
  } catch { toast('Gagal memindahkan penghuni', 'error') }
}

const showKeluar   = ref(false)
const keluarTarget = ref<Penghuni | null>(null)
const keluarTgl    = ref(today())

function askKeluar(p: Penghuni) {
  keluarTarget.value = p
  keluarTgl.value = today()
  showKeluar.value = true
}

async function doKeluar() {
  const p = keluarTarget.value
  if (!p) return
  const tgl = keluarTgl.value
  if (!tgl) { toast('Tanggal keluar wajib diisi', 'error'); return }
  showKeluar.value = false
  try {
    // Seluruh urusan tagihan ada di useKeluarPenghuni(): tagihan kamar harus
    // direkonsiliasi sekamar-sekamar, bukan dicari per orang — lihat komentar di
    // sana untuk alasannya.
    await keluarkan(p, tgl)
    toast('Penghuni dikeluarkan', 'success')
  } catch { toast('Gagal mengeluarkan penghuni', 'error') }
}

function openWA(p: Penghuni) {
  const num = p.hp.replace(/\D/g, '').replace(/^0/, '62')
  window.open(`https://wa.me/${num}`, '_blank')
}
</script>

<template>
  <div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <button class="btn btn-primary" @click="openAdd">+ Tambah Penghuni</button>
      <div style="display:flex;gap:8px">
        <span class="badge bg">{{ aktif.length }} aktif</span>
        <span class="badge br">{{ mantan.length }} mantan</span>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn" :class="{ active: tab === 'aktif' }" @click="tab = 'aktif'">Aktif</button>
      <button class="tab-btn" :class="{ active: tab === 'mantan' }" @click="tab = 'mantan'">Mantan Penghuni</button>
    </div>

    <template v-if="tab === 'aktif'">
    <!-- Desktop table -->
    <div class="card table-wrap">
      <table>
        <thead>
          <tr><th></th><th>Nama</th><th>Kamar</th><th>No HP</th><th>Masuk</th><th>Keluar</th><th>Status</th><th>Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="aktif.length === 0">
            <td colspan="8" style="text-align:center;color:var(--text3);padding:20px">Belum ada penghuni</td>
          </tr>
          <tr v-for="(p, i) in aktif" :key="p.id" class="anim-row" :style="{ '--n': i }">
            <td style="padding-right:6px">
              <div class="avatar avatar-sm" :style="{ background: `linear-gradient(135deg, ${avatarBg(i)}, ${avatarBg(i)}CC)` }">{{ getInitials(p.nama) }}</div>
            </td>
            <td><strong>{{ p.nama }}</strong></td>
            <td>
              <span class="badge bg" style="font-size:11px">{{ p.kamar }}</span>
              <div v-if="kamarTagihanBulanIni(p)" style="font-size:10px;color:var(--text3);margin-top:3px">
                tagihan {{ bulanIni() }}: kamar {{ kamarTagihanBulanIni(p) }}
              </div>
            </td>
            <td style="color:var(--text2)">{{ p.hp }}</td>
            <td style="color:var(--text2)">{{ fmtTgl(p.masuk) }}</td>
            <td style="color:var(--text2)">{{ fmtTgl(tglKeluar(p) ?? '') }}</td>
            <td><span class="badge" :class="statusPenghuni(p).cls">{{ statusPenghuni(p).label }}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="action-btn wa" @click="openWA(p)" title="WhatsApp">💬</button>
                <button class="action-btn primary" @click="openEdit(p)" title="Edit">✏️</button>
                <button class="action-btn" @click="askPindah(p)" title="Pindah kamar">🔁</button>
                <button class="action-btn amber" @click="askKeluar(p)" title="Keluarkan">📦</button>
                <button class="action-btn danger" @click="askEvict(p)" title="Hapus">🗑</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile cards -->
    <div class="mobile-list">
      <div v-if="aktif.length === 0" class="empty-state"><div class="ei">👤</div><p>Belum ada penghuni</p></div>
      <div v-for="(p, i) in aktif" :key="p.id" class="mc anim-card" :style="{ '--n': i }">
        <div class="mc-top" style="align-items:center">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar avatar-md anim-avatar" :style="{ background: `linear-gradient(135deg, ${avatarBg(i)}, ${avatarBg(i)}CC)`, animationDelay: `${i * 40}ms` }">
              {{ getInitials(p.nama) }}
            </div>
            <div>
              <div class="mc-name">{{ p.nama }}</div>
              <span class="badge bg" style="font-size:10px">Kamar {{ p.kamar }}</span>
              <div v-if="kamarTagihanBulanIni(p)" style="font-size:10px;color:var(--text3);margin-top:3px">
                tagihan {{ bulanIni() }}: kamar {{ kamarTagihanBulanIni(p) }}
              </div>
            </div>
          </div>
          <span class="badge" :class="statusPenghuni(p).cls">{{ statusPenghuni(p).label }}</span>
        </div>
        <div class="mc-rows" style="margin-top:10px">
          <div class="mc-row"><span class="mc-label">No HP</span><span class="mc-val">{{ p.hp }}</span></div>
          <div class="mc-row"><span class="mc-label">Masuk</span><span class="mc-val">{{ fmtTgl(p.masuk) }}</span></div>
          <div v-if="tglKeluar(p)" class="mc-row"><span class="mc-label">Keluar</span><span class="mc-val">{{ fmtTgl(tglKeluar(p) ?? '') }}</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="action-btn wa" style="flex:1;justify-content:center" @click="openWA(p)">💬 WA</button>
          <button class="action-btn primary" style="flex:1;justify-content:center" @click="openEdit(p)">✏️ Edit</button>
          <button class="action-btn" style="flex:1;justify-content:center" @click="askPindah(p)">🔁 Pindah</button>
          <button class="action-btn amber" style="flex:1;justify-content:center" @click="askKeluar(p)">📦 Keluar</button>
          <button class="action-btn danger" style="flex:1;justify-content:center" @click="askEvict(p)">🗑 Hapus</button>
        </div>
      </div>
    </div>
    </template>

    <template v-if="tab === 'mantan'">
    <div style="margin-bottom:12px">
      <input v-model="cariMantan" placeholder="Cari nama atau kamar..." style="max-width:280px" />
    </div>

    <!-- Desktop table -->
    <div class="card table-wrap">
      <table>
        <thead>
          <tr><th>Nama</th><th>No HP</th><th>KTP</th><th>Kamar Terakhir</th><th>Masuk</th><th>Keluar</th><th>Total Dibayar</th><th>Aksi</th></tr>
        </thead>
        <tbody>
          <tr v-if="mantan.length === 0">
            <td colspan="8" style="text-align:center;color:var(--text3);padding:20px">{{ cariMantan ? 'Tidak ditemukan' : 'Belum ada mantan penghuni' }}</td>
          </tr>
          <tr v-for="(p, i) in mantan" :key="p.id" class="anim-row" :style="{ '--n': i }">
            <td><strong>{{ p.nama }}</strong></td>
            <td style="color:var(--text2)">{{ p.hp }}</td>
            <td style="color:var(--text2)">{{ p.ktp || '-' }}</td>
            <td><span class="badge bgr" style="font-size:11px">{{ p.kamar }}</span></td>
            <td style="color:var(--text2)">{{ fmtTgl(p.masuk) }}</td>
            <td style="color:var(--text2)">{{ fmtTgl(tglKeluar(p) ?? '') }}</td>
            <td style="color:var(--text2)">{{ fmt(totalDibayar(p)) }}</td>
            <td>
              <button class="action-btn primary" @click="pulihkan(p)" title="Pulihkan">↩️ Pulihkan</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile cards -->
    <div class="mobile-list">
      <div v-if="mantan.length === 0" class="empty-state"><div class="ei">📦</div><p>{{ cariMantan ? 'Tidak ditemukan' : 'Belum ada mantan penghuni' }}</p></div>
      <div v-for="(p, i) in mantan" :key="p.id" class="mc anim-card" :style="{ '--n': i }">
        <div class="mc-top" style="align-items:center">
          <div>
            <div class="mc-name">{{ p.nama }}</div>
            <span class="badge bgr" style="font-size:10px">Kamar terakhir {{ p.kamar }}</span>
          </div>
        </div>
        <div class="mc-rows" style="margin-top:10px">
          <div class="mc-row"><span class="mc-label">No HP</span><span class="mc-val">{{ p.hp }}</span></div>
          <div class="mc-row"><span class="mc-label">KTP</span><span class="mc-val">{{ p.ktp || '-' }}</span></div>
          <div class="mc-row"><span class="mc-label">Masuk</span><span class="mc-val">{{ fmtTgl(p.masuk) }}</span></div>
          <div class="mc-row"><span class="mc-label">Keluar</span><span class="mc-val">{{ fmtTgl(tglKeluar(p) ?? '') }}</span></div>
          <div class="mc-row"><span class="mc-label">Total Dibayar</span><span class="mc-val">{{ fmt(totalDibayar(p)) }}</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="action-btn primary" style="flex:1;justify-content:center" @click="pulihkan(p)">↩️ Pulihkan</button>
        </div>
      </div>
    </div>
    </template>

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
                <option v-for="k in kamarPilihan" :key="k.id" :value="k.nomor">{{ k.nomor }} ({{ k.tipe }})</option>
              </select>
              <small v-if="editId" style="font-size:11px;color:var(--text3)">
                Mengubah kamar di sini membetulkan salah input — tagihan bulan lampau ikut pindah.
                Untuk pindah kamar sungguhan pakai tombol Pindah (🔁).
              </small>
            </div>
            <div class="fg"><label>No HP / WA</label><input v-model="form.hp" placeholder="08xxxxxxxxxx" /></div>
            <div class="fg"><label>Tanggal Masuk</label><input v-model="form.masuk" type="date" /></div>
            <div class="fg" v-if="editId">
              <label>Tanggal Keluar</label>
              <input :value="form.tgl_keluar ? fmtTgl(form.tgl_keluar) : 'Masih menghuni'" readonly />
              <small style="font-size:11px;color:var(--text3)">
                Diisi lewat tombol Keluarkan (📦) supaya tagihan kamar ikut dihitung ulang dan kamarnya dikosongkan.
              </small>
            </div>
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
      :open="confirmEvict" icon="🗑"
      :msg="`Hapus data ${evictTarget?.nama} dari kamar ${evictTarget?.kamar}?`"
      sub="Data penghuni dihapus permanen dan kamar dikembalikan ke Kosong. Untuk penghuni yang pindah keluar, pakai tombol Keluarkan supaya riwayatnya tersimpan di tab Mantan Penghuni."
      ok-label="Hapus" :danger="true"
      @confirm="doEvict" @cancel="confirmEvict = false"
    />

    <!-- Pindah Kamar -->
    <div class="overlay" :class="{ open: showPindah }" @click.self="showPindah = false">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head"><h2>Pindah Kamar</h2><button class="close-btn" @click="showPindah = false">✕</button></div>
        <div class="modal-body" v-if="pindahTarget">
          <p style="color:var(--text2)">{{ pindahTarget.nama }} — sekarang di kamar {{ pindahTarget.kamar }}</p>
          <div class="fg"><label>Kamar Tujuan</label>
            <select v-model="pindahTujuan">
              <option value="">— Pilih Kamar —</option>
              <option v-for="k in kamarTujuan" :key="k.id" :value="k.nomor">{{ k.nomor }} ({{ k.tipe }}) — {{ fmt(k.harga) }}</option>
            </select>
            <small v-if="kamarTujuan.length === 0" style="font-size:11px;color:var(--text3)">
              Tidak ada kamar kosong di properti ini.
            </small>
          </div>
          <div class="fg"><label>Tanggal Pindah</label><input v-model="pindahTgl" type="date" /></div>
          <p v-if="pindahTujuan && bulanEfektif" style="color:var(--text2);font-size:13px">
            {{ bulanBerjalan }} tetap ditagih kamar {{ pindahTarget.kamar }} sebulan penuh.
            Kamar {{ pindahTujuan }} mulai ditagih {{ bulanEfektif }} — sisa hari di kamar baru bulan ini tidak ditagih.
          </p>
          <p style="color:var(--text2);font-size:13px">
            Tagihan yang sudah kemasukan uang tidak diubah dan tidak dihapus.
          </p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showPindah = false">Batal</button>
          <button class="btn btn-primary" :disabled="!pindahTujuan || !pindahTgl" @click="doPindah">Pindahkan</button>
        </div>
      </div>
    </div>

    <!-- Keluarkan Penghuni -->
    <div class="overlay" :class="{ open: showKeluar }" @click.self="showKeluar = false">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-head"><h2>Keluarkan Penghuni</h2><button class="close-btn" @click="showKeluar = false">✕</button></div>
        <div class="modal-body" v-if="keluarTarget">
          <p style="color:var(--text2)">{{ keluarTarget.nama }} — kamar {{ keluarTarget.kamar }}</p>
          <div class="fg"><label>Tanggal Keluar</label><input v-model="keluarTgl" type="date" /></div>
          <p style="color:var(--text2);font-size:13px">
            Tagihan kamar ini dihitung ulang sesuai hari yang ditempati. Tagihan yang sudah kemasukan uang —
            lunas maupun baru dibayar sebagian — nominalnya tidak diubah dan tidak dihapus.
          </p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showKeluar = false">Batal</button>
          <button class="btn btn-primary" :disabled="!keluarTgl" @click="doKeluar">Keluarkan</button>
        </div>
      </div>
    </div>
  </div>
</template>
