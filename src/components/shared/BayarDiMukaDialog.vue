<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTagihanStore } from '../../stores/tagihan'
import { usePenghuniStore } from '../../stores/penghuni'
import { useLogStore } from '../../stores/log'
import { useTagihanCalc } from '../../composables/useTagihanCalc'
import type { DraftTagihan } from '../../composables/useTagihanCalc'
import { useProperty } from '../../composables/useProperty'
import { useToast } from '../../composables/useToast'
import { bulanBerurutan, bagiDiskon } from '../../utils/bayarDiMuka'
import { bulanIni, today } from '../../utils/date'
import { fmt } from '../../utils/format'
import { sudahKeluar } from '../../composables/useOccupancy'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [ref: string] }>()

const tagihan = useTagihanStore()
const penghuni = usePenghuniStore()
const log = useLogStore()
const { tagihanUntukKamar } = useTagihanCalc()
const { filterByProperty } = useProperty()
const { show: toast } = useToast()

const penghuniId = ref('')
const bulanMulai = ref(bulanIni())
const jumlahBulan = ref(6)
const diskon = ref(0)
const tglBayar = ref(today())
const menyimpan = ref(false)

/** Pilihan bulan mulai: 12 bulan ke depan dari bulan berjalan. */
const bulanOpsi = computed(() => bulanBerurutan(bulanIni(), 12))

const kandidat = computed(() => filterByProperty(penghuni.items).filter(p => !sudahKeluar(p)))
const terpilih = computed(() => penghuni.items.find(p => p.id === penghuniId.value) ?? null)

/** Bulan yang sudah punya tagihan lunas tidak boleh ikut — nanti dobel bayar. */
const bentrok = computed(() => {
  const p = terpilih.value
  if (!p) return [] as string[]
  const bulan = bulanBerurutan(bulanMulai.value, jumlahBulan.value)
  return bulan.filter(b => tagihan.items.some(t =>
    t.bulan === b && t.property_id === p.property_id && t.status === 'lunas'
    && (t.penghuni_id === p.id || t.penghuni === p.nama)))
})

interface BarisBatch {
  bulan: string
  jumlah: number
  /** Terisi bila tagihan bulan itu sudah ada dan tinggal dilunasi. */
  id?: string
  /** Terisi bila tagihannya belum ada dan harus dibuat. */
  draft?: DraftTagihan
}

// Bulan-bulan ke depan memakai komposisi penghuni saat ini — asumsi yang wajar
// saat menerima bayaran di muka. Kalau kamarnya kemudian jadi berdua atau
// penghuninya berganti, tagihan yang sudah dibuat di sini tidak dihitung ulang.
const baris = computed<BarisBatch[]>(() => {
  const p = terpilih.value
  if (!p) return []
  const bulan = bulanBerurutan(bulanMulai.value, jumlahBulan.value)
  const dasar: BarisBatch[] = bulan.map(b => {
    const lama = tagihan.items.find(t => t.bulan === b && t.property_id === p.property_id
      && (t.penghuni_id === p.id || t.penghuni === p.nama))
    if (lama) return { bulan: b, jumlah: Number(lama.jumlah) || 0, id: lama.id }
    const draft = tagihanUntukKamar(p.kamar, p.property_id, b)
    const milikDia = draft.find(d => d.penghuni_id === p.id) ?? draft[0]
    return { bulan: b, jumlah: milikDia?.jumlah ?? 0, draft: milikDia }
  })
  const setelahDiskon = bagiDiskon(dasar.map(x => x.jumlah), diskon.value)
  return dasar.map((x, i) => ({ ...x, jumlah: setelahDiskon[i] }))
})

const subtotal = computed(() => baris.value.reduce((s, x) => s + x.jumlah, 0) + (Number(diskon.value) || 0))
const total = computed(() => baris.value.reduce((s, x) => s + x.jumlah, 0))

watch(() => props.open, (v) => {
  if (!v) return
  penghuniId.value = ''; bulanMulai.value = bulanIni(); jumlahBulan.value = 6
  diskon.value = 0; tglBayar.value = today()
})

