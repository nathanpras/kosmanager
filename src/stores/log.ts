import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, addDoc, onSnapshot } from '../firebase'
import type { LogEntry } from '../types'

export const useLogStore = defineStore('log', () => {
  const items = ref<LogEntry[]>([])

  function sortItems(arr: LogEntry[]) {
    return arr.sort((a, b) => (b.ts ?? '').localeCompare(a.ts ?? ''))
  }

  async function load() {
    const snap = await getDocs(collection(db, 'log'))
    items.value = sortItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as LogEntry)))
  }

  let unsub: (() => void) | null = null
  function subscribe(): Promise<void> {
    return new Promise((resolve) => {
      if (unsub) { resolve(); return }
      let first = true
      const done = () => { if (first) { first = false; resolve() } }
      unsub = onSnapshot(collection(db, 'log'),
        (snap) => { items.value = sortItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as LogEntry))); done() },
        () => done(),
      )
    })
  }

  async function add(text: string, color: LogEntry['color'] = 'green', propertyId: string = '') {
    await addDoc(collection(db, 'log'), { text, color, ts: new Date().toISOString(), property_id: propertyId })
  }

  return { items, load, subscribe, add }
})
