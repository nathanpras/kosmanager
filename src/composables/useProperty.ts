import { useAppStore } from '../stores/app'

export function useProperty() {
  const appStore = useAppStore()

  function filterByProperty<T extends { property_id: string }>(items: T[]): T[] {
    if (appStore.currentPropertyId === 'all') return items
    return items.filter(x => x.property_id === appStore.currentPropertyId)
  }

  return { filterByProperty }
}