async function simpan() {
  const p = terpilih.value
  if (!p) { toast('Pilih penghuni dulu', 'error'); return }
  if (bentrok.value.length) { toast(`Sudah lunas: ${bentrok.value.join(', ')}`, 'error'); return }
  if (total.value <= 0) { toast('Total tidak boleh nol', 'error'); return }
  menyimpan.value = true
  const bayar_ref = `BDM-${Date.now()}`
  try {
    for (const b of baris.value) {
      const isi = {
        status: 'lunas' as const, jumlah: b.jumlah, jumlah_bayar: b.jumlah,
        tgl: tglBayar.value, bayar_ref, diskon_batch: Number(diskon.value) || 0,
      }
      if (b.id) await tagihan.update(b.id, isi)
      else if (b.draft) await tagihan.add({
        ...b.draft, ...isi, property_id: p.property_id, createdAt: new Date().toISOString(),
      })
    }
    await log.add(
      `${p.nama} bayar ${baris.value.length} bulan di muka ${fmt(total.value)}`
        + (diskon.value ? ` (diskon ${fmt(diskon.value)})` : ''),
      'green', p.property_id,
    )
    toast(`${baris.value.length} bulan ditandai lunas`, 'success')
    emit('saved', bayar_ref)
    emit('close')
  } catch { toast('Gagal menyimpan pembayaran', 'error') }
  finally { menyimpan.value = false }
}
</script>

<template>
  <div class="overlay" :class="{ open: props.open }" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-handle"></div>
      <div class="modal-head"><h2>Bayar Beberapa Bulan</h2><button class="close-btn" @click="emit('close')">✕</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="fg full">
            <label>Penghuni</label>
            <select v-model="penghuniId">
              <option value="">— Pilih —</option>
              <option v-for="p in kandidat" :key="p.id" :value="p.id">{{ p.nama }} ({{ p.kamar }})</option>
            </select>
          </div>
          <div class="fg">
            <label>Bulan Mulai</label>
            <select v-model="bulanMulai">
              <option v-for="m in bulanOpsi" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="fg">
            <label>Jumlah Bulan</label>
            <input v-model.number="jumlahBulan" type="number" min="1" max="24" />
          </div>
          <div class="fg">
            <label>Diskon (Rp)</label>
            <input v-model.number="diskon" type="number" min="0" />
          </div>
          <div class="fg">
            <label>Tanggal Bayar</label>
            <input v-model="tglBayar" type="date" />
          </div>
        </div>

        <div v-if="bentrok.length > 0" class="alert alert-red" style="margin-top:14px">
          ⚠ Sudah lunas, tidak bisa ikut batch: {{ bentrok.join(', ') }}
        </div>

        <template v-if="terpilih && baris.length > 0">
          <hr class="divider">
          <table>
            <thead><tr><th>Bulan</th><th>Jumlah</th></tr></thead>
            <tbody>
              <tr v-for="b in baris" :key="b.bulan">
                <td>{{ b.bulan }}</td>
                <td>{{ fmt(b.jumlah) }}</td>
              </tr>
            </tbody>
          </table>

          <hr class="divider">
          <div class="info-row"><span class="info-label">Subtotal</span><span class="info-val">{{ fmt(subtotal) }}</span></div>
          <div class="info-row"><span class="info-label">Diskon</span><span class="info-val">{{ diskon ? '-' + fmt(diskon) : fmt(0) }}</span></div>
          <div class="info-row"><span class="info-label">Total</span><span class="info-val" style="color:var(--green);font-size:15px">{{ fmt(total) }}</span></div>
        </template>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" @click="emit('close')">Batal</button>
        <button class="btn btn-primary" :disabled="menyimpan || bentrok.length > 0" @click="simpan">
          {{ menyimpan ? 'Menyimpan…' : 'Simpan' }}
        </button>
      </div>
    </div>
  </div>
</template>
