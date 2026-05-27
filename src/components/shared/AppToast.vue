<script setup lang="ts">
import { useToast } from '../../composables/useToast'
const { toasts } = useToast()
</script>

<template>
  <div class="toast-wrap">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      :class="t.type"
    >
      {{ t.type === 'success' ? '✓ ' : t.type === 'error' ? '✗ ' : '' }}{{ t.msg }}
    </div>
  </div>
</template>
