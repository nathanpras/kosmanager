import { ref } from 'vue'
import { db, doc, getDoc, setDoc } from '../firebase'
import { useKamarStore } from '../stores/kamar'
import { usePropertiesStore } from '../stores/properties'
import { useSettingsStore } from '../stores/settings'
import { DEFAULT_NOMINAL_TAMBAHAN } from '../utils/billing'
import { susunListing, listingBerubah } from '../utils/publik'
import type { ListingPublik } from '../utils/publik'

/**
 * Menerbitkan ringkasan kamar kosong ke koleksi `publik`, satu dokumen per
 * properti, agar halaman untuk calon penghuni bisa membacanya tanpa login.
 *
 * Koleksi `publik` adalah SATU-SATUNYA yang boleh dibaca tanpa autentikasi
 * (lihat firestore.rules). Isinya dibangun lewat daftar putih di utils/publik.ts,
 * jadi tidak ada data pribadi yang bisa terbawa walau tipe datanya bertambah.
 */
export function useSinkronPublik() {
  const kamar = useKamarStore()
  const properties = usePropertiesStore()
  const settings = useSettingsStore()

  const sedangSinkron = ref(false)
  const terakhir = ref<string | null>(null)

  async function sinkronSatu(property_id: string): Promise<boolean> {
    const p = properties.items.find(x => x.id === property_id)
    if (!p) return false

    const baru = susunListing(p, kamar.items, {
      tambahanPenghuni: settings.data.nominal_tambahan ?? DEFAULT_NOMINAL_TAMBAHAN,
    })
    const ref_ = doc(db, 'publik', property_id)

    // Hanya menulis bila isinya benar-benar berubah — aplikasi ini dibuka
    // berkali-kali sehari dan kuota tulis Firestore tidak gratis tanpa batas.
    const snap = await getDoc(ref_)
    const lama = snap.exists() ? (snap.data() as ListingPublik) : null
    if (!listingBerubah(lama, baru)) return false

    await setDoc(ref_, baru)
    return true
  }

  /** Menyinkronkan semua properti. Mengembalikan berapa yang benar-benar berubah. */
  async function sinkronSemua(): Promise<number> {
    sedangSinkron.value = true
    try {
      let n = 0
      for (const p of properties.items) {
        if (await sinkronSatu(p.id)) n++
      }
      terakhir.value = new Date().toISOString()
      return n
    } finally {
      sedangSinkron.value = false
    }
  }

  return { sinkronSatu, sinkronSemua, sedangSinkron, terakhir }
}
