import { ref } from 'vue'
import { db, doc, writeBatch } from '../firebase'
import { useKamarStore } from '../stores/kamar'
import { usePenghuniStore } from '../stores/penghuni'
import { useTagihanStore } from '../stores/tagihan'
import { useMaintenanceStore } from '../stores/maintenance'
import { susunRencana } from '../utils/nomorKamar'
import { simpanBerkas } from '../utils/berkas'
import { today } from '../utils/date'
import type { RencanaMigrasi } from '../utils/nomorKamar'

// Firestore membatasi 500 operasi per batch.
const UKURAN_BATCH = 450

export function useMigrasiKamar() {
  const kamar = useKamarStore()
  const penghuni = usePenghuniStore()
  const tagihan = useTagihanStore()
  const maintenance = useMaintenanceStore()

  const rencana = ref<RencanaMigrasi | null>(null)
  const sedangJalan = ref(false)
  const progres = ref(0)

  function pratinjau(property_id: string): RencanaMigrasi {
    const r = susunRencana(property_id, {
      kamar: kamar.items,
      penghuni: penghuni.items,
      tagihan: tagihan.items,
      maintenance: maintenance.items,
    })
    rencana.value = r
    return r
  }

  /**
   * Cadangan seluruh data yang tersentuh, diunduh sebagai JSON sebelum menulis.
   * Nomor kamar tersimpan sebagai string di empat koleksi, jadi migrasi yang
   * salah tidak bisa dibatalkan tanpa salinan ini.
   */
  function unduhBackup(property_id: string) {
    const isi = {
      dibuat: new Date().toISOString(),
      property_id,
      kamar: kamar.items.filter(x => x.property_id === property_id),
      penghuni: penghuni.items.filter(x => x.property_id === property_id),
      tagihan: tagihan.items.filter(x => x.property_id === property_id),
      maintenance: maintenance.items.filter(x => x.property_id === property_id),
    }
    // Lewat simpanBerkas: `<a download>` langsung tidak berfungsi andal di iOS,
    // dan itu yang membuat tombol jalankan migrasi terkunci di HP.
    return simpanBerkas(
      `kosmanager-backup-${property_id}-${today()}.json`,
      JSON.stringify(isi, null, 2),
    )
  }

  /**
   * Menerapkan rencana. Ditulis per batch: setiap batch atomik, dan rencananya
   * idempoten sehingga menjalankan ulang setelah kegagalan di tengah akan
   * membereskan sisanya, bukan menggandakan perubahan.
   */
  async function terapkan(r: RencanaMigrasi): Promise<number> {
    if (!r.ubah.length) return 0
    sedangJalan.value = true
    progres.value = 0
    try {
      for (let i = 0; i < r.ubah.length; i += UKURAN_BATCH) {
        const potongan = r.ubah.slice(i, i + UKURAN_BATCH)
        const batch = writeBatch(db)
        for (const u of potongan) {
          const field = u.koleksi === 'kamar' ? 'nomor' : 'kamar'
          batch.update(doc(db, u.koleksi, u.id), { [field]: u.ke })
        }
        await batch.commit()
        progres.value = Math.min(r.ubah.length, i + potongan.length)
      }
      // Tidak perlu memuat ulang: store dipasangi listener onSnapshot lewat
      // subscribe(), jadi hasil batch langsung terpantul kembali dengan sendirinya.
      return r.ubah.length
    } finally {
      sedangJalan.value = false
    }
  }

  return { rencana, sedangJalan, progres, pratinjau, unduhBackup, terapkan }
}
