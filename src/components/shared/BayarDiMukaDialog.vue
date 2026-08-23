<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTagihanStore } from '../../stores/tagihan'
import { usePenghuniStore } from '../../stores/penghuni'
import { usePropertiesStore } from '../../stores/properties'
import { useAppStore } from '../../stores/app'
import { useLogStore } from '../../stores/log'
import { useTagihanCalc, kunciTagihan } from '../../composables/useTagihanCalc'
import { kamarDiBulan } from '../../utils/riwayatKamar'
import type { DraftTagihan } from '../../composables/useTagihanCalc'
import type { Tagihan } from '../../types'
import { useProperty } from '../../composables/useProperty'
import { useToast } from '../../composables/useToast'
import { bulanBerurutan, bagiDiskon } from '../../utils/bayarDiMuka'
import { bulanIni, today } from '../../utils/date'
import { fmt } from '../../utils/format'
import { sudahKeluar } from '../../composables/useOccupancy'
import { nilaiDibayar } from '../../utils/saldo'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [ref: string] }>()

const tagihan = useTagihanStore()
const penghuni = usePenghuniStore()
const properties = usePropertiesStore()
const app = useAppStore()
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

/**
 * Penghuni aktif, urut nomor kamar: 101–107, lalu 201–209, lalu 301 dan
 * seterusnya. `penghuni.items` datang dalam urutan dokumen Firestore, yang
 * praktis acak — dalam daftar 20 orang, mencari satu nama jadi menyisir satu per
 * satu, dan orang yang ada di daftar terasa seperti tidak ada.
 *
 * localeCompare numeric dipakai supaya "101" < "201" dibandingkan sebagai angka;
 * perbandingan string biasa masih benar untuk nomor tiga digit, tapi langsung
 * salah begitu ada kamar bernomor dua atau empat digit.
 */
const kandidat = computed(() => {
  const urutProperti = new Map(properties.items.map((p, i) => [p.id, i]))
  return filterByProperty(penghuni.items)
    .filter(p => !sudahKeluar(p))
    .sort((a, b) =>
      (urutProperti.get(a.property_id) ?? 999) - (urutProperti.get(b.property_id) ?? 999)
      || (a.kamar ?? '').localeCompare(b.kamar ?? '', undefined, { numeric: true })
      || (a.nama ?? '').localeCompare(b.nama ?? ''))
})

/**
 * Dikelompokkan per properti untuk mode "Semua Properti".
 *
 * Wajib: Waru Raya dan Citra 1 sama-sama punya kamar 101–107, jadi tanpa
 * pengelompokan daftar itu memuat dua "101" yang tidak bisa dibedakan — dan
 * salah pilih berarti pembayaran enam bulan tercatat ke orang di gedung lain.
 */
const kandidatGrup = computed(() => {
  const grup = new Map<string, typeof penghuni.items>()
  for (const p of kandidat.value) {
    const isi = grup.get(p.property_id) ?? []
    isi.push(p)
    grup.set(p.property_id, isi)
  }
  return [...grup].map(([id, items]) => ({
    id,
    nama: properties.items.find(x => x.id === id)?.nama ?? 'Tanpa properti',
    items,
  }))
})

/** Daftar perlu dikelompokkan hanya bila memang menampilkan lebih dari satu properti. */
const pakaiGrup = computed(() => app.currentPropertyId === 'all' && kandidatGrup.value.length > 1)
const terpilih = computed(() => penghuni.items.find(p => p.id === penghuniId.value) ?? null)

interface BarisBatch {
  bulan: string
  jumlah: number
  /**
   * Nama pemilik tagihan bulan itu. Bisa roommate, bukan orang yang dipilih:
   * selama tidak ada yang keluar di tengah bulan, satu kamar cuma punya satu
   * tagihan gabungan atas nama penanggung.
   */
  atasNama: string
  /** true bila tagihan yang jadi sasaran bulan ini sudah kemasukan uang. */
  bentrok: boolean
  /** Terisi bila tagihan bulan itu sudah ada dan tinggal dilunasi. */
  id?: string
  /** Terisi bila tagihannya belum ada dan harus dibuat. */
  draft?: DraftTagihan
}

/** Apakah tagihan `t` menunjuk orang yang sama dengan draft `d`? */
function cocokDraft(t: Tagihan, d: DraftTagihan): boolean {
  const kunciT = kunciTagihan(t)
  return kunciTagihan({ ...d, property_id: t.property_id }).some(k => kunciT.includes(k))
}

