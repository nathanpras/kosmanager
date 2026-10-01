<script setup lang="ts">
/* Seluruh tagihan, per bulan.
 *
 * Satu baris bisa punya tiga tindakan berbeda tergantung statusnya, dan
 * ketiganya tidak pernah muncul bersamaan: yang belum dibayar menawarkan
 * pengingat WhatsApp, yang sudah dibayar menawarkan kuitansi, dan yang belum
 * lunas menawarkan pencatatan pembayaran. Tombol yang tidak berlaku tidak
 * dirender — bukan dinonaktifkan.
 */
import { computed, ref } from 'vue'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import MobBayarSheet from '../../components/mobile/MobBayarSheet.vue'
import InvoiceDoc from '../../components/shared/InvoiceDoc.vue'
import { useTagihanStore } from '../../stores/tagihan'
import { usePenghuniStore } from '../../stores/penghuni'
import { useSettingsStore } from '../../stores/settings'
import { usePropertiesStore } from '../../stores/properties'
import { useUrutKamar } from '../../composables/useUrutKamar'
import { useBayarTagihan } from '../../composables/useBayarTagihan'
import { useInvoice } from '../../composables/useInvoice'
import { useMonths } from '../../composables/useMonths'
import { useToast } from '../../composables/useToast'
import { generateReminderURL, isValidPhone, DEFAULT_TEMPLATE } from '../../composables/useWAReminder'
import { statusTagihan } from '../../utils/statusTagihan'
import { nilaiDibayar } from '../../utils/saldo'
import { fmt } from '../../utils/format'
import { bulanIni } from '../../utils/date'
import type { Tagihan } from '../../types'

const tagihanStore = useTagihanStore()
const penghuni = usePenghuniStore()
const settings = useSettingsStore()
const properties = usePropertiesStore()
const { urutkan } = useUrutKamar()
const { catat } = useBayarTagihan()
const { idsUntuk } = useInvoice()
const { availableMonths } = useMonths()
const { show: toast } = useToast()

const bulan = ref(bulanIni())
const bayarTarget = ref<Tagihan | null>(null)
const invoiceIds = ref<string[]>([])
const invoiceTerbuka = ref(false)

const daftarBulan = computed(() => {
  const ada = availableMonths.value
  return ada.includes(bulan.value) ? ada : [bulan.value, ...ada]
})

const daftar = computed(() =>
  urutkan(tagihanStore.items.filter(t => t.bulan === bulan.value && !t.hangus)))

const total = computed(() => daftar.value.reduce((s, t) => s + (Number(t.jumlah) || 0), 0))
const terkumpul = computed(() => daftar.value.reduce((s, t) => s + nilaiDibayar(t), 0))

const CHIP: Record<string, { label: string; cls: string }> = {
  lunas: { label: 'Lunas', cls: 'ok' },
  kurang: { label: 'Kurang', cls: 'warn' },
  telat: { label: 'Telat', cls: 'bad' },
  belum: { label: 'Belum', cls: 'warn' },
}

function namaProperti(id: string): string {
  return properties.items.find(p => p.id === id)?.nama ?? ''
}

function penghuniTagihan(t: Tagihan) {
  if (t.penghuni_id) {
    const p = penghuni.items.find(x => x.id === t.penghuni_id)
    if (p) return p
  }
  return penghuni.items.find(p => p.kamar === t.kamar && p.property_id === t.property_id) ?? null
}

function ingatkan(t: Tagihan) {
  const p = penghuniTagihan(t)
  if (!p) { toast('Penghuni tagihan ini tidak ditemukan', 'error'); return }
  if (!isValidPhone(p.hp)) { toast(`Nomor HP ${p.nama} tidak valid`, 'error'); return }
  const template = settings.data.wa_template || DEFAULT_TEMPLATE
  window.open(generateReminderURL(p, t, template, statusTagihan(t).sisa), '_blank')
}

function bukaInvoice(t: Tagihan) {
  invoiceIds.value = idsUntuk(t)
  invoiceTerbuka.value = true
}

async function simpanBayar(jumlah: number, tgl: string) {
  const t = bayarTarget.value
  if (!t) return
  try {
    await catat(t, jumlah, tgl)
    bayarTarget.value = null
    toast('Pembayaran dicatat', 'success')
  } catch {
    toast('Gagal mencatat pembayaran', 'error')
  }
}
</script>

<template>
  <MobScreen judul="Tagihan" back>
    <div class="filterbar">
      <button
        v-for="b in daftarBulan"
        :key="b"
        class="fchip"
        :class="{ 'is-on': bulan === b }"
        @click="bulan = b"
      >{{ b }}</button>
    </div>

    <div class="stagger">
      <div class="sechead"><h2>{{ bulan }}</h2><span class="count">{{ daftar.length }}</span></div>

      <section v-if="daftar.length" class="card flush summary">
        <div>
          <div class="mlabel">Terkumpul</div>
          <div class="amt" style="color:var(--ok)">{{ fmt(terkumpul) }}</div>
        </div>
        <div>
          <div class="mlabel">Total tagihan</div>
          <div class="amt">{{ fmt(total) }}</div>
        </div>
      </section>

      <div v-if="daftar.length" class="stack-v" style="margin-top:10px">
        <div v-for="t in daftar" :key="t.id" class="card">
          <div class="lrow" style="padding:0 0 12px">
            <span class="roomno">{{ t.kamar }}</span>
            <span class="lrow-body">
              <span class="lrow-title">{{ t.penghuni }}</span>
              <span class="lrow-sub">{{ namaProperti(t.property_id) }}</span>
              <span class="lrow-sub">{{ fmt(t.jumlah) }}</span>
            </span>
            <span class="chip" :class="CHIP[statusTagihan(t).status].cls">
              <i class="dot"></i>{{ CHIP[statusTagihan(t).status].label }}
            </span>
          </div>

          <div style="display:flex;gap:8px">
            <button
              v-if="statusTagihan(t).status !== 'lunas'"
              class="btn brandsoft sm" style="flex:1"
              @click="bayarTarget = t"
            >Catat bayar</button>
            <button
              v-if="statusTagihan(t).status !== 'lunas'"
              class="btn sm" style="flex:1"
              @click="ingatkan(t)"
            ><MobIcon name="wa" :size="15" /> Ingatkan</button>
            <button
              v-if="nilaiDibayar(t) > 0"
              class="btn sm" style="flex:1"
              @click="bukaInvoice(t)"
            ><MobIcon name="receipt" :size="15" /> Kuitansi</button>
          </div>
        </div>
      </div>

      <div v-else class="card emptystate">
        <h3>Belum ada tagihan</h3>
        <p>Tidak ada tagihan untuk {{ bulan }}.</p>
      </div>
    </div>

    <MobBayarSheet
      v-if="bayarTarget"
      :tagihan="bayarTarget"
      :sub="`${bayarTarget.penghuni} · Kamar ${bayarTarget.kamar}`"
      @tutup="bayarTarget = null"
      @simpan="simpanBayar"
    />

    <InvoiceDoc
      :open="invoiceTerbuka"
      :tagihan-ids="invoiceIds"
      @close="invoiceTerbuka = false"
    />
  </MobScreen>
</template>
