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
  ],
})

export default router
