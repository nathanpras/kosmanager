import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const currentPropertyId = ref<string>('all')
  const isDark = ref(false)
  const isReady = ref(false)
  const isPinVerified = ref(false)

  function setProperty(id: string) {
    currentPropertyId.value = id
    try { localStorage.setItem('lastPropertyId', id) } catch {}
  }

  function toggleDark() {
    isDark.value = !isDark.value
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
    try { localStorage.setItem('km-theme', isDark.value ? 'dark' : 'light') } catch {}
  }

  function initTheme() {
    try {
      const saved = localStorage.getItem('km-theme')
      if (saved === 'dark') {
        isDark.value = true
        document.documentElement.setAttribute('data-theme', 'dark')
      }
    } catch {}
  }

  function initProperty() {
    try {
      const saved = localStorage.getItem('lastPropertyId')
      if (saved) currentPropertyId.value = saved
    } catch {}
  }

  return { currentPropertyId, isDark, isReady, isPinVerified, setProperty, toggleDark, initTheme, initProperty }
})
