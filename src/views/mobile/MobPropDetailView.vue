<script setup lang="ts">
/* Detail properti: Kamar / Transaksi / Lainnya.
 *
 * Tab "Lainnya" menampilkan keterangan properti langsung, bukan daftar baris
 * yang menuju layar lain. Catatan internal dan riwayat penghuni belum diport,
 * dan baris yang tidak menuju ke mana-mana adalah jalan buntu — hal yang baru
 * saja dihabiskan di mockup.
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobTabs from '../../components/mobile/MobTabs.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import { useMobile, LABEL_STATUS } from '../../composables/useMobile'
import { usePropertiesStore } from '../../stores/properties'
import { useTagihanStore } from '../../stores/tagihan'
import { usePengeluaranStore } from '../../stores/pengeluaran'
import { nilaiDibayar, tglPembayaran } from '../../utils/saldo'
import { bulanKey } from '../../utils/date'
import { fmt, fmtTgl } from '../../utils/format'
import MobPengeluaranSheet from '../../components/mobile/MobPengeluaranSheet.vue'
import MobPropertiSheet from '../../components/mobile/MobPropertiSheet.vue'
import MobKamarSheet from '../../components/mobile/MobKamarSheet.vue'
import { useKamarStore } from '../../stores/kamar'
import type { Kamar } from '../../types'
import type { Property } from '../../types'
import { useLogStore } from '../../stores/log'
import { useToast } from '../../composables/useToast'

const route = useRoute()
const router = useRouter()
const properties = usePropertiesStore()
const tagihanStore = useTagihanStore()
const pengeluaranStore = usePengeluaranStore()
const { kamarDi, statusKini, namaPenghuni, hitungan, bulan } = useMobile()

const pid = computed(() => String(route.params.id))
const properti = computed(() => properties.items.find(p => p.id === pid.value))
const tab = ref(0)

const kamar = computed(() => kamarDi(pid.value))
const hit = computed(() => hitungan(pid.value))

/* Arus kas bulan berjalan: uang yang benar-benar diterima, bukan yang ditagih.
   Tagihan yang belum dibayar bukan pemasukan. */
const kunciBulan = computed(() => bulanKey(bulan.value))

const transaksi = computed(() => {
  const masuk = tagihanStore.items
    .filter(t => t.property_id === pid.value && nilaiDibayar(t) > 0)
    .map(t => ({ t: `Sewa ${t.kamar} · ${t.penghuni}`, d: tglPembayaran(t) ?? '', n: nilaiDibayar(t) }))
    .filter(x => x.d.startsWith(kunciBulan.value))
  const keluar = pengeluaranStore.items
    .filter(p => p.property_id === pid.value && (p.tgl ?? '').startsWith(kunciBulan.value))
    .map(p => ({ t: `${p.deskripsi} · ${p.kategori}`, d: p.tgl, n: -p.jumlah }))
  return [...masuk, ...keluar].sort((a, b) => b.d.localeCompare(a.d))
})

const totalMasuk = computed(() => transaksi.value.filter(x => x.n > 0).reduce((s, x) => s + x.n, 0))
const totalKeluar = computed(() => transaksi.value.filter(x => x.n < 0).reduce((s, x) => s + x.n, 0))

const log = useLogStore()
const { show: toast } = useToast()
const sheetPengeluaran = ref(false)
const sheetProperti = ref(false)
const kamarStore = useKamarStore()
const sheetKamar = ref(false)

async function simpanKamar(data: Partial<Kamar>) {
  try {
    await kamarStore.add(data as Omit<Kamar, 'id'>)
    await log.add(`Kamar ${data.nomor} ditambahkan`, 'green', pid.value)
    sheetKamar.value = false
    toast('Kamar ditambahkan', 'success')
  } catch {
    toast('Gagal menambahkan kamar', 'error')
  }
}

async function simpanProperti(data: Partial<Property>) {
  try {
    await properties.updateProperty(pid.value, data)
    sheetProperti.value = false
    toast('Data kos diperbarui', 'success')
  } catch {
    toast('Gagal memperbarui data kos', 'error')
  }
}

async function simpanPengeluaran(deskripsi: string, jumlah: number, kategori: string, tgl: string) {
  try {
    await pengeluaranStore.add({ deskripsi, jumlah, kategori, tgl, property_id: pid.value })
    await log.add(`Pengeluaran ${deskripsi} ${fmt(jumlah)}`, 'red', pid.value)
    sheetPengeluaran.value = false
    toast('Pengeluaran tercatat', 'success')
  } catch {
    toast('Gagal mencatat pengeluaran', 'error')
  }
}

function bukaKamar(nomor: string) {
  router.push({ name: 'm-kamar', params: { id: pid.value, nomor } })
}
</script>

