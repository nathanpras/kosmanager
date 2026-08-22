<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useTagihanStore } from '../../stores/tagihan'
import { usePenghuniStore } from '../../stores/penghuni'
import { usePropertiesStore } from '../../stores/properties'
import { rakitInvoice, nomorInvoiceBerikutnya } from '../../utils/invoice'
import { fmt, fmtTgl } from '../../utils/format'
import { today } from '../../utils/date'

const props = defineProps<{ open: boolean; tagihanIds: string[] }>()
const emit = defineEmits<{ close: [] }>()

const tagihan = useTagihanStore()
const penghuni = usePenghuniStore()
const properties = usePropertiesStore()
const nomor = ref('')

const daftar = computed(() => props.tagihanIds
  .map(id => tagihan.items.find(t => t.id === id))
  .filter((t): t is NonNullable<typeof t> => !!t))

const data = computed(() => {
  const list = daftar.value
  const p = penghuni.items.find(x =>
    x.id === list[0]?.penghuni_id || (x.nama === list[0]?.penghuni && x.property_id === list[0]?.property_id)) ?? null
  const properti = properties.items.find(x => x.id === list[0]?.property_id) ?? null
  return rakitInvoice({
    tagihan: list, penghuni: p, properti,
    no: nomor.value, tgl: list[0]?.invoice_tgl ?? today(),
  })
})

// Nomor invoice disimpan permanen saat pertama kali dibuka, supaya cetak ulang
// menghasilkan nomor yang sama — invoice bernomor ganda bukan invoice.
//
// Dipasang di [open, tagihanIds] sekaligus (bukan cuma `open`) supaya ganti
// batch sementara dialognya sudah terbuka tetap memicu penomoran — kalau
// cuma `open` yang diawasi, batch baru yang datang saat dialog masih
// terbuka tidak pernah kebagian nomor.
//
// `assigning` mencegah dua proses tulis berjalan bersamaan: tiap `update()`
// menulis ke Firestore lalu memuat ulang seluruh koleksi, jadi jendela
// baloncatan-nya cukup lebar untuk ke-tutup-buka-lagi menabrak proses yang
// masih berjalan dan menghasilkan nomor kedua untuk tagihan yang sama.
const assigning = ref(false)
watch(
  [() => props.open, () => props.tagihanIds],
  async ([open]) => {
    if (!open || daftar.value.length === 0 || assigning.value) return
    assigning.value = true
    try {
      const sudah = daftar.value.find(t => t.invoice_no)?.invoice_no
      const tglAsal = daftar.value.find(t => t.invoice_tgl)?.invoice_tgl ?? today()
      const nomorPakai = sudah ?? nomorInvoiceBerikutnya(tagihan.items.map(t => t.invoice_no), tglAsal)
      nomor.value = nomorPakai
      // Tulis ke tagihan yang belum kebagian nomor saja — ini juga menyembuhkan
      // batch yang penulisannya sempat terputus di tengah jalan (sebagian sudah
      // bernomor, sebagian belum), bukan cuma jalur "pertama kali dibuka".
      for (const t of daftar.value) {
        if (t.invoice_no) continue
        await tagihan.update(t.id, { invoice_no: nomorPakai, invoice_tgl: tglAsal })
      }
    } finally {
      assigning.value = false
    }
  },
)

function cetak() {
  document.body.classList.add('printing-invoice')

  // @page tidak bisa dicakup ke class body — ia mengatur kotak halaman, bukan
  // elemen — jadi kalau ditaruh statis di <style> komponen ini ia ikut ter-bundle
  // ke CSS global dan diam-diam memaksa A4/15mm ke exportPDF() di LaporanView
  // juga. Disuntik lewat elemen <style> sesaat sebelum print, dicabut lagi
  // sesudahnya, supaya cuma berlaku selagi invoice ini yang dicetak.
  const pageStyle = document.createElement('style')
  pageStyle.textContent = '@page { size: A4; margin: 15mm }'
  document.head.appendChild(pageStyle)

  // Beres-beres lewat 'afterprint' (bukan cuma timeout) supaya tetap jalan
  // walau dialog print-nya dibatalkan atau baru ditutup lama kemudian; timeout
  // di bawah cuma jaring pengaman untuk browser yang tidak memicu event ini.
  let selesai = false
  function beresBeres() {
    if (selesai) return
    selesai = true
    document.body.classList.remove('printing-invoice')
    pageStyle.remove()
    window.removeEventListener('afterprint', beresBeres)
    clearTimeout(fallback)
  }
  window.addEventListener('afterprint', beresBeres)
  const fallback = setTimeout(beresBeres, 2000)

  window.print()
}
</script>

