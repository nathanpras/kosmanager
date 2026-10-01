import { computed } from 'vue'
import { useKamarStore } from '../stores/kamar'
import { usePenghuniStore } from '../stores/penghuni'
import { useTagihanStore } from '../stores/tagihan'
import { usePropertiesStore } from '../stores/properties'
import { useOccupancy, tglKeluar } from './useOccupancy'
import { useUrutKamar } from './useUrutKamar'
import { statusKamar, type StatusKamarTampil } from '../utils/statusKamar'
import { bulanIni, today } from '../utils/date'
import type { Kamar, Penghuni, Property, Tagihan } from '../types'

/**
 * Model-view bersama untuk shell mobile.
 *
 * Ketiga layar baca — beranda, detail properti, detail kamar — menanyakan hal
 * yang sama tentang data yang sama. Tanpa tempat bersama, masing-masing akan
 * menurunkan ulang "kamar ini statusnya apa" dengan sedikit perbedaan, dan
 * perbedaan itulah yang nanti terlihat sebagai angka yang tidak cocok antar
 * layar.
 */

export interface HitunganProperti {
  total: number
  terisi: number
  kosong: number
  telat: number
  belum: number
  booked: number
  checkin: number
  checkout: number
}

export function useMobile() {
  const kamarStore = useKamarStore()
  const penghuniStore = usePenghuniStore()
  const tagihanStore = useTagihanStore()
  const properties = usePropertiesStore()
  const { penghuniDiKamar } = useOccupancy()
  const { urutkanKamar } = useUrutKamar()

  const bulan = computed(() => bulanIni())
  const hari = computed(() => today())

  const daftarProperti = computed<Property[]>(() => properties.items)

  /** Kamar satu properti, dalam urutan yang sama dengan seluruh aplikasi. */
  function kamarDi(property_id: string): Kamar[] {
    return urutkanKamar(kamarStore.items.filter(k => k.property_id === property_id))
  }

  function kamarSatu(property_id: string, nomor: string): Kamar | undefined {
    return kamarStore.items.find(k => k.property_id === property_id && k.nomor === nomor)
  }

  /** Tagihan satu kamar untuk bulan berjalan. */
  function tagihanKamar(k: Kamar, bln = bulan.value): Tagihan[] {
    return tagihanStore.items.filter(t =>
      t.kamar === k.nomor && t.property_id === k.property_id && t.bulan === bln)
  }

  function statusKini(k: Kamar): StatusKamarTampil {
    return statusKamar(k, tagihanKamar(k), hari.value)
  }

  function penghuniKamar(k: Kamar): Penghuni[] {
    return penghuniDiKamar(k.nomor, k.property_id, hari.value)
  }

  /**
   * Nama yang tampil di kartu kamar. Satu kamar boleh dihuni lebih dari satu
   * orang, jadi yang kedua dan seterusnya diringkas — bukan dipotong diam-diam.
   */
  function namaPenghuni(k: Kamar): string {
    const p = penghuniKamar(k)
    if (!p.length) return ''
    if (p.length === 1) return p[0].nama
    return `${p[0].nama} +${p.length - 1}`
  }

  function hitungan(property_id?: string): HitunganProperti {
    const ks = property_id
      ? kamarStore.items.filter(k => k.property_id === property_id)
      : kamarStore.items
    const h: HitunganProperti = {
      total: ks.length, terisi: 0, kosong: 0, telat: 0, belum: 0,
      booked: 0, checkin: 0, checkout: 0,
    }
    for (const k of ks) {
      const s = statusKini(k)
      if (s === 'kosong') h.kosong++
      else if (s === 'booked') h.booked++
      else {
        h.terisi++
        if (s === 'telat') h.telat++
        else if (s === 'belum') h.belum++
      }
    }
    /* Check-in dan check-out dihitung dari penghuni, bukan kamar: dua orang
       bisa masuk ke kamar yang sama di hari yang sama. */
    const ps = property_id
      ? penghuniStore.items.filter(p => p.property_id === property_id)
      : penghuniStore.items
    for (const p of ps) {
      if (p.masuk === hari.value) h.checkin++
      if (tglKeluar(p) === hari.value) h.checkout++
    }
    return h
  }

  return {
    bulan, hari, daftarProperti,
    kamarDi, kamarSatu, tagihanKamar, statusKini, penghuniKamar, namaPenghuni, hitungan,
  }
}

/** Inisial untuk avatar — maksimal dua huruf, seperti di mockup. */
export function inisial(nama: string): string {
  return nama.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

export const LABEL_STATUS: Record<StatusKamarTampil, { label: string; cls: string }> = {
  lunas:  { label: 'Lunas',  cls: 'ok' },
  belum:  { label: 'Belum',  cls: 'warn' },
  telat:  { label: 'Telat',  cls: 'bad' },
  booked: { label: 'Booked', cls: 'brand' },
  kosong: { label: 'Kosong', cls: 'mute' },
}
