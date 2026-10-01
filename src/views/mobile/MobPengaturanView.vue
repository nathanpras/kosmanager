<script setup lang="ts">
/* Pengaturan di shell mobile.
 *
 * Desktop membaginya jadi lima tab; di layar sempit itu jadi lima lapis yang
 * harus ditebak isinya. Di sini semuanya satu daftar yang bisa digulir, dengan
 * bagian yang panjang dibuka sebagai sheet.
 *
 * Dua hal sengaja TIDAK diport dan dikatakan terus terang, bukan disembunyikan:
 * migrasi penomoran kamar dan saldo awal properti. Keduanya mengubah banyak
 * hal sekaligus dan tidak bisa dibatalkan; layar selebar telapak tangan bukan
 * tempat untuk keputusan seperti itu.
 */
import { computed, onMounted, ref } from 'vue'
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
import MobSheet from '../../components/mobile/MobSheet.vue'
import MobPropertiSheet from '../../components/mobile/MobPropertiSheet.vue'
import { useSettingsStore } from '../../stores/settings'
import { usePropertiesStore } from '../../stores/properties'
import { useBiometrik } from '../../composables/useBiometrik'
import { useEkspor } from '../../composables/useEkspor'
import { useToast } from '../../composables/useToast'
import { DEFAULT_NOMINAL_TAMBAHAN, DEFAULT_TGL_JATUH_TEMPO } from '../../utils/billing'
import type { AppSettings, Property } from '../../types'

const settings = useSettingsStore()
const properties = usePropertiesStore()
const biometrik = useBiometrik()
const { jumlahBaris, eksporCadangan, eksporTagihanCsv, eksporPengeluaranCsv } = useEkspor()
const { show: toast } = useToast()

/* ── Informasi kos ── */
const sheetInfo = ref(false)
const form = ref<Partial<AppSettings>>({})
const galat = ref('')

function bukaInfo() {
  form.value = { ...settings.data }
  galat.value = ''
  sheetInfo.value = true
}

async function simpanInfo() {
  const tempo = Number(form.value.tgl_jatuh_tempo)
  if (form.value.tgl_jatuh_tempo != null && form.value.tgl_jatuh_tempo !== ('' as never)
      && (!Number.isInteger(tempo) || tempo < 1 || tempo > 28)) {
    /* Dibatasi 28 karena Februari — tanggal 29-31 akan hilang di sebagian bulan. */
    galat.value = 'Tanggal jatuh tempo harus antara 1 dan 28.'
    return
  }
  try {
    await settings.save(form.value)
    sheetInfo.value = false
    toast('Pengaturan tersimpan', 'success')
  } catch {
    toast('Gagal menyimpan pengaturan', 'error')
  }
}

/* ── Properti ── */
const propTarget = ref<Property | null>(null)

async function simpanProperti(data: Partial<Property>) {
  if (!propTarget.value) return
  try {
    await properties.updateProperty(propTarget.value.id, data)
    propTarget.value = null
    toast('Data kos diperbarui', 'success')
  } catch {
    toast('Gagal memperbarui data kos', 'error')
  }
}

/* ── Kategori kamar ── */
const sheetKategori = ref(false)
const kategoriBaru = ref('')

async function tambahKategori() {
  const nama = kategoriBaru.value.trim()
  if (!nama) return
  try {
    await properties.addKategori(nama)
    kategoriBaru.value = ''
  } catch { toast('Gagal menambah kategori', 'error') }
}

async function hapusKategori(id: string) {
  try { await properties.removeKategori(id) } catch { toast('Gagal menghapus kategori', 'error') }
}

/* ── Keamanan ── */
const bioDidukung = ref(false)
const bioAktif = ref(false)

onMounted(async () => {
  bioDidukung.value = await biometrik.didukung()
  bioAktif.value = biometrik.terdaftar()
})

async function aktifkanBio() {
  if (await biometrik.daftar()) { bioAktif.value = true; toast('Face ID aktif', 'success') }
}
function matikanBio() {
  biometrik.lupakan()
  bioAktif.value = false
  toast('Face ID dimatikan di perangkat ini', 'success')
}

/* ── Cadangan ── */
const baris = computed(() => jumlahBaris())

function unduh(fn: () => void, pesan: string) {
  try { fn(); toast(pesan, 'success') } catch { toast('Gagal mengunduh', 'error') }
}

const appVersion = '2.0'
</script>

