import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'dashboard',     component: DashboardView },
    { path: '/kamar',       name: 'kamar',       component: () => import('../views/KamarView.vue') },
    { path: '/penghuni',    name: 'penghuni',     component: () => import('../views/PenghuniView.vue') },
    { path: '/tagihan',     name: 'tagihan',      component: () => import('../views/TagihanView.vue') },
    { path: '/pengeluaran', name: 'pengeluaran',  component: () => import('../views/PengeluaranView.vue') },
    { path: '/laporan',     name: 'laporan',      component: () => import('../views/LaporanView.vue') },
    { path: '/maintenance', name: 'maintenance',  component: () => import('../views/MaintenanceView.vue') },
    { path: '/log',         name: 'log',          component: () => import('../views/LogView.vue') },
    { path: '/settings',    name: 'settings',     component: () => import('../views/SettingsView.vue') },

    /* Shell mobile bergaya Kamaru. IA-nya berbeda dari sembilan rute datar di
       atas — tiga tab dengan drill-down — jadi ia hidup di subpohonnya sendiri.
       Selama port masih sebagian, `/m` hanya terbuka kalau dituju sengaja;
       belum ada pengalihan otomatis dari layar sempit. Lihat
       docs/superpowers/specs/2026-10-01-port-mobile-ke-aplikasi-design.md */
    {
      path: '/m',
      component: () => import('../components/mobile/MobileShell.vue'),
      children: [
        { path: '',          name: 'm-properti', component: () => import('../views/mobile/MobPropertiView.vue') },
        { path: 'kalender',  name: 'm-kalender', component: () => import('../views/mobile/MobKalenderView.vue') },
        { path: 'penghuni',  name: 'm-penghuni', component: () => import('../views/mobile/MobPenghuniView.vue') },
      ],
    },
  ],
})

export default router
