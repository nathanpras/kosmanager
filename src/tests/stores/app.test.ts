import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../../stores/app'

beforeEach(() => setActivePinia(createPinia()))

describe('useAppStore', () => {
  it('defaults currentPropertyId to all', () => {
    const store = useAppStore()
    expect(store.currentPropertyId).toBe('all')
  })

  it('sets currentPropertyId', () => {
    const store = useAppStore()
    store.setProperty('abc123')
    expect(store.currentPropertyId).toBe('abc123')
  })

  it('defaults isDark to false', () => {
    const store = useAppStore()
    expect(store.isDark).toBe(false)
  })

  it('toggles dark mode', () => {
    const store = useAppStore()
    store.toggleDark()
    expect(store.isDark).toBe(true)
    store.toggleDark()
    expect(store.isDark).toBe(false)
  })
})
