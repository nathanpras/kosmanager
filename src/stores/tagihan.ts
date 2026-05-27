import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from '../firebase'
import type { Tagihan } from '../types'

export const useTagihanStore = defineStore('tagihan', () => {
  const items = ref<Tagihan[]>([])

  async function load() {
    const snap = await getDocs(collection(db, 'tagihan'))
    items.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Tagihan))
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  }

  async function add(data: Omit<Tagihan, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'tagihan'), data)
    await load()
    return ref.id
  }

  async function update(id: string, data: Partial<Tagihan>) {
    await updateDoc(doc(db, 'tagihan', id), data as Record<string, unknown>)
    await load()
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, 'tagihan', id))
    await load()
  }

  return { items, load, add, update, remove }
})
