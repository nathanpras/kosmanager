import { ref } from 'vue'

interface Toast {
  id: number
  msg: string
  type: 'success' | 'error' | ''
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
  function show(msg: string, type: Toast['type'] = '') {
    const id = ++nextId
    toasts.value.push({ id, msg, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 2800)
  }

  return { toasts, show }
}
