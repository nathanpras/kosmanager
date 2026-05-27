<script setup lang="ts">
const props = defineProps<{
  open: boolean
  icon?: string
  msg: string
  sub?: string
  okLabel?: string
  danger?: boolean
}>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div id="kos-confirm" :class="{ open: props.open }" @click.self="emit('cancel')">
    <div class="kos-confirm-box">
      <div class="kos-confirm-icon">{{ props.icon ?? '⚠️' }}</div>
      <div class="kos-confirm-msg">{{ props.msg }}</div>
      <div v-if="props.sub" class="kos-confirm-sub">{{ props.sub }}</div>
      <div class="kos-confirm-btns">
        <button class="kos-confirm-cancel" @click="emit('cancel')">Batal</button>
        <button class="kos-confirm-ok" :class="{ danger: props.danger }" @click="emit('confirm')">
          {{ props.okLabel ?? 'Ya, Lanjutkan' }}
        </button>
      </div>
    </div>
  </div>
</template>
