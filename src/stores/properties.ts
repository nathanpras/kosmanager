import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from '../firebase'
import type { Property, Kategori, TipeKamar } from '../types'

export const usePropertiesStore = defineStore('properties', () => {
  const items = ref<Property[]>([])
  const kategori = ref<Kategori[]>([])
  const tipeKamar = ref<TipeKamar[]>([])

  async function load() {
    const [pSnap, kSnap, tSnap] = await Promise.all([
      getDocs(collection(db, 'properties')),
      getDocs(collection(db, 'kategori')),
      getDocs(collection(db, 'tipe_kamar')),
    ])
    items.value = pSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as Property))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
    kategori.value = kSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as Kategori))
      .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
    tipeKamar.value = tSnap.docs.length > 0
      ? tSnap.docs.map(d => ({ id: d.id, ...d.data() } as TipeKamar)).sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
      : [{ id: 'std', nama: 'Standard', urutan: 1 }, { id: 'dlx', nama: 'Deluxe', urutan: 2 }, { id: 'vip', nama: 'VIP', urutan: 3 }]
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

  return { items, kategori, tipeKamar, load, addProperty, updateProperty, removeProperty, addKategori, removeKategori }
})
