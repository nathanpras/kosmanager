<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

async function loadData() {
  await Promise.all([
    kamar.load(), penghuni.load(), tagihan.load(),
    pengeluaran.load(), maintenance.load(), properties.load(),
    settings.load(), log.load(),
  ])
  app.initProperty()
  app.isReady = true
  showApp.value = true
}

onMounted(async () => {
  app.initTheme()
  try {
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
      <button @click="() => location.reload()" style="padding:12px 24px;background:#0D9B6E;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;width:100%">🔄 Coba Lagi</button>
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