<template>
  <MobScreen :judul="properti?.nama ?? 'Properti'" back>
    <MobTabs v-model="tab" :tabs="['Kamar', 'Transaksi', 'Lainnya']" />

    <!-- Kamar -->
    <template v-if="tab === 0">
      <div class="sechead"><h2>Kamar</h2><span class="count">{{ kamar.length }}</span></div>
      <div v-if="kamar.length" class="stack-v stagger">
        <button
          v-for="k in kamar"
          :key="k.id"
          class="card tap lrow"
          @click="bukaKamar(k.nomor)"
        >
          <span class="roomno" :class="{ vacant: statusKini(k) === 'kosong' }">{{ k.nomor }}</span>
          <span class="lrow-body">
            <span class="lrow-title">{{ namaPenghuni(k) || `Kamar ${k.nomor}` }}</span>
            <span class="lrow-sub">
              {{ statusKini(k) === 'kosong' ? 'Belum ada penghuni' : `${fmt(k.harga)} / bulan` }}
            </span>
          </span>
          <span class="lrow-trail">
            <span class="chip" :class="LABEL_STATUS[statusKini(k)].cls">
              <i class="dot"></i>{{ LABEL_STATUS[statusKini(k)].label }}
            </span>
            <span class="chev"><MobIcon name="chev" :size="18" /></span>
          </span>
        </button>
      </div>
      <div v-else class="card emptystate">
        <h3>Belum ada kamar</h3>
        <p>Tambahkan kamar lewat tampilan desktop.</p>
      </div>
    </template>

    <!-- Transaksi -->
    <template v-else-if="tab === 1">
      <div class="sechead"><h2>{{ bulan }}</h2></div>
      <div v-if="transaksi.length" class="stagger">
        <section class="card flush summary">
          <div>
            <div class="mlabel">Masuk</div>
            <div class="amt" style="color:var(--ok)">{{ fmt(totalMasuk) }}</div>
          </div>
          <div>
            <div class="mlabel">Keluar</div>
            <div class="amt" style="color:var(--bad)">{{ fmt(Math.abs(totalKeluar)) }}</div>
          </div>
        </section>
        <div class="sechead"><h2>Riwayat</h2><span class="count">{{ transaksi.length }}</span></div>
        <div class="card flush divide">
          <div v-for="(x, i) in transaksi" :key="i" class="lrow">
            <span class="av sm" :class="x.n > 0 ? 'pos' : 'ghost'">
              <MobIcon :name="x.n > 0 ? 'in' : 'out'" :size="17" />
            </span>
            <span class="lrow-body">
              <span class="lrow-title" style="font-size:14.5px">{{ x.t }}</span>
              <span class="lrow-sub">{{ fmtTgl(x.d) }}</span>
            </span>
            <span class="txn-amt" :class="x.n > 0 ? 'in' : 'out'">
              {{ x.n > 0 ? '+' : '−' }}{{ fmt(Math.abs(x.n)) }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="card emptystate">
        <h3>Belum ada transaksi</h3>
        <p>Pembayaran dan pengeluaran bulan ini akan muncul di sini.</p>
      </div>
    </template>

    <!-- Lainnya -->
    <template v-else>
      <div class="sechead">
        <h2>Keterangan</h2>
        <button class="link" @click="sheetProperti = true">Ubah</button>
      </div>
      <dl class="card flush divide stagger">
        <div class="drow"><dt>Alamat</dt><dd class="wrap">{{ properti?.alamat || '–' }}</dd></div>
        <div class="drow"><dt>Telepon</dt><dd>{{ properti?.no_hp || '–' }}</dd></div>
        <div class="drow"><dt>Bank</dt><dd class="wrap">{{ properti?.bank_nama || '–' }}</dd></div>
        <div class="drow"><dt>Rekening</dt><dd class="wrap">{{ properti?.bank_rekening || '–' }}</dd></div>
      </dl>

      <div class="sechead"><h2>Ringkasan kamar</h2></div>
      <dl class="card flush divide">
        <div class="drow"><dt>Jumlah kamar</dt><dd>{{ hit.total }}</dd></div>
        <div class="drow"><dt>Terisi</dt><dd>{{ hit.terisi }} dari {{ hit.total }}</dd></div>
        <div class="drow"><dt>Kosong</dt><dd>{{ hit.kosong }}</dd></div>
        <div class="drow"><dt>Telat</dt><dd>{{ hit.telat }}</dd></div>
      </dl>
    </template>

    <template v-if="tab === 0" #fab>
      <button class="fab" @click="sheetKamar = true">
        <MobIcon name="plus" :size="20" />
        <span class="fab-label">Kamar</span>
      </button>
    </template>

    <template v-else-if="tab === 1" #fab>
      <button class="fab" @click="sheetPengeluaran = true">
        <MobIcon name="plus" :size="20" />
        <span class="fab-label">Pengeluaran</span>
      </button>
    </template>

    <MobKamarSheet
      v-if="sheetKamar"
      :property-id="pid"
      :nama-properti="properti?.nama ?? ''"
      @tutup="sheetKamar = false"
      @simpan="simpanKamar"
    />

    <MobPropertiSheet
      v-if="sheetProperti && properti"
      :properti="properti"
      @tutup="sheetProperti = false"
      @simpan="simpanProperti"
    />

    <MobPengeluaranSheet
      v-if="sheetPengeluaran"
      :nama-properti="properti?.nama ?? ''"
      @tutup="sheetPengeluaran = false"
      @simpan="simpanPengeluaran"
    />
  </MobScreen>
</template>