<template>
  <MobScreen judul="Pengaturan" back>
    <div class="stagger">
      <!-- Informasi kos -->
      <div class="sechead"><h2>Informasi kos</h2></div>
      <button class="card tap lrow" @click="bukaInfo">
        <span class="av sq ghost"><MobIcon name="info" :size="19" /></span>
        <span class="lrow-body">
          <span class="lrow-title">{{ settings.data.nama || 'Belum diisi' }}</span>
          <span class="lrow-sub">Nama, alamat, WA, rekening, jatuh tempo</span>
        </span>
        <span class="chev"><MobIcon name="chev" :size="18" /></span>
      </button>

      <!-- Properti -->
      <div class="sechead">
        <h2>Properti</h2><span class="count">{{ properties.items.length }}</span>
      </div>
      <div class="stack-v">
        <button
          v-for="p in properties.items"
          :key="p.id"
          class="card tap lrow"
          @click="propTarget = p"
        >
          <span class="av sq"><MobIcon name="door" :size="19" /></span>
          <span class="lrow-body">
            <span class="lrow-title">{{ p.nama }}</span>
            <span class="lrow-sub">{{ p.alamat || 'Alamat belum diisi' }}</span>
          </span>
          <span class="chev"><MobIcon name="chev" :size="18" /></span>
        </button>
      </div>

      <!-- Kategori kamar -->
      <div class="sechead"><h2>Kategori kamar</h2></div>
      <button class="card tap lrow" @click="sheetKategori = true">
        <span class="av sq ghost"><MobIcon name="sliders" :size="19" /></span>
        <span class="lrow-body">
          <span class="lrow-title">Kategori</span>
          <span class="lrow-sub">
            {{ properties.kategori.length }} kategori · menentukan urutan kamar
          </span>
        </span>
        <span class="chev"><MobIcon name="chev" :size="18" /></span>
      </button>

      <!-- Keamanan -->
      <div class="sechead"><h2>Buka aplikasi</h2></div>
      <div class="card">
        <template v-if="bioDidukung">
          <div class="drow" style="padding:0 0 10px">
            <dt style="flex:1">Face ID / sidik jari</dt>
            <dd><span class="chip" :class="bioAktif ? 'ok' : 'mute'">
              {{ bioAktif ? 'Aktif' : 'Nonaktif' }}</span></dd>
          </div>
          <p class="fnote">
            Mempercepat masuk supaya tidak perlu mengetik PIN. <b>Bukan lapisan
            keamanan tambahan</b> — tidak ada server yang memverifikasi, jadi
            tingkat pengamanannya sama dengan PIN. PIN tetap diperlukan di
            perangkat lain.
          </p>
          <button v-if="!bioAktif" class="btn brandsoft block" @click="aktifkanBio">Aktifkan</button>
          <button v-else class="btn block" @click="matikanBio">Matikan di perangkat ini</button>
        </template>
        <p v-else class="fnote" style="margin:0">
          Perangkat ini tidak mendukung Face ID / sidik jari untuk web, atau
          halaman tidak diakses lewat HTTPS. Masuk tetap memakai PIN.
        </p>
      </div>

      <!-- Cadangan -->
      <div class="sechead"><h2>Cadangan data</h2></div>
      <div class="card">
        <p class="fnote">
          {{ baris.tagihan }} tagihan · {{ baris.pengeluaran }} pengeluaran ·
          {{ baris.penghuni }} penghuni
        </p>
        <button class="btn brandsoft block" style="margin-bottom:8px"
          @click="unduh(eksporCadangan, 'Cadangan diunduh')">
          <MobIcon name="file" :size="17" /> Unduh cadangan lengkap
        </button>
        <button class="btn block" style="margin-bottom:8px"
          @click="unduh(eksporTagihanCsv, 'CSV tagihan diunduh')">Tagihan (CSV)</button>
        <button class="btn block"
          @click="unduh(eksporPengeluaranCsv, 'CSV pengeluaran diunduh')">Pengeluaran (CSV)</button>
      </div>

      <!-- Yang tinggal di desktop -->
      <div class="sechead"><h2>Hanya di desktop</h2></div>
      <div class="card">
        <div class="note info">
          <MobIcon name="warn" :size="18" />
          <span>
            <b>Ganti penomoran kamar</b> dan <b>saldo awal properti</b> diatur di
            tampilan desktop. Keduanya mengubah banyak hal sekaligus dan tidak
            bisa dibatalkan — penomoran menyentuh seluruh kamar dan tagihannya,
            saldo awal jadi titik nol semua perhitungan saldo. Keduanya perlu
            pratinjau dan penjelasan yang tidak muat di layar ini.
          </span>
        </div>
      </div>

      <div class="sechead"><h2>Informasi aplikasi</h2></div>
      <dl class="card flush divide">
        <div class="drow"><dt>Versi</dt><dd>{{ appVersion }}</dd></div>
        <div class="drow"><dt>Database</dt><dd>Firebase Firestore</dd></div>
      </dl>
    </div>

    <!-- Sheet: informasi kos -->
    <MobSheet v-if="sheetInfo" judul="Informasi kos" @tutup="sheetInfo = false">
      <div class="fstack" style="padding:6px 10px 4px">
        <label class="field">
          <span class="field-lbl">Nama kos</span>
          <input v-model="form.nama" class="field-in" maxlength="60" aria-label="Nama kos">
        </label>
        <label class="field">
          <span class="field-lbl">Alamat</span>
          <input v-model="form.alamat" class="field-in" maxlength="200" aria-label="Alamat">
        </label>
        <label class="field">
          <span class="field-lbl">No. HP / WA</span>
          <input v-model="form.wa" class="field-in" inputmode="tel" aria-label="Nomor WA">
        </label>
        <label class="field">
          <span class="field-lbl">Bank</span>
          <input v-model="form.bank" class="field-in" aria-label="Bank">
        </label>
        <label class="field">
          <span class="field-lbl">No. rekening</span>
          <input v-model="form.rek" class="field-in" inputmode="numeric" aria-label="Nomor rekening">
        </label>
        <label class="field">
          <span class="field-lbl">Atas nama</span>
          <input v-model="form.namarek" class="field-in" aria-label="Nama pemilik rekening">
        </label>
        <label class="field">
          <span class="field-lbl">Tanggal jatuh tempo</span>
          <input
            v-model.number="form.tgl_jatuh_tempo"
            class="field-in" type="number" min="1" max="28"
            :placeholder="String(DEFAULT_TGL_JATUH_TEMPO)"
            aria-label="Tanggal jatuh tempo"
          >
          <span class="field-foot"><span>Tanggal jatuh tempo tagihan tiap bulan</span></span>
        </label>
        <label class="field">
          <span class="field-lbl">Tambahan per penghuni</span>
          <input
            v-model.number="form.nominal_tambahan"
            class="field-in" type="number" min="0" step="50000"
            :placeholder="String(DEFAULT_NOMINAL_TAMBAHAN)"
            aria-label="Tambahan per penghuni"
          >
          <span class="field-foot"><span>Per orang di atas penghuni pertama; bisa ditimpa per kamar</span></span>
        </label>
        <label class="field">
          <span class="field-lbl">Template pesan WhatsApp</span>
          <textarea
            v-model="form.wa_template" class="field-in" rows="4"
            aria-label="Template pesan WhatsApp"
          ></textarea>
          <span class="field-foot">
            <span>Variabel: {nama} {kamar} {bulan} {jumlah} {sisa} {jatuh_tempo}</span>
          </span>
        </label>
        <div v-if="galat" class="note bad"><span>{{ galat }}</span></div>
      </div>
      <template #kaki>
        <button class="btn" @click="sheetInfo = false">Batal</button>
        <button class="btn primary" @click="simpanInfo">Simpan</button>
      </template>
    </MobSheet>

    <!-- Sheet: kategori -->
    <MobSheet v-if="sheetKategori" judul="Kategori kamar" @tutup="sheetKategori = false">
      <div class="fstack" style="padding:6px 10px 4px">
        <div v-if="properties.kategori.length" class="card flush divide">
          <div v-for="k in properties.kategori" :key="k.id" class="lrow">
            <span class="lrow-body"><span class="lrow-title">{{ k.nama }}</span></span>
            <button class="iconbtn" style="color:var(--bad)" :aria-label="`Hapus ${k.nama}`"
              @click="hapusKategori(k.id)">
              <MobIcon name="trash" :size="17" />
            </button>
          </div>
        </div>
        <p v-else class="fnote">Belum ada kategori. Urutan kamar memakai nomornya saja.</p>

        <label class="field">
          <span class="field-lbl">Kategori baru</span>
          <input
            v-model="kategoriBaru" class="field-in" maxlength="30"
            placeholder="Mis. Lantai 1" aria-label="Kategori baru"
            @keyup.enter="tambahKategori"
          >
        </label>
        <button class="btn brandsoft block" @click="tambahKategori">Tambah kategori</button>
      </div>
      <template #kaki>
        <button class="btn" @click="sheetKategori = false">Tutup</button>
      </template>
    </MobSheet>

    <MobPropertiSheet
      v-if="propTarget"
      :properti="propTarget"
      @tutup="propTarget = null"
      @simpan="simpanProperti"
    />
  </MobScreen>
</template>
