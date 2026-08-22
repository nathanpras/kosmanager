<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePropertiesStore } from '../../stores/properties'
import { useTagihanStore } from '../../stores/tagihan'
import { usePengeluaranStore } from '../../stores/pengeluaran'
import { useLogStore } from '../../stores/log'
import { useAppStore } from '../../stores/app'
import { useSaldo } from '../../composables/useSaldo'
import { useToast } from '../../composables/useToast'
import { fmt } from '../../utils/format'
import { today } from '../../utils/date'
import { nilaiDibayar, tglPembayaran } from '../../utils/saldo'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const properties = usePropertiesStore()
const tagihan = useTagihanStore()
const pengeluaran = usePengeluaranStore()
const log = useLogStore()
const app = useAppStore()
const { perProperti } = useSaldo()
const { show: toast } = useToast()

const propId = ref('')
const nominal = ref(0)
const tgl = ref(today())
const menyimpan = ref(false)

const properti = computed(() => properties.items.find(p => p.id === propId.value) ?? null)

/**
 * Saldo milik satu properti — bukan `useSaldo().saldo`, yang di mode "Semua
 * Properti" adalah gabungan (`gabungSaldo`) semua properti. Memakai angka
 * gabungan sebagai isian awal bisa membuat pengguna diam-diam menimpan saldo
 * satu properti dengan total semua properti.
 */
function saldoProperti(id: string): number {
  return perProperti.value.find(x => x.id === id)?.ringkas.saldo ?? 0
}

/**
 * Saldo properti pada AWAL tanggal `per` — sebelum transaksi hari itu.
 *
 * hitungSaldo() menghitung `tgl >= saldo_awal_tgl`, jadi transaksi yang
 * bertanggal sama dengan tanggal patokan ikut ditambahkan di atas saldo awal.
 * Mengisi kolom ini dengan saldo berjalan apa adanya berarti transaksi hari itu
 * dihitung dua kali: sekali karena sudah termasuk di saldo berjalan, sekali lagi
 * karena hitungSaldo() menambahkannya lagi. Tombol yang tugasnya menyamakan
 * angka dengan rekening justru membuatnya melenceng.
 *
 * Yang dikembalikan di sini adalah angka yang membuat saldo berjalan tetap sama
 * setelah disimpan: saldo sekarang, dikurangi pemasukan dan ditambah pengeluaran
 * yang bertanggal `per` atau sesudahnya.
 */
function saldoAwalPer(id: string, per: string): number {
  const saldoKini = saldoProperti(id)
  if (!id || !per) return Math.round(saldoKini)
  const masuk = tagihan.items
    .filter(t => t.property_id === id)
    .filter(t => { const tgl = tglPembayaran(t); return tgl != null && tgl >= per })
    .reduce((s, t) => s + nilaiDibayar(t), 0)
  const keluar = pengeluaran.items
    .filter(p => p.property_id === id && (p.tgl ?? '') >= per && !!p.tgl)
    .reduce((s, p) => s + (Number(p.jumlah) || 0), 0)
  return Math.round(saldoKini - masuk + keluar)
}

watch(() => props.open, (v) => {
  if (!v) return
  // Mode "Semua Properti" tidak punya satu rekening — Waru 23 dan Citra 1
  // memakai rekening BCA yang berbeda, jadi kosongkan pilihan dan wajibkan
  // dipilih dulu. Kalau cuma ada satu properti, tidak ada yang perlu dipilih.
  propId.value = app.currentPropertyId !== 'all'
    ? app.currentPropertyId
    : (properties.items.length === 1 ? (properties.items[0]?.id ?? '') : '')
  tgl.value = today()
  nominal.value = saldoAwalPer(propId.value, tgl.value)
})

// Ganti properti maupun ganti tanggal selalu menulis ulang nominal dari saldo
// properti itu sendiri pada tanggal itu — supaya angka properti sebelumnya
// (atau angka gabungan saat belum memilih) tidak pernah kebawa, dan supaya
// isian awalnya selalu cocok dengan tanggal yang sedang dipilih.
watch([propId, tgl], ([id, per]) => {
  if (!props.open) return
  nominal.value = saldoAwalPer(id, per)
})

async function simpan() {
  const p = properti.value
  if (!p) { toast('Pilih properti dulu', 'error'); return }
  if (!tgl.value) { toast('Isi tanggal dulu', 'error'); return }
  const lama = Number(p.saldo_awal) || 0
  menyimpan.value = true
  try {
    await properties.updateProperty(p.id, { saldo_awal: Number(nominal.value) || 0, saldo_awal_tgl: tgl.value })
    const selisih = (Number(nominal.value) || 0) - lama
    await log.add(
      `Saldo awal ${p.nama} disesuaikan ke ${fmt(nominal.value)} per awal ${tgl.value} (selisih ${fmt(selisih)})`,
      'blue', p.id,
    )
    toast('Saldo disesuaikan', 'success')
    emit('close')
  } catch { toast('Gagal menyimpan saldo', 'error') }
  finally { menyimpan.value = false }
}
</script>

<template>
  <div class="overlay" :class="{ open: props.open }" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-handle"></div>
      <div class="modal-head"><h2>Sesuaikan Saldo</h2><button class="close-btn" @click="emit('close')">✕</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="fg full" v-if="app.currentPropertyId === 'all'">
            <label>Properti</label>
            <select v-model="propId">
              <option value="">— Pilih —</option>
              <option v-for="p in properties.items" :key="p.id" :value="p.id">{{ p.nama }}</option>
            </select>
          </div>
          <div class="fg full">
            <label>Saldo Bank di Awal Tanggal Ini</label>
            <input v-model.number="nominal" type="number" min="0" />
          </div>
          <div class="fg full">
            <label>Per Tanggal</label>
            <input v-model="tgl" type="date" />
          </div>
        </div>
        <p style="font-size:12px;color:var(--text3);margin-top:12px">
          Isi dengan saldo rekening pada <strong>awal</strong> tanggal itu, sebelum transaksi hari itu masuk —
          pembayaran dan pengeluaran bertanggal tanggal itu dan sesudahnya akan ditambahkan sendiri di atasnya.
          Transaksi sebelum tanggal ini tidak lagi dihitung ke saldo berjalan.
        </p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" @click="emit('close')">Batal</button>
        <button class="btn btn-primary" :disabled="menyimpan" @click="simpan">
          {{ menyimpan ? 'Menyimpan…' : 'Simpan' }}
        </button>
      </div>
    </div>
  </div>
</template>
