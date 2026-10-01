<script setup lang="ts">
/* Tahap 1 port: kerangka saja. Isinya menyusul di tahap berikutnya —
 * lihat docs/superpowers/specs/2026-10-01-port-mobile-ke-aplikasi-design.md */
import MobScreen from '../../components/mobile/MobScreen.vue'
import MobIcon from '../../components/mobile/MobIcon.vue'
</script>

<template>
  <MobScreen judul="Kalender">
    <div class="card emptystate">
      <div class="emptystate-art"><MobIcon name="cal" :size="40" /></div>
      <h3>Kalender</h3>
      <p>Layar ini belum diisi. Fondasi shell sudah berdiri; datanya menyusul di tahap berikutnya.</p>
    </div>
  </MobScreen>
</template>
