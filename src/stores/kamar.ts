import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from '../firebase'
import type { Kamar } from '../types'

export const useKamarStore = defineStore('kamar', () => {
  const items = ref<Kamar[]>([])

  async function load() {
    const snap = await getDocs(collection(db, 'kamar'))
    items.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Kamar))
  }

  async function add(data: Omit<Kamar, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'kamar'), data)
    await load()
    return ref.id
  }

  async function update(id: string, data: Partial<Kamar>) {
    await updateDoc(doc(db, 'kamar', id), data as Record<string, unknown>)
    await load()
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, 'kamar', id))
    await load()
  }

  return { items, load, add, update, remove }
})
