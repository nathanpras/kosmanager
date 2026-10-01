<script setup lang="ts">
/* Detail kamar: Penghuni / Harga / Transaksi.
 *
 * Mockup punya tab keempat, "Lainnya", berisi tautan ke foto kamar, catatan,
 * dan riwayat penghuni. Ketiganya belum diport, jadi tabnya belum ada — tab
 * yang isinya hanya baris mati lebih buruk daripada tab yang belum muncul.
 */
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobTabs from '../../components/mobile/MobTabs.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import { useMobile, inisial } from '../../composables/useMobile'
import { useTagihanStore } from '../../stores/tagihan'
import { statusTagihan } from '../../utils/statusTagihan'
import { tglKeluar } from '../../composables/useOccupancy'
import { fmt, fmtTgl } from '../../utils/format'
import { sortBulanDesc } from '../../utils/date'
import MobBayarSheet from '../../components/mobile/MobBayarSheet.vue'
import MobPindahSheet from '../../components/mobile/MobPindahSheet.vue'
import MobKeluarSheet from '../../components/mobile/MobKeluarSheet.vue'
import MobHargaSheet from '../../components/mobile/MobHargaSheet.vue'
import MobTagihanSheet from '../../components/mobile/MobTagihanSheet.vue'
import MobPenghuniSheet from '../../components/mobile/MobPenghuniSheet.vue'
import { useSimpanPenghuni, GagalSimpanPenghuni } from '../../composables/useSimpanPenghuni'
import { useKeluarPenghuni } from '../../composables/useKeluarPenghuni'
import { useKamarStore } from '../../stores/kamar'
import { usePindahKamar, GagalPindah } from '../../composables/usePindahKamar'
import { bulanFromTgl } from '../../utils/date'
import { useBayarTagihan } from '../../composables/useBayarTagihan'
import { useToast } from '../../composables/useToast'
import type { Penghuni, Tagihan } from '../../types'

const route = useRoute()
const tagihanStore = useTagihanStore()
const { kamarSatu, statusKini, penghuniKamar, bulan } = useMobile()

const pid = computed(() => String(route.params.id))
const nomor = computed(() => String(route.params.nomor))
const kamar = computed(() => kamarSatu(pid.value, nomor.value))
const tab = ref(0)

const penghuni = computed(() => (kamar.value ? penghuniKamar(kamar.value) : []))
const kosong = computed(() => !kamar.value || statusKini(kamar.value) === 'kosong')

/** Seluruh tagihan kamar ini, terbaru dulu. */
const tagihan = computed(() => {
  if (!kamar.value) return []
  const milik = tagihanStore.items.filter(
    t => t.kamar === nomor.value && t.property_id === pid.value)
  const urutBulan = sortBulanDesc([...new Set(milik.map(t => t.bulan))])
  return urutBulan.flatMap(b => milik.filter(t => t.bulan === b))
})

const tagihanBulanIni = computed(() => tagihan.value.filter(t => t.bulan === bulan.value))

/* Pembayaran ditulis lewat composable yang sama dengan desktop. */
const { catat } = useBayarTagihan()
const { show: toast } = useToast()
const bayarTarget = ref<Tagihan | null>(null)

const subSheet = computed(() => {
  const p = penghuni.value[0]
  return p ? `${p.nama} · Kamar ${nomor.value}` : `Kamar ${nomor.value}`
})

const { pindahkan } = usePindahKamar()
const { keluarkan } = useKeluarPenghuni()
const kamarStore = useKamarStore()
const keluarTarget = ref<Penghuni | null>(null)
const sheetHarga = ref(false)
const tagihanTarget = ref<Penghuni | null>(null)
const { tambah: tambahPenghuni, ubah: ubahPenghuni } = useSimpanPenghuni()
const sheetPenghuni = ref(false)
const ubahTarget = ref<Penghuni | null>(null)

async function simpanPenghuni(data: Partial<Penghuni>) {
  try {
    if (ubahTarget.value) {
      await ubahPenghuni(ubahTarget.value.id, data)
      toast('Data penghuni diperbarui', 'success')
    } else {
      await tambahPenghuni(data)
      toast('Penghuni ditambahkan', 'success')
    }
    sheetPenghuni.value = false
    ubahTarget.value = null
  } catch (e) {
    toast(e instanceof GagalSimpanPenghuni ? e.message : 'Gagal menyimpan penghuni', 'error')
  }
}