// Bulan-bulan ke depan memakai komposisi penghuni saat ini — asumsi yang wajar
// saat menerima bayaran di muka. Kalau kamarnya kemudian jadi berdua atau
// penghuninya berganti, tagihan yang sudah dibuat di sini tidak dihitung ulang.
const baris = computed<BarisBatch[]>(() => {
  const p = terpilih.value
  if (!p) return []
  const bulan = bulanBerurutan(bulanMulai.value, jumlahBulan.value)
  const dasar: BarisBatch[] = bulan.map(b => {
    // Kamar diambil per bulan: kalau penghuni sudah menjadwalkan pindah, bulan
    // sebelum pindahan tetap ditagihkan ke kamar lama.
    const nomor = kamarDiBulan(p, b)
    const draft = tagihanUntukKamar(nomor, p.property_id, b)
    // Tagihan kamar ini, bukan tagihan "milik" orang yang dipilih: kalau
    // dicari per orang, roommate yang bukan penanggung tidak pernah menemukan
    // tagihan kamarnya dan batch ini membuat tagihan kedua di bulan yang sama.
    const milikDia = draft.find(d => d.penghuni_id === p.id)
    const sasaranDraft = milikDia ?? draft[0]
    const calon = tagihan.items.filter(t =>
      t.bulan === b && t.property_id === p.property_id && t.kamar === nomor
      && (t.penghuni_id === p.id || t.penghuni === p.nama
        || (sasaranDraft != null && cocokDraft(t, sasaranDraft))))

    // Dites lewat nilaiDibayar(), bukan status === 'lunas': tagihan berstatus
    // 'kurang' juga sudah menyimpan uang sungguhan dan tidak boleh ditimpa.
    const berbayar = calon.find(t => nilaiDibayar(t) > 0)
    const lama = calon.find(t => nilaiDibayar(t) === 0)
    if (lama) {
      return {
        bulan: b, jumlah: Number(lama.jumlah) || 0, atasNama: lama.penghuni,
        bentrok: !!berbayar, id: lama.id,
      }
    }
    return {
      bulan: b,
      jumlah: sasaranDraft?.jumlah ?? 0,
      atasNama: sasaranDraft?.penghuni ?? p.nama,
      bentrok: !!berbayar,
      draft: sasaranDraft,
    }
  })
  const setelahDiskon = bagiDiskon(dasar.map(x => x.jumlah), diskon.value)
  return dasar.map((x, i) => ({ ...x, jumlah: setelahDiskon[i] }))
})

/** Bulan yang tagihannya sudah kemasukan uang — tidak boleh ikut, nanti dobel bayar. */
const bentrok = computed(() => baris.value.filter(x => x.bentrok).map(x => x.bulan))

/** Bulan yang jumlahnya jadi negatif setelah diskon dibagi — diskon kelewat besar. */
const barisNegatif = computed(() => baris.value.filter(x => x.jumlah < 0).map(x => x.bulan))

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
  if (bentrok.value.length) { toast(`Sudah ada pembayaran tercatat: ${bentrok.value.join(', ')}`, 'error'); return }
  if (barisNegatif.value.length) { toast(`Diskon kelewat besar, jumlah jadi negatif: ${barisNegatif.value.join(', ')}`, 'error'); return }
  if (total.value <= 0) { toast('Total tidak boleh nol', 'error'); return }
  menyimpan.value = true
  const bayar_ref = `BDM-${Date.now()}`
  let ditulis = 0
  try {
    for (const b of baris.value) {
      const isi = {
        status: 'lunas' as const, jumlah: b.jumlah, jumlah_bayar: b.jumlah,
        tgl: tglBayar.value, bayar_ref, diskon_batch: Number(diskon.value) || 0,
      }
      if (b.id) { await tagihan.update(b.id, isi); ditulis++ }
      else if (b.draft) {
        await tagihan.add({ ...b.draft, ...isi, property_id: p.property_id, createdAt: new Date().toISOString() })
        ditulis++
      }
      // Bulan tanpa `id` maupun `draft` (mis. kamar kosong di bulan itu) dilewati —
      // tidak ada apa-apa untuk ditulis, dan tidak dihitung ke `ditulis`.
    }
    await log.add(
      `${p.nama} bayar ${ditulis} bulan di muka ${fmt(total.value)}`
        + (diskon.value ? ` (diskon ${fmt(diskon.value)})` : ''),
      'green', p.property_id,
    )
    toast(`${ditulis} bulan ditandai lunas`, 'success')
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
              <template v-if="pakaiGrup">
                <optgroup v-for="g in kandidatGrup" :key="g.id" :label="g.nama">
                  <option v-for="p in g.items" :key="p.id" :value="p.id">{{ p.kamar }} — {{ p.nama }}</option>
                </optgroup>
              </template>
              <template v-else>
                <option v-for="p in kandidat" :key="p.id" :value="p.id">{{ p.kamar }} — {{ p.nama }}</option>
              </template>
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
          ⚠ Sudah ada pembayaran tercatat, tidak bisa ikut batch: {{ bentrok.join(', ') }}
        </div>
        <div v-if="barisNegatif.length > 0" class="alert alert-red" style="margin-top:14px">
          ⚠ Diskon kelewat besar, jumlah jadi negatif: {{ barisNegatif.join(', ') }}
        </div>

        <template v-if="terpilih && baris.length > 0">
          <hr class="divider">
          <table>
            <thead><tr><th>Bulan</th><th>Jumlah</th></tr></thead>
            <tbody>
              <tr v-for="b in baris" :key="b.bulan">
                <td>
                  {{ b.bulan }}
                  <div v-if="terpilih && b.atasNama !== terpilih.nama" style="font-size:11px;color:var(--text3)">
                    tagihan kamar ini atas nama {{ b.atasNama }}
                  </div>
                </td>
                <td :style="b.jumlah < 0 ? { color: 'var(--red)', fontWeight: 700 } : {}">{{ fmt(b.jumlah) }}</td>
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
        <button class="btn btn-primary" :disabled="menyimpan || bentrok.length > 0 || barisNegatif.length > 0" @click="simpan">
          {{ menyimpan ? 'Menyimpan…' : 'Simpan' }}
        </button>
      </div>
    </div>
  </div>
</template>
