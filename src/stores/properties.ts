import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from '../firebase'
import type { Property, Kategori, TipeKamar } from '../types'

const DEFAULT_TIPE: TipeKamar[] = [
  { id: 'std', nama: 'Standard', urutan: 1 },
  { id: 'dlx', nama: 'Deluxe', urutan: 2 },
  { id: 'vip', nama: 'VIP', urutan: 3 },
]

export const usePropertiesStore = defineStore('properties', () => {
  const items = ref<Property[]>([])
  const kategori = ref<Kategori[]>([])
  const tipeKamar = ref<TipeKamar[]>([])

  function applyProps(docs: { id: string; data: () => Record<string, unknown> }[]) {
    items.value = docs
      .map(d => ({ id: d.id, ...d.data() } as Property))
      .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
  }
  function applyKategori(docs: { id: string; data: () => Record<string, unknown> }[]) {
    kategori.value = docs
      .map(d => ({ id: d.id, ...d.data() } as Kategori))
      .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
  }
  function applyTipe(docs: { id: string; data: () => Record<string, unknown> }[]) {
    tipeKamar.value = docs.length > 0
      ? docs.map(d => ({ id: d.id, ...d.data() } as TipeKamar)).sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
      : [...DEFAULT_TIPE]
  }

  async function load() {
    const [pSnap, kSnap, tSnap] = await Promise.all([
      getDocs(collection(db, 'properties')),
      getDocs(collection(db, 'kategori')),
      getDocs(collection(db, 'tipe_kamar')),
    ])
    applyProps(pSnap.docs)
    applyKategori(kSnap.docs)
    applyTipe(tSnap.docs)
  }

  let unsub: (() => void)[] | null = null
  function subscribe(): Promise<void> {
    return new Promise((resolve) => {
      if (unsub) { resolve(); return }
      const seen = new Set<string>()
      const mark = (k: string) => { seen.add(k); if (seen.size >= 3) resolve() }
      unsub = [
        onSnapshot(collection(db, 'properties'),  (s) => { applyProps(s.docs); mark('p') }, () => mark('p')),
        onSnapshot(collection(db, 'kategori'),    (s) => { applyKategori(s.docs); mark('k') }, () => mark('k')),
        onSnapshot(collection(db, 'tipe_kamar'),  (s) => { applyTipe(s.docs); mark('t') }, () => mark('t')),
      ]
    })
  }

  async function addProperty(data: Omit<Property, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'properties'), data)
    await load()
    return ref.id
  }

  async function updateProperty(id: string, data: Partial<Property>) {
    await updateDoc(doc(db, 'properties', id), data as Record<string, unknown>)
    await load()
  }

  async function removeProperty(id: string) {
    await deleteDoc(doc(db, 'properties', id))
    await load()
  }

  async function addKategori(nama: string) {
    const urutan = kategori.value.length + 1
    await addDoc(collection(db, 'kategori'), { nama, urutan })
    await load()
  }

  async function removeKategori(id: string) {
    await deleteDoc(doc(db, 'kategori', id))
    await load()
  }

  return { items, kategori, tipeKamar, load, subscribe, addProperty, updateProperty, removeProperty, addKategori, removeKategori }
})
