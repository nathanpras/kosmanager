import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from '../firebase'
import type { Penghuni } from '../types'

export const usePenghuniStore = defineStore('penghuni', () => {
  const items = ref<Penghuni[]>([])

  async function load() {
    const snap = await getDocs(collection(db, 'penghuni'))
    items.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Penghuni))
  }

  let unsub: (() => void) | null = null
  function subscribe(): Promise<void> {
    return new Promise((resolve) => {
      if (unsub) { resolve(); return }
      let first = true
      const done = () => { if (first) { first = false; resolve() } }
      unsub = onSnapshot(collection(db, 'penghuni'),
        (snap) => { items.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Penghuni)); done() },
        () => done(),
      )
    })
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

  return { items, load, subscribe, add, update, remove }
})
