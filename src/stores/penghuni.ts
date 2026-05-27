import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from '../firebase'
import type { Penghuni } from '../types'

export const usePenghuniStore = defineStore('penghuni', () => {
  const items = ref<Penghuni[]>([])

  async function load() {
    const snap = await getDocs(collection(db, 'penghuni'))
    items.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Penghuni))
  }

  async function add(data: Omit<Penghuni, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'penghuni'), data)
    await load()
    return ref.id
  }

  async function update(id: string, data: Partial<Penghuni>) {
    await updateDoc(doc(db, 'penghuni', id), data as Record<string, unknown>)
    await load()
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, 'penghuni', id))
    await load()
  }

  return { items, load, add, update, remove }
})
