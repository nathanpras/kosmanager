import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProperty } from '../../composables/useProperty'
import { useAppStore } from '../../stores/app'

beforeEach(() => setActivePinia(createPinia()))

describe('useProperty', () => {
  it('returns all items when currentPropertyId is all', () => {
    const app = useAppStore()
    app.currentPropertyId = 'all'
    const { filterByProperty } = useProperty()
    const items = [
      { id: '1', property_id: 'abc' },
      { id: '2', property_id: 'xyz' },
    ]
    expect(filterByProperty(items)).toEqual(items)
  })

  it('filters items by currentPropertyId', () => {
    const app = useAppStore()
    app.currentPropertyId = 'abc'
    const { filterByProperty } = useProperty()
    const items = [
      { id: '1', property_id: 'abc' },
      { id: '2', property_id: 'xyz' },
    ]
    expect(filterByProperty(items)).toEqual([{ id: '1', property_id: 'abc' }])
  })
})
