import { computed } from 'vue'
import { useKamarStore } from '../stores/kamar'
import { usePenghuniStore } from '../stores/penghuni'
import { useTagihanStore } from '../stores/tagihan'
import { usePropertiesStore } from '../stores/properties'
import { useOccupancy, tglKeluar, sudahKeluar } from './useOccupancy'
import { useUrutKamar } from './useUrutKamar'
import { statusKamar, type StatusKamarTampil } from '../utils/statusKamar'
import { statusTagihan } from '../utils/statusTagihan'
import { kamarDiBulan } from '../utils/riwayatKamar'
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
  const { urutkan, urutkanKamar } = useUrutKamar()

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

  /* ── Penghuni ─────────────────────────────── */

  /** Penghuni yang masih menghuni hari ini, urut seperti daftar kamar. */
  function penghuniAktif(property_id?: string): Penghuni[] {
    const ps = penghuniStore.items.filter(p =>
      (!property_id || p.property_id === property_id) && !sudahKeluar(p, hari.value))
    return urutkan(ps)
  }

  /**
   * Tagihan milik seseorang pada sebuah bulan.
   *
   * `penghuni_id` dipakai bila ada — satu kamar bisa dihuni dua orang, dan
   * tanpa itu tagihan roommate ikut terbawa. Data lama belum punya field itu,
   * jadi jatuh kembali ke pasangan kamar+properti.
   */
  function tagihanPenghuni(p: Penghuni, bln = bulan.value): Tagihan[] {
    const sebulan = tagihanStore.items.filter(t =>
      t.property_id === p.property_id && t.bulan === bln)
    const milik = sebulan.filter(t => t.penghuni_id === p.id)
    if (milik.length) return milik
    return sebulan.filter(t => !t.penghuni_id && t.kamar === kamarDiBulan(p, bln))
  }

  /** Status yang tampil di chip penghuni — aturan yang sama dengan kartu kamar. */
  function statusPenghuni(p: Penghuni): StatusKamarTampil {
    const berlaku = tagihanPenghuni(p).filter(t => !t.hangus)
    if (!berlaku.length) return 'belum'
    const hasil = berlaku.map(t => statusTagihan(t, hari.value))
    if (hasil.some(h => h.status === 'telat' || h.telat)) return 'telat'
    if (hasil.every(h => h.status === 'lunas')) return 'lunas'
    return 'belum'
  }

  /* ── Kalender ─────────────────────────────── */

  /**
   * Agenda satu tanggal: siapa masuk, dan tagihan mana yang jatuh tempo.
   *
   * Dipakai juga untuk menurunkan penanda titik di kalender, supaya keduanya
   * tidak pernah bercerita berbeda — pelajaran dari mockup, di mana tanggal
   * bertitik "jatuh tempo" sempat punya agenda kosong.
   */
  function agendaTanggal(iso: string): Acara[] {
    const out: Acara[] = []

    for (const p of penghuniStore.items) {
      if (p.masuk !== iso) continue
      out.push({
        jenis: 'checkin', iso, nama: p.nama, kamar: kamarDiBulan(p, bulan.value) || p.kamar,
        property_id: p.property_id, nilai: 'Check-in',
      })
    }

    for (const t of tagihanStore.items) {
      if (t.jatuh_tempo !== iso || t.hangus) continue
      const h = statusTagihan(t, hari.value)
      /* Yang sudah lunas tidak lagi jatuh tempo — menandainya hanya menakuti. */
      if (h.status === 'lunas') continue
      out.push({
        jenis: h.telat ? 'telat' : 'tempo', iso, nama: t.penghuni, kamar: t.kamar,
        property_id: t.property_id, nilai: String(h.sisa),
      })
    }

    return out
  }

  /**
   * Penanda titik per tanggal untuk satu bulan tampilan.
   * Kuncinya tanggal (1-31), isinya jenis yang muncul pada tanggal itu.
   */
  function penandaBulan(tahun: number, bulanIdx: number): Map<number, Set<Acara['jenis']>> {
    const peta = new Map<number, Set<Acara['jenis']>>()
    const jml = new Date(tahun, bulanIdx + 1, 0).getDate()
    for (let d = 1; d <= jml; d++) {
      const iso = `${tahun}-${String(bulanIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const acara = agendaTanggal(iso)
      if (!acara.length) continue
      peta.set(d, new Set(acara.map(a => a.jenis)))
    }
    return peta
  }

  return {
    bulan, hari, daftarProperti,
    kamarDi, kamarSatu, tagihanKamar, statusKini, penghuniKamar, namaPenghuni, hitungan,
    penghuniAktif, tagihanPenghuni, statusPenghuni,
    agendaTanggal, penandaBulan,
  }
}

export interface Acara {
  jenis: 'checkin' | 'tempo' | 'telat'
  iso: string
  nama: string
  kamar: string
  property_id: string
  /** Untuk check-in berisi label, untuk tagihan berisi sisa dalam rupiah. */
  nilai: string
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
