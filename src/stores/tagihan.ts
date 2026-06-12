import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from '../firebase'
import type { Tagihan } from '../types'

export const useTagihanStore = defineStore('tagihan', () => {
  const items = ref<Tagihan[]>([])

  function sortItems(arr: Tagihan[]) {
    return arr.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  }

  async function load() {
    const snap = await getDocs(collection(db, 'tagihan'))
    items.value = sortItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tagihan)))
  }

  // Real-time: dengarkan perubahan dari device lain. Resolve saat snapshot pertama.
  let unsub: (() => void) | null = null
  function subscribe(): Promise<void> {
    return new Promise((resolve) => {
      if (unsub) { resolve(); return }
      let first = true
      const done = () => { if (first) { first = false; resolve() } }
      unsub = onSnapshot(collection(db, 'tagihan'),
        (snap) => { items.value = sortItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tagihan))); done() },
        () => done(),
      )
    })
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

  return { items, load, subscribe, add, update, remove }
})
