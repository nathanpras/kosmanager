import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from '../firebase'
import type { Maintenance } from '../types'

export const useMaintenanceStore = defineStore('maintenance', () => {
  const items = ref<Maintenance[]>([])

  async function load() {
    const snap = await getDocs(collection(db, 'maintenance'))
    items.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Maintenance))
      .sort((a, b) => (b.tgl ?? '').localeCompare(a.tgl ?? ''))
  }

  async function add(data: Omit<Maintenance, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'maintenance'), data)
    await load()
    return ref.id
  }

  async function update(id: string, data: Partial<Maintenance>) {
    await updateDoc(doc(db, 'maintenance', id), data as Record<string, unknown>)
    await load()
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, 'maintenance', id))
    await load()
  }

  return { items, load, add, update, remove }
})
