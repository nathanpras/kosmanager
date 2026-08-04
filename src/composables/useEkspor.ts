import { useKamarStore } from '../stores/kamar'
import { usePenghuniStore } from '../stores/penghuni'
import { useTagihanStore } from '../stores/tagihan'
import { usePengeluaranStore } from '../stores/pengeluaran'
import { useMaintenanceStore } from '../stores/maintenance'
import { usePropertiesStore } from '../stores/properties'
import { useSettingsStore } from '../stores/settings'
import { useLogStore } from '../stores/log'
import { simpanBerkas, keCsv } from '../utils/berkas'
import { nilaiDibayar } from '../utils/saldo'
import { today } from '../utils/date'

const VERSI_EKSPOR = 1

export function useEkspor() {
  const kamar = useKamarStore()
  const penghuni = usePenghuniStore()
  const tagihan = useTagihanStore()
  const pengeluaran = usePengeluaranStore()
  const maintenance = useMaintenanceStore()
  const properties = usePropertiesStore()
  const settings = useSettingsStore()
  const log = useLogStore()

  /**
   * Cadangan lengkap: SETIAP koleksi, semua properti.
   *
   * Sengaja tanpa penyaringan apa pun. Cadangan yang menghilangkan sebagian data
   * lebih berbahaya daripada tidak ada cadangan, karena memberi rasa aman palsu —
   * kesalahan yang saya buat sendiri pada backup migrasi, yang diam-diam hanya
   * mencakup empat koleksi.
   */
  function isiCadangan() {
    return {
      _versi: VERSI_EKSPOR,
      _dibuat: new Date().toISOString(),
      _catatan: 'Cadangan lengkap KosManager. Simpan di tempat aman.',
      properties: properties.items,
      kategori: properties.kategori,
      tipeKamar: properties.tipeKamar,
      kamar: kamar.items,
      penghuni: penghuni.items,
      tagihan: tagihan.items,
      pengeluaran: pengeluaran.items,
      maintenance: maintenance.items,
      settings: settings.data,
      log: log.items,
    }
  }

  function jumlahBaris() {
    const c = isiCadangan()
    return {
      properti: c.properties.length,
      kamar: c.kamar.length,
      penghuni: c.penghuni.length,
      tagihan: c.tagihan.length,
      pengeluaran: c.pengeluaran.length,
      maintenance: c.maintenance.length,
      log: c.log.length,
    }
  }

  function eksporCadangan() {
    return simpanBerkas(
      `kosmanager-cadangan-${today()}.json`,
      JSON.stringify(isiCadangan(), null, 2),
    )
  }

  function namaProperti(id: string) {
    return properties.items.find(p => p.id === id)?.nama ?? id
  }

  /** Tagihan sebagai CSV — untuk pembukuan di Excel atau diserahkan ke akuntan. */
  function eksporTagihanCsv() {
    const baris = tagihan.items.map(t => ({
      properti: namaProperti(t.property_id),
      kamar: t.kamar,
      penghuni: t.penghuni,
      bulan: t.bulan,
      jumlah: t.jumlah,
      dibayar: nilaiDibayar(t),
      sisa: Math.max(0, (Number(t.jumlah) || 0) - nilaiDibayar(t)),
      status: t.status,
      jatuh_tempo: t.jatuh_tempo ?? '',
      tgl_bayar: t.tgl ?? '',
      prorata: t.is_prorated ? `ya (${t.prorated_hari} hari)` : '',
    }))
    return simpanBerkas(
      `kosmanager-tagihan-${today()}.csv`,
      keCsv(baris, [
        { kunci: 'properti', judul: 'Properti' },
        { kunci: 'kamar', judul: 'Kamar' },
        { kunci: 'penghuni', judul: 'Penghuni' },
        { kunci: 'bulan', judul: 'Bulan' },
        { kunci: 'jumlah', judul: 'Tagihan' },
        { kunci: 'dibayar', judul: 'Dibayar' },
        { kunci: 'sisa', judul: 'Sisa' },
        { kunci: 'status', judul: 'Status' },
        { kunci: 'jatuh_tempo', judul: 'Jatuh Tempo' },
        { kunci: 'tgl_bayar', judul: 'Tanggal Bayar' },
        { kunci: 'prorata', judul: 'Prorata' },
      ]),
      'text/csv',
    )
  }

  function eksporPengeluaranCsv() {
    const baris = pengeluaran.items.map(p => ({
      properti: namaProperti(p.property_id),
      tgl: p.tgl,
      kategori: p.kategori,
      deskripsi: p.deskripsi,
      jumlah: p.jumlah,
      keterangan: p.keterangan ?? '',
    }))
    return simpanBerkas(
      `kosmanager-pengeluaran-${today()}.csv`,
      keCsv(baris, [
        { kunci: 'properti', judul: 'Properti' },
        { kunci: 'tgl', judul: 'Tanggal' },
        { kunci: 'kategori', judul: 'Kategori' },
        { kunci: 'deskripsi', judul: 'Deskripsi' },
        { kunci: 'jumlah', judul: 'Jumlah' },
        { kunci: 'keterangan', judul: 'Keterangan' },
      ]),
      'text/csv',
    )
  }

  return { jumlahBaris, eksporCadangan, eksporTagihanCsv, eksporPengeluaranCsv }
}