async function simpanTagihan(bln: string, nomorKamar: string, jml: number, tempo: string) {
  const p = tagihanTarget.value
  if (!p) return
  try {
    await tagihanStore.add({
      penghuni: p.nama, penghuni_id: p.id, kamar: nomorKamar, bulan: bln,
      jumlah: jml, status: 'belum', jatuh_tempo: tempo,
      property_id: p.property_id, createdAt: new Date().toISOString(),
    })
    tagihanTarget.value = null
    toast('Tagihan ditambahkan', 'success')
  } catch {
    toast('Gagal menambahkan tagihan', 'error')
  }
}

async function simpanKeluar(tgl: string) {
  const p = keluarTarget.value
  if (!p) return
  try {
    /* Seluruh urusan tagihan ada di useKeluarPenghuni(): tagihan direkonsiliasi
       sekamar-sekamar, bukan per orang. Jangan ditiru di sini. */
    await keluarkan(p, tgl)
    keluarTarget.value = null
    toast('Sewa diakhiri', 'success')
  } catch {
    toast('Gagal mengakhiri sewa', 'error')
  }
}

async function simpanHarga(harga: number) {
  if (!kamar.value) return
  try {
    await kamarStore.update(kamar.value.id, { harga })
    sheetHarga.value = false
    toast('Harga sewa diperbarui', 'success')
  } catch {
    toast('Gagal memperbarui harga', 'error')
  }
}
const pindahTarget = ref<Penghuni | null>(null)

