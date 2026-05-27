import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, doc, getDoc, setDoc, deleteDoc } from '../firebase'
import type { AppSettings } from '../types'

export const useSettingsStore = defineStore('settings', () => {
  const data = ref<AppSettings>({})

  async function load() {
    const snap = await getDoc(doc(db, 'settings', 'kos'))
    data.value = snap.exists() ? (snap.data() as AppSettings) : {}
  }

  async function save(updates: Partial<AppSettings>) {
    data.value = { ...data.value, ...updates }
    await setDoc(doc(db, 'settings', 'kos'), data.value, { merge: true })
  }

  async function getPin(): Promise<string | null> {
    const snap = await getDoc(doc(db, 'settings', 'pin'))
    return snap.exists() ? (snap.data()?.value as string ?? null) : null
  }

  async function savePin(pin: string) {
    await setDoc(doc(db, 'settings', 'pin'), { value: pin })
  }

  async function deletePin() {
    await deleteDoc(doc(db, 'settings', 'pin'))
  }

  return { data, load, save, getPin, savePin, deletePin }
})
