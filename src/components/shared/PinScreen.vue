<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  mode: 'enter' | 'setup' | 'confirm' | 'change'
  /** Tampilkan tombol biometrik — hanya saat membuka, bukan saat membuat PIN. */
  biometrik?: boolean
}>()
const emit = defineEmits<{ verified: [pin: string]; biometrik: [] }>()

const pin = ref('')
const error = ref('')

const title = computed(() => {
  if (props.mode === 'setup') return 'Buat PIN Baru'
  if (props.mode === 'confirm') return 'Konfirmasi PIN'
  if (props.mode === 'change') return 'PIN Lama'
  return 'Masukkan PIN'
})

const subtitle = computed(() => {
  if (props.mode === 'setup') return 'Masukkan 6 digit PIN baru kamu'
  if (props.mode === 'confirm') return 'Masukkan PIN sekali lagi untuk konfirmasi'
  return 'Masukkan 6 digit PIN kamu'
})

function input(n: number) {
  if (pin.value.length >= 6) return
  pin.value += String(n)
  if (pin.value.length === 6) setTimeout(() => check(), 120)
}

function del() { if (pin.value.length > 0) pin.value = pin.value.slice(0, -1) }
function clear() { pin.value = '' }

function check() {
  emit('verified', pin.value)
  pin.value = ''
}

function setError(msg: string) {
  error.value = msg
  setTimeout(() => { error.value = '' }, 2000)
}

defineExpose({ setError })
</script>

<template>
  <div id="pin-screen" style="display:flex;position:fixed;inset:0;background:var(--surf);z-index:9998;flex-direction:column;align-items:center;justify-content:center;gap:0;padding:40px 24px">
    <div style="margin-bottom:32px;text-align:center">
      <div style="width:56px;height:56px;background:var(--green);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 16px">🔐</div>
      <div style="font-size:20px;font-weight:700;letter-spacing:-.3px;margin-bottom:6px">{{ title }}</div>
      <div style="font-size:13px;color:var(--text3)">{{ subtitle }}</div>
    </div>
    <div style="display:flex;gap:14px;margin-bottom:36px">
      <div v-for="i in 6" :key="i" class="pd" :class="{ filled: pin.length >= i }"></div>
    </div>
    <div style="font-size:13px;color:var(--red);margin-bottom:16px;min-height:20px;font-weight:600">{{ error }}</div>
    <div style="display:grid;grid-template-columns:repeat(3,72px);gap:12px">
      <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" class="pn-btn" @click="input(n)">{{ n }}</button>
      <button class="pn-btn pn-ghost" style="font-size:13px" @click="clear">Hapus</button>
      <button class="pn-btn" @click="input(0)">0</button>
      <button class="pn-btn pn-ghost" @click="del">⌫</button>
    </div>
    <!-- PIN tetap ada sebagai jalan masuk cadangan: biometrik bisa gagal, dan
         perangkat baru belum punya kredensial terdaftar. -->
    <button v-if="biometrik" class="btn btn-ghost" style="margin-top:28px;padding:12px 22px;font-size:14px"
            @click="emit('biometrik')">
      👤 Buka dengan Face ID / Sidik Jari
    </button>
  </div>
</template>
