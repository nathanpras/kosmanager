<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MONTHS_FULL }         from './utils/format'
import { authReady }          from './firebase'
import { useAppStore }         from './stores/app'
import { useKamarStore }       from './stores/kamar'
import { usePenghuniStore }    from './stores/penghuni'
import { useTagihanStore }     from './stores/tagihan'
import { usePengeluaranStore } from './stores/pengeluaran'
import { useMaintenanceStore } from './stores/maintenance'
import { usePropertiesStore }  from './stores/properties'
import { useSettingsStore }    from './stores/settings'
import { useLogStore }         from './stores/log'

import AppSidebar   from './components/layout/AppSidebar.vue'
import AppTopBar    from './components/layout/AppTopBar.vue'
import AppBottomNav from './components/layout/AppBottomNav.vue'
import PinScreen    from './components/shared/PinScreen.vue'
import AppToast     from './components/shared/AppToast.vue'

const app         = useAppStore()
const kamar       = useKamarStore()
const penghuni    = usePenghuniStore()
const tagihan     = useTagihanStore()
const pengeluaran = usePengeluaranStore()
const maintenance = useMaintenanceStore()
const properties  = usePropertiesStore()
const settings    = useSettingsStore()
const log         = useLogStore()

const w = window

type PinMode = 'enter' | 'setup' | 'confirm' | 'change'
const pinMode   = ref<PinMode>('enter')
const showPin   = ref(false)
const showApp   = ref(false)
const loadError = ref('')
const pinRef    = ref<InstanceType<typeof PinScreen> | null>(null)

async function onPinVerified(pin: string) {
  if (pinMode.value === 'enter') {
    const saved = await settings.getPin()
    if (pin === saved) {
      showPin.value = false
      await loadData()
    } else {
      pinRef.value?.setError('PIN salah, coba lagi')
    }
  } else if (pinMode.value === 'setup') {
    await settings.savePin(pin)
    showPin.value = false
    await loadData()
  } else if (pinMode.value === 'change') {
    const saved = await settings.getPin()
    if (pin === saved) {
      pinMode.value = 'setup'
    } else {
      pinRef.value?.setError('PIN lama salah')
    }
  }
}

function calcJatuhTempo(bulan: string, dueDay: number): string {
  const [mName, yStr] = bulan.split(' ')
  const mIdx = MONTHS_FULL.indexOf(mName)
  return new Date(parseInt(yStr), mIdx, dueDay).toISOString().split('T')[0]
}

async function autoGenerateNextMonth() {
  if (new Date().getDate() < 15) return  // only generate after the 15th
  const d = new Date()
  const nextIdx   = (d.getMonth() + 1) % 12
  const nextYear  = nextIdx === 0 ? d.getFullYear() + 1 : d.getFullYear()
  const nextBulan = `${MONTHS_FULL[nextIdx]} ${nextYear}`
  const dueDay    = settings.data.tgl_jatuh_tempo ?? 10
  const jatuh_tempo  = new Date(nextYear, nextIdx, dueDay).toISOString().split('T')[0]
  const firstOfNext  = new Date(nextYear, nextIdx, 1).toISOString().split('T')[0]
  const existing  = new Set(tagihan.items.filter(t => t.bulan === nextBulan).map(t => `${t.kamar}|${t.property_id}`))
  const toCreate  = penghuni.items.filter(p =>
    (!p.kontrak_selesai || p.kontrak_selesai >= firstOfNext) && !existing.has(`${p.kamar}|${p.property_id}`)
  )
  for (const p of toCreate) {
    const k = kamar.items.find(k => k.nomor === p.kamar && k.property_id === p.property_id)
    await tagihan.add({ penghuni: p.nama, kamar: p.kamar, bulan: nextBulan, jatuh_tempo,
      jumlah: k?.harga ?? 0, status: 'belum', property_id: p.property_id, createdAt: new Date().toISOString() })
  }
}

async function autoSetJatuhTempo() {
  const dueDay   = settings.data.tgl_jatuh_tempo ?? 10
  const toUpdate = tagihan.items.filter(t => !t.jatuh_tempo && t.status !== 'lunas' && t.bulan)
  for (const t of toUpdate) {
    const jatuh_tempo = calcJatuhTempo(t.bulan, dueDay)
    await tagihan.update(t.id, { jatuh_tempo })
  }
}

async function autoSyncRoomStatus() {
  const todayStr = new Date().toISOString().split('T')[0]
  for (const p of penghuni.items) {
    const k = kamar.items.find(k => k.nomor === p.kamar && k.property_id === p.property_id)
    if (!k || k.status === 'kosong' || k.status === 'booked') continue
    const hasOverdue = tagihan.items.some(t =>
      t.kamar === p.kamar && t.property_id === p.property_id &&
      (t.status === 'belum' || t.status === 'kurang') && t.jatuh_tempo && t.jatuh_tempo < todayStr
    )
    if (hasOverdue && k.status !== 'telat')   await kamar.update(k.id, { status: 'telat' })
    else if (!hasOverdue && k.status === 'telat') await kamar.update(k.id, { status: 'terisi' })
  }
}

async function loadData() {
  // Real-time: subscribe() memasang listener onSnapshot dan resolve saat data pertama tiba.
  // Perubahan dari device lain otomatis tampil tanpa reload. settings = dokumen tunggal -> load biasa.
  await Promise.all([
    kamar.subscribe(), penghuni.subscribe(), tagihan.subscribe(),
    pengeluaran.subscribe(), maintenance.subscribe(), properties.subscribe(),
    settings.load(), log.subscribe(),
  ])
  app.initProperty()
  app.isReady = true
  showApp.value = true
  // Auto-routines run sequentially so each can use results of the previous
  ;(async () => {
    await autoGenerateNextMonth()
    await autoSetJatuhTempo()
    await autoSyncRoomStatus()
  })().catch(() => {})
}

onMounted(async () => {
  app.initTheme()
  try {
    await authReady  // pastikan anonymous sign-in selesai sebelum akses Firestore
    const savedPin = await settings.getPin()
    pinMode.value = savedPin ? 'enter' : 'setup'
    showPin.value = true
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : String(e)
  }
})
</script>

<template>
  <div v-if="!showPin && !showApp && !loadError" class="ls">
    <div class="ls-brand">Kos<em>Manager</em></div>
    <div class="spinner"></div>
    <div style="font-size:13px;color:var(--text3);font-weight:500">Menghubungkan...</div>
  </div>

  <div v-else-if="loadError" class="ls">
    <div style="text-align:center;padding:24px;max-width:320px">
      <div style="font-size:40px;margin-bottom:12px">⚠️</div>
      <div style="font-weight:700;font-size:17px;margin-bottom:8px">Gagal Terhubung</div>
      <div style="font-size:12px;color:#888;background:#f5f5f5;padding:10px 12px;border-radius:8px;margin-bottom:16px">{{ loadError }}</div>
      <button @click="() => w.location.reload()" style="padding:12px 24px;background:#0D9B6E;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;width:100%">🔄 Coba Lagi</button>
    </div>
  </div>

  <PinScreen
    v-else-if="showPin"
    ref="pinRef"
    :mode="pinMode"
    @verified="onPinVerified"
  />

  <div v-else-if="showApp" class="shell">
    <AppSidebar @change-pin="pinMode = 'change'; showPin = true" />
    <div class="main">
      <AppTopBar />
      <RouterView class="content" />
    </div>
  </div>

  <AppBottomNav v-if="showApp" />
  <AppToast />
</template>