<template>
  <div class="overlay" :class="{ open: props.open }" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-handle"></div>
      <div class="modal-head"><h2>Invoice</h2><button class="close-btn" @click="emit('close')">✕</button></div>
      <div class="modal-body">
        <div class="invoice-page invoice-print">
          <div class="inv-kop">
            <div class="inv-kop-nama">{{ data.namaKos }}</div>
            <div class="inv-kop-alamat">{{ data.alamat }}</div>
            <div v-if="data.hp" class="inv-kop-hp">{{ data.hp }}</div>
          </div>

          <hr class="inv-rule">

          <div class="inv-meta">
            <div class="inv-meta-item">
              <span class="inv-meta-label">No. Invoice</span>
              <span class="inv-meta-val">{{ data.no }}</span>
            </div>
            <div class="inv-meta-item">
              <span class="inv-meta-label">Tanggal</span>
              <span class="inv-meta-val">{{ fmtTgl(data.tgl) }}</span>
            </div>
          </div>

          <div class="inv-kepada">
            <div class="inv-kepada-label">Kepada</div>
            <div class="inv-kepada-nama">{{ data.nama }}</div>
            <div class="inv-kepada-sub">
              Kamar {{ data.kamar }}<span v-if="data.hpPenghuni"> · {{ data.hpPenghuni }}</span>
            </div>
          </div>

          <table class="inv-table">
            <thead>
              <tr>
                <th>Keterangan</th>
                <th>Periode</th>
                <th class="num">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(b, i) in data.baris" :key="i">
                <td>{{ b.keterangan }}</td>
                <td>{{ b.periode }}</td>
                <td class="num">{{ fmt(b.jumlah) }}</td>
              </tr>
            </tbody>
          </table>

          <div class="inv-ringkasan">
            <div v-if="data.diskon > 0" class="inv-ring-row">
              <span>Subtotal</span><span>{{ fmt(data.subtotal) }}</span>
            </div>
            <div v-if="data.diskon > 0" class="inv-ring-row">
              <span>Diskon</span><span>-{{ fmt(data.diskon) }}</span>
            </div>
            <div class="inv-ring-row inv-total">
              <span>Total</span><span>{{ fmt(data.total) }}</span>
            </div>
          </div>

          <div class="inv-cap" :class="data.lunas ? 'cap-lunas' : 'cap-belum'">
            <span>{{ data.lunas ? 'LUNAS' : 'BELUM BAYAR' }}</span>
            <span v-if="data.lunas && data.tglBayar" class="inv-cap-tgl">{{ fmtTgl(data.tglBayar) }}</span>
          </div>

          <div class="inv-rekening">
            <div class="inv-rekening-label">Pembayaran transfer ke</div>
            <div class="inv-rekening-bank">{{ data.bank }} — {{ data.rekening }}</div>
            <div class="inv-rekening-an">a.n. {{ data.an }}</div>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" @click="emit('close')">Tutup</button>
        <button class="btn btn-primary" @click="cetak">🖨 Cetak</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.invoice-page {
  font-family: 'Georgia', 'Times New Roman', serif;
  color: var(--text);
  background: var(--surf);
}
.inv-kop { text-align: center; }
.inv-kop-nama { font-size: 19px; font-weight: 700; letter-spacing: .3px; }
.inv-kop-alamat { font-size: 12px; color: var(--text3); margin-top: 4px; }
.inv-kop-hp { font-size: 12px; color: var(--text3); margin-top: 2px; }

