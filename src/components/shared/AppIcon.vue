<script setup lang="ts">
/**
 * Set ikon garis untuk navigasi.
 *
 * Emoji dirender oleh font sistem, jadi bentuk, berat, dan warnanya berbeda-beda
 * antar perangkat dan tidak bisa mengikuti warna aktif. Ikon di sini memakai
 * `currentColor` dan ketebalan garis yang seragam, sehingga menyatu dengan
 * warna teks di sekitarnya — termasuk saat mode gelap dan saat menu aktif.
 *
 * Emoji tetap dipakai di tempat lain (kategori, status) yang justru diuntungkan
 * warnanya sendiri.
 */
defineProps<{ name: string; size?: number }>()

const PATHS: Record<string, string> = {
  dashboard:   'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  kamar:       'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14.5 12h.01',
  penghuni:    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  tagihan:     'M6 2h12a1 1 0 0 1 1 1v18l-3-2-3 2-3-2-3 2V3a1 1 0 0 1 1-1zM9 8h6M9 12h6',
  pengeluaran: 'M22 17 13.5 8.5l-5 5L2 7M16 17h6v-6',
  laporan:     'M3 3v18h18M7 15l4-4 3 3 5-6',
  maintenance: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z',
  log:         'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  settings:    'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
}
</script>

<template>
  <svg
    class="app-icon"
    :width="size ?? 22"
    :height="size ?? 22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="PATHS[name] ?? PATHS.dashboard" />
  </svg>
</template>
