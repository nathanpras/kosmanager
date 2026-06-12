import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from '../firebase'
import type { Pengeluaran } from '../types'

export const usePengeluaranStore = defineStore('pengeluaran', () => {
  const items = ref<Pengeluaran[]>([])

  function sortItems(arr: Pengeluaran[]) {
    return arr.sort((a, b) => (b.tgl ?? '').localeCompare(a.tgl ?? ''))
  }

  async function load() {
    const snap = await getDocs(collection(db, 'pengeluaran'))
    items.value = sortItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pengeluaran)))
  }

  let unsub: (() => void) | null = null
  function subscribe(): Promise<void> {
    return new Promise((resolve) => {
      if (unsub) { resolve(); return }
      let first = true
      const done = () => { if (first) { first = false; resolve() } }
      unsub = onSnapshot(collection(db, 'pengeluaran'),
        (snap) => { items.value = sortItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pengeluaran))); done() },
        () => done(),
      )
    })
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

  return { items, load, subscribe, add, update, remove }
})