.inv-rule { border: none; border-top: 2px solid var(--text); margin: 14px 0; }

.inv-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
.inv-meta-item { display: flex; flex-direction: column; }
.inv-meta-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: .5px; }
.inv-meta-val { font-size: 13px; font-weight: 600; margin-top: 2px; }

.inv-kepada {
  border: 1px solid var(--border);
  border-radius: var(--rs);
  padding: 10px 12px;
  margin-bottom: 16px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
.inv-kepada-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: .5px; }
.inv-kepada-nama { font-size: 15px; font-weight: 700; margin-top: 3px; }
.inv-kepada-sub { font-size: 12px; color: var(--text2); margin-top: 2px; }

.inv-table {
  width: 100%;
  border-collapse: collapse;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
  margin-bottom: 4px;
}
.inv-table th {
  text-align: left;
  font-size: 11px;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: .4px;
  padding: 6px 4px;
  border-bottom: 2px solid var(--border);
}
.inv-table td {
  padding: 8px 4px;
  border-bottom: 1px solid var(--border);
}
.inv-table th.num, .inv-table td.num { text-align: right; }

.inv-ringkasan {
  margin: 12px 0 16px;
  padding-top: 8px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.inv-ring-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text2);
}
.inv-ring-row.inv-total {
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
  border-top: 2px solid var(--text);
  padding-top: 8px;
  margin-top: 2px;
}

.inv-cap {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 800;
  font-size: 15px;
  letter-spacing: 1px;
  padding: 6px 14px;
  border: 2px solid;
  border-radius: var(--rs);
  transform: rotate(-2deg);
  margin-bottom: 18px;
}
.inv-cap.cap-lunas { color: var(--green); border-color: var(--green); }
.inv-cap.cap-belum { color: var(--red); border-color: var(--red); }
.inv-cap-tgl { font-size: 11px; font-weight: 600; letter-spacing: 0; }

.inv-rekening {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 12px;
  color: var(--text2);
  border-top: 1px dashed var(--border);
  padding-top: 12px;
}
.inv-rekening-label { color: var(--text3); text-transform: uppercase; font-size: 10px; letter-spacing: .5px; margin-bottom: 3px; }
.inv-rekening-bank { font-weight: 700; color: var(--text); }

@media print {
  /* Penataan ulang chrome modal saja — elemen mana yang benar-benar tampil di
     kertas ditentukan oleh aturan visibility non-scoped di bawah, bukan oleh
     blok ini. .overlay/.modal dilonggarkan supaya .invoice-print (position:
     absolute) tidak ikut terpotong overflow/posisi fixed punya modal. */
  :global(body.printing-invoice) .overlay { position: static; background: none; }
  :global(body.printing-invoice) .modal { box-shadow: none; max-height: none; width: 100%; overflow: visible; }
  .invoice-page { width: 100%; padding: 0; color: #000; background: #fff; }
}
</style>

<style>
/* Non-scoped dengan sengaja: mekanisme "apa yang tampil di kertas" ini pakai
   visibility, bukan display:none pada leluhur tertentu — visibility mewarisi
   ke bawah lalu bisa dinyalakan lagi per elemen, jadi tetap bekerja walau
   .invoice-print bersarang berapa pun level di bawah #app (mis. #app > .shell
   > ... > .overlay > .modal > ... > .invoice-print). Semuanya dikunci di
   balik body.printing-invoice, yang hanya ada selama cetak() berjalan, supaya
   tidak menyentuh cetak Laporan (LaporanView.exportPDF() juga window.print()
   tapi tidak pernah memasang class ini). */
@media print {
  body.printing-invoice * { visibility: hidden !important; }
  body.printing-invoice .invoice-print,
  body.printing-invoice .invoice-print * { visibility: visible !important; }
  body.printing-invoice .invoice-print {
    position: absolute; left: 0; top: 0; width: 100%;
  }
}
</style>
