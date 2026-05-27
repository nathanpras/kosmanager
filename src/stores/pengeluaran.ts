import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from '../firebase'
import type { Pengeluaran } from '../types'

export const usePengeluaranStore = defineStore('pengeluaran', () => {
  const items = ref<Pengeluaran[]>([])

  async function load() {
    const snap = await getDocs(collection(db, 'pengeluaran'))
    items.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Pengeluaran))
      .sort((a, b) => (b.tgl ?? '').localeCompare(a.tgl ?? ''))
  }

  async function add(data: Omit<Pengeluaran, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'pengeluaran'), data)
    await load()
    return ref.id
  }

  async function update(id: string, data: Partial<Pengeluaran>) {
    await updateDoc(doc(db, 'pengeluaran', id), data as Record<string, unknown>)
    await load()
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, 'pengeluaran', id))
    await load()
  }

  return { items, load, add, update, remove }
})
