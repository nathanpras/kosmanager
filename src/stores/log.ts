import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, collection, getDocs, addDoc } from '../firebase'
import type { LogEntry } from '../types'

export const useLogStore = defineStore('log', () => {
  const items = ref<LogEntry[]>([])

  async function load() {
    const snap = await getDocs(collection(db, 'log'))
    items.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as LogEntry))
      .sort((a, b) => b.ts.localeCompare(a.ts))
  }

  async function add(text: string, color: LogEntry['color'] = 'green', propertyId: string = '') {
    await addDoc(collection(db, 'log'), { text, color, ts: new Date().toISOString(), property_id: propertyId })
  }

  return { items, load, add }
})
