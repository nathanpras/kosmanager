import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
  ArcElement,
  PointElement, LineElement, Filler,
} from 'chart.js'

ChartJS.register(
  Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
  ArcElement,
  PointElement, LineElement, Filler,
)

/**
 * Muat ulang otomatis saat service worker baru mengambil alih.
 *
 * Konfigurasi PWA memakai `autoUpdate`, dan sw.js memang sudah skipWaiting +
 * clientsClaim — service worker baru berkuasa begitu selesai dipasang. Tapi
 * halaman yang SEDANG terbuka masih memegang aset lama di memori, dan tidak ada
 * apa pun yang menyuruhnya memuat ulang. Akibatnya versi baru selalu baru
 * terlihat pada pembukaan BERIKUTNYA — sumber kebingungan "kok tidak berubah".
 *
 * Penjaga `punyaControllerAwal` penting: controllerchange juga menyala saat
 * service worker dipasang PERTAMA KALI, dan memuat ulang di situ berarti
 * kunjungan pertama siapa pun akan berkedip tanpa alasan.
 */
if ('serviceWorker' in navigator) {
  const punyaControllerAwal = !!navigator.serviceWorker.controller
  let sudahMuatUlang = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!punyaControllerAwal || sudahMuatUlang) return
    sudahMuatUlang = true
    window.location.reload()
  })
}

createApp(App).use(createPinia()).use(router).mount('#app')
