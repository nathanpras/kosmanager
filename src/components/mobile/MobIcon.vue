<script setup lang="ts">
/* Peta ikon shell mobile, dipanen dari mockup bergaya Kamaru.

   Terpisah dari AppIcon.vue dengan sengaja: gaya garisnya berbeda (tebal 1.6,
   ujung bulat) dan nama-namanya berbeda. Menggabungkan keduanya berarti
   mengubah ikon di tampilan desktop, yang tidak boleh disentuh. */
const JALUR: Record<string, string> = {
  back: `<path d="M15 19l-7-7 7-7"/>`,
  chev: `<path d="M9.5 18l6-6-6-6"/>`,
  more: `<circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>`,
  bell: `<path d="M18.2 8.5a6.2 6.2 0 1 0-12.4 0c0 6.8-2.8 8.8-2.8 8.8h18s-2.8-2-2.8-8.8"/><path d="M13.7 20.8a2 2 0 0 1-3.4 0"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`,
  door: `<path d="M5 21V4.2a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1V21"/><path d="M3.4 21h17.2"/><circle cx="13" cy="12.6" r=".95" fill="currentColor" stroke="none"/>`,
  cal: `<rect x="3" y="5" width="18" height="16" rx="3.4"/><path d="M8 3v4M16 3v4M3 10.6h18"/>`,
  users: `<path d="M16.5 20.5v-1.2a4 4 0 0 0-4-4h-5a4 4 0 0 0-4 4v1.2"/><circle cx="10" cy="7.5" r="3.3"/><path d="M21.5 20.5v-1.2a4 4 0 0 0-3-3.9"/><path d="M16 4.3a3.3 3.3 0 0 1 0 6.4"/>`,
  plus: `<path d="M12 5.4v13.2M5.4 12h13.2"/>`,
  edit: `<path d="M12.5 20.5H21"/><path d="M16.8 3.6a2.2 2.2 0 0 1 3.1 3.1L8 18.6l-4.2 1.1 1.1-4.2z"/>`,
  note: `<rect x="4" y="3" width="16" height="18" rx="3.4"/><path d="M8.4 8.4h7.2M8.4 12.4h7.2M8.4 16.4h4"/>`,
  info: `<circle cx="12" cy="12" r="9"/><path d="M12 11.2v5"/><path d="M12 7.7h.01"/>`,
  wa: `<path d="M21.8 16.7v2.8a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.2 19.2 0 0 1-5.9-5.9 19.6 19.6 0 0 1-3-8.6 2 2 0 0 1 2-2.2h2.8a2 2 0 0 1 2 1.7c.13 1 .36 1.9.7 2.8a2 2 0 0 1-.46 2.1L8.1 9.6a15.8 15.8 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.45c.9.33 1.8.56 2.8.69a2 2 0 0 1 1.7 2z"/>`,
  wallet: `<rect x="3" y="6" width="18" height="13" rx="3.4"/><path d="M3 10.6h18"/><circle cx="16.8" cy="14.9" r="1.25" fill="currentColor" stroke="none"/>`,
  receipt: `<path d="M6.2 3h11.6v18l-2.3-1.5-2.3 1.5L12 19.9l-1.2 1.1-2.3-1.5L6.2 21z"/><path d="M9.3 8.4h5.4M9.3 12.4h5.4"/>`,
  money: `<rect x="2.6" y="6" width="18.8" height="12" rx="3.4"/><circle cx="12" cy="12" r="2.6"/><path d="M6.1 12h.01M17.9 12h.01"/>`,
  camera: `<path d="M4 8.2h2.8L8.3 6h7.4l1.5 2.2H20a1 1 0 0 1 1 1v8.6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.2a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.3" r="3.1"/>`,
  idcard: `<rect x="2.6" y="5" width="18.8" height="14" rx="3.4"/><circle cx="8.6" cy="11" r="2.05"/><path d="M5.5 16c.6-1.35 1.75-2.05 3.1-2.05S11.1 14.65 11.7 16"/><path d="M15 10.2h4M15 14h3"/>`,
  file: `<path d="M14 3.2V8h4.8"/><path d="M6.2 3.2H14L19 8v12.8H6.2z"/>`,
  sliders: `<path d="M4 7.5h9M18.6 7.5h1.4M4 16.5h3.4M13 16.5h7"/><circle cx="15.5" cy="7.5" r="2.3"/><circle cx="10" cy="16.5" r="2.3"/>`,
  trash: `<path d="M4.2 6.8h15.6"/><path d="M9.3 6.8V4.7h5.4v2.1"/><path d="M6.5 6.8 7.5 20.1h9L17.5 6.8"/>`,
  move: `<path d="M5.6 9 3 12l2.6 3M9 5.6 12 3l3 2.6M15 18.4 12 21l-3-2.6M18.4 9 21 12l-2.6 3M3.2 12h17.6M12 3.2v17.6"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 6.9V12l3.1 2"/>`,
  in: `<path d="M15 4.6h3.4A1.6 1.6 0 0 1 20 6.2v11.6a1.6 1.6 0 0 1-1.6 1.6H15"/><path d="M10.6 8 14.6 12l-4 4"/><path d="M14.2 12H4"/>`,
  out: `<path d="M9 4.6H5.6A1.6 1.6 0 0 0 4 6.2v11.6a1.6 1.6 0 0 0 1.6 1.6H9"/><path d="M15.4 8 19.4 12l-4 4"/><path d="M19 12H8.8"/>`,
  x: `<path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6"/>`,
  warn: `<path d="M12 3.8 21.6 20.2H2.4z"/><path d="M12 9.9v4.3M12 17.1h.01"/>`,
  check: `<path d="M20 6.5 9.2 17.3 4 12.1"/>`,
  img: `<rect x="3" y="4.6" width="18" height="14.8" rx="3.4"/><circle cx="8.6" cy="10" r="1.7"/><path d="M4 17.4l4.8-4.4 3.4 3 3-2.6 4.8 4"/>`,
  build: `<path d="M4 21V5.5a1 1 0 0 1 1-1h6V21"/><path d="M11 10h8a1 1 0 0 1 1 1v10"/><path d="M7 9h1M7 13h1M7 17h1M15 14h1M15 18h1"/><path d="M2.5 21h19"/>`,
  key: `<circle cx="8.2" cy="15.2" r="4"/><path d="M11 12.4 19.8 3.6"/><path d="M17.2 6.2 19.4 8.4M14.9 8.5l2.2 2.2"/>`,
}

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 21 })
</script>

<template>
  <svg
    :width="props.size" :height="props.size" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
    v-html="JALUR[props.name] ?? ''"
  />
</template>