async function simpanPindah(tujuan: string, tgl: string) {
  const p = pindahTarget.value
  if (!p) return
  try {
    const efektif = await pindahkan(p, tujuan, tgl)
    pindahTarget.value = null
    toast(`Dipindahkan ke kamar ${tujuan} — tagihan mulai ${bulanFromTgl(efektif)}`, 'success')
  } catch (e) {
    toast(e instanceof GagalPindah ? e.message : 'Gagal memindahkan penghuni', 'error')
  }
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

const CHIP: Record<string, { label: string; cls: string }> = {
  lunas:  { label: 'Lunas',  cls: 'ok' },
  kurang: { label: 'Kurang', cls: 'warn' },
  telat:  { label: 'Telat',  cls: 'bad' },
  belum:  { label: 'Belum',  cls: 'warn' },
}
</script>

<template>
  <MobScreen :judul="`Kamar ${nomor}`" back>
    <MobTabs v-model="tab" :tabs="['Penghuni', 'Harga', 'Transaksi']" />

    <!-- Penghuni -->
    <template v-if="tab === 0">
      <div class="sechead"><h2>Penghuni aktif</h2></div>
      <div v-if="penghuni.length" class="stagger">
        <section v-for="p in penghuni" :key="p.id" class="card flush" style="margin-bottom:10px">
          <div class="lrow">
            <span class="av">{{ inisial(p.nama) }}</span>
            <span class="lrow-body">
              <span class="lrow-title">{{ p.nama }}</span>
              <span class="lrow-sub">{{ p.hp || 'Nomor HP belum diisi' }}</span>
            </span>
          </div>
          <div class="lease-head" style="padding-top:14px;border-top:1px solid var(--hair)">
            <span class="mlabel">Masa tinggal</span>
            <button class="link" @click="ubahTarget = p; sheetPenghuni = true">Ubah data</button>
            <button class="link" @click="pindahTarget = p">Pindah kamar</button>
            <button class="link" style="color:var(--bad)" @click="keluarTarget = p">Akhiri sewa</button>
          </div>
          <div class="lease-grid">
            <div class="kv">
              <div>
                <div class="mlabel">Check-in</div>
                <div class="mval">{{ fmtTgl(p.masuk) }}</div>
              </div>
              <div>
                <div class="mlabel">Check-out</div>
                <div v-if="tglKeluar(p)" class="mval">{{ fmtTgl(tglKeluar(p)!) }}</div>
                <div v-else class="mval muted">Terbuka<span class="sub">tanpa batas</span></div>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="price-head">
            <div>
              <div class="mlabel">Harga sewa</div>
              <div class="price">{{ fmt(kamar?.harga ?? 0) }}<span class="per"> / bulan</span></div>
            </div>
          </div>
          <div v-for="t in tagihanBulanIni" :key="t.id" class="bill">
            <div class="bill-top">
              <span class="mlabel fig">Sewa · {{ t.bulan }}</span>
              <span class="chip" :class="CHIP[statusTagihan(t).status].cls">
                <i class="dot"></i>{{ CHIP[statusTagihan(t).status].label }}
              </span>
            </div>
            <div class="bill-amt">{{ fmt(t.jumlah) }}</div>
            <button
              v-if="statusTagihan(t).status !== 'lunas'"
              class="btn brandsoft sm block"
              style="margin-top:12px"
              @click="bayarTarget = t"
            >Catat pembayaran</button>
          </div>
          <div v-if="!tagihanBulanIni.length" class="bill">
            <div class="bill-top"><span class="mlabel">Sewa · {{ bulan }}</span></div>
            <div class="bill-amt">Belum ada tagihan</div>
          </div>
        </section>
      </div>

      <div v-else class="card emptystate">
        <div class="emptystate-art"><MobIcon name="door" :size="40" /></div>
        <h3>Kamar ini kosong</h3>
        <p>Tambahkan penghuni untuk mulai mencatat sewa dan tagihan kamar {{ nomor }}.</p>
        <div style="height:14px"></div>
        <button class="btn primary" @click="ubahTarget = null; sheetPenghuni = true">
          <MobIcon name="plus" :size="17" /> Tambah penghuni
        </button>
      </div>
    </template>

    <!-- Harga -->
    <template v-else-if="tab === 1">
      <div class="sechead"><h2>Harga &amp; komponen</h2></div>
      <dl class="card flush divide stagger">
        <div class="drow">
          <dt>Harga sewa</dt>
          <dd>{{ kosong ? '–' : `${fmt(kamar?.harga ?? 0)} / bulan` }}</dd>
        </div>
        <div class="drow">
          <dt>Deposit</dt>
          <dd>{{ kamar?.deposit ? fmt(kamar.deposit) : '–' }}</dd>
        </div>
        <div class="drow">
          <dt>Biaya tambahan</dt>
          <dd>{{ kamar?.nominal_tambahan ? fmt(kamar.nominal_tambahan) : 'Belum ada' }}</dd>
        </div>
        <div class="drow"><dt>Tipe kamar</dt><dd class="wrap">{{ kamar?.tipe || '–' }}</dd></div>
        <div class="drow"><dt>Kategori</dt><dd class="wrap">{{ kamar?.kategori || '–' }}</dd></div>
      </dl>
      <div style="height:16px"></div>
      <button class="btn brandsoft block" @click="sheetHarga = true">
        <MobIcon name="edit" :size="17" /> Ubah harga kamar
      </button>
    </template>

    <!-- Transaksi -->
    <template v-else>
      <div class="sechead">
        <h2>Tagihan kamar {{ nomor }}</h2>
        <span class="count">{{ tagihan.length }}</span>
      </div>
      <div v-if="tagihan.length" class="card flush divide stagger">
        <div v-for="t in tagihan" :key="t.id" class="lrow">
          <span class="av sm" :class="statusTagihan(t).status === 'lunas' ? '' : 'ghost'">
            <MobIcon name="receipt" :size="17" />
          </span>
          <span class="lrow-body">
            <span class="lrow-title" style="font-size:14.5px">Sewa {{ t.bulan }}</span>
            <span class="lrow-sub">{{ fmt(t.jumlah) }}</span>
          </span>
          <span class="chip" :class="CHIP[statusTagihan(t).status].cls">
            <i class="dot"></i>{{ CHIP[statusTagihan(t).status].label }}
          </span>
        </div>
      </div>
      <div v-else class="card emptystate">
        <h3>Belum ada tagihan</h3>
        <p>Tagihan kamar ini akan muncul di sini setelah dibuat.</p>
      </div>

      <template v-if="penghuni.length">
        <div style="height:16px"></div>
        <button class="btn brandsoft block" @click="tagihanTarget = penghuni[0]">
          <MobIcon name="plus" :size="17" /> Tambah tagihan
        </button>
      </template>
    </template>

    <MobPindahSheet
      v-if="pindahTarget"
      :penghuni="pindahTarget"
      @tutup="pindahTarget = null"
      @simpan="simpanPindah"
    />

    <MobPenghuniSheet
      v-if="sheetPenghuni"
      :nomor-kamar="nomor"
      :property-id="pid"
      :penghuni="ubahTarget"
      @tutup="sheetPenghuni = false; ubahTarget = null"
      @simpan="simpanPenghuni"
    />

    <MobTagihanSheet
      v-if="tagihanTarget"
      :penghuni="tagihanTarget"
      @tutup="tagihanTarget = null"
      @simpan="simpanTagihan"
    />

    <MobKeluarSheet
      v-if="keluarTarget"
      :penghuni="keluarTarget"
      @tutup="keluarTarget = null"
      @simpan="simpanKeluar"
    />

    <MobHargaSheet
      v-if="sheetHarga && kamar"
      :kamar="kamar"
      @tutup="sheetHarga = false"
      @simpan="simpanHarga"
    />

    <MobBayarSheet
      v-if="bayarTarget"
      :tagihan="bayarTarget"
      :sub="subSheet"
      @tutup="bayarTarget = null"
      @simpan="simpanBayar"
    />
  </MobScreen>
</template>
