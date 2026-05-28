# KosManager v2 — Design Spec
_Date: 2026-05-27_

---

## Overview

Full rewrite of KosManager — an Indonesian boarding house (kos) management PWA — from a single 3500-line HTML/vanilla JS file to a modern Vue 3 + TypeScript + Vite application. Data stays untouched in the existing Firebase Firestore project (`kos-manager-93c43`). The rewrite adds three new features on top of full feature parity: automated WhatsApp reminders, analytics charts, and a maintenance request system.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Vue 3** (Composition API) | Gentlest transition from vanilla JS; reactive templates replace string HTML building |
| Language | **TypeScript** | Catches bugs at compile time; Claude writes more accurate code with types defined |
| Build tool | **Vite 5** | Instant dev server, fast HMR, built-in PWA plugin |
| State | **Pinia** | Replaces the global `C` object; one store per collection; reactive across all components |
| Database | **Firebase SDK v9** (modular) | Same Firestore data; proper SDK replaces manual REST fetch calls |
| Charts | **Chart.js 4 + vue-chartjs 5** | Most widely used Vue chart library; bar, pie, line all supported |
| Router | **Vue Router 4** | Page navigation without page reloads |
| PWA | **vite-plugin-pwa** | Drop-in replacement for the existing sw.js service worker |
| Styling | **Inline CSS custom properties** (same design tokens as v1) | No extra dependency; preserves the existing visual design exactly |

---

## Project Structure

```
kosmanager-v2/
├── public/
│   ├── manifest.json          ← same as v1
│   └── icon-192.png
├── src/
│   ├── main.ts                ← app entry, registers Pinia + Router
│   ├── App.vue                ← root shell (sidebar + topbar + router-view)
│   ├── firebase.ts            ← Firebase app init, exports db
│   │
│   ├── types/
│   │   └── index.ts           ← TypeScript interfaces for every Firestore document
│   │
│   ├── stores/                ← Pinia stores (one per Firestore collection)
│   │   ├── app.ts             ← global state: currentPropertyId, theme, PIN status
│   │   ├── kamar.ts
│   │   ├── penghuni.ts
│   │   ├── tagihan.ts
│   │   ├── pengeluaran.ts
│   │   ├── maintenance.ts
│   │   ├── properties.ts
│   │   └── settings.ts
│   │
│   ├── router/
│   │   └── index.ts           ← named routes mapping to views
│   │
│   ├── views/                 ← one .vue file per page
│   │   ├── DashboardView.vue
│   │   ├── KamarView.vue
│   │   ├── PenghuniView.vue
│   │   ├── TagihanView.vue
│   │   ├── PengeluaranView.vue
│   │   ├── LaporanView.vue    ← enhanced with charts
│   │   ├── MaintenanceView.vue  ← NEW
│   │   ├── LogView.vue
│   │   └── SettingsView.vue
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppSidebar.vue
│   │   │   ├── AppTopBar.vue
│   │   │   └── AppBottomNav.vue
│   │   ├── shared/
│   │   │   ├── AppModal.vue
│   │   │   ├── AppToast.vue
│   │   │   ├── PinScreen.vue
│   │   │   └── ConfirmDialog.vue
│   │   ├── dashboard/
│   │   │   └── MetricCard.vue
│   │   ├── charts/            ← NEW
│   │   │   ├── RevenueBarChart.vue
│   │   │   ├── ExpensePieChart.vue
│   │   │   └── OccupancyTrendChart.vue
│   │   └── maintenance/       ← NEW
│   │       ├── MaintenanceCard.vue
│   │       └── MaintenanceForm.vue
│   │
│   ├── composables/
│   │   ├── useProperty.ts     ← filterByProperty() reactive helper
│   │   ├── useToast.ts        ← show/hide toast notifications
│   │   └── useWAReminder.ts   ← NEW: generate WA reminder messages
│   │
│   └── utils/
│       ├── format.ts          ← fmt(), fmtTgl(), fmtTime()
│       └── date.ts            ← today(), bulanIni(), etc.
│
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Data Layer

### TypeScript Types (`src/types/index.ts`)

Every Firestore document gets a TypeScript interface. This is the single source of truth for what fields exist on each record — eliminates the silent `undefined` bugs common in the current app.

```ts
interface Kamar {
  id: string
  nomor: string
  tipe: string
  harga: number
  status: 'kosong' | 'terisi' | 'telat' | 'booked'
  property_id: string
  kategori?: string
  foto?: string
  deposit?: number
  keterangan?: string
}

interface Penghuni {
  id: string
  nama: string
  kamar: string
  no_hp: string
  masuk: string        // ISO date
  kontrak_selesai?: string
  property_id: string
  // ... etc
}

interface Tagihan {
  id: string
  penghuni: string
  kamar: string
  bulan: string        // e.g. "Mei 2026"
  jumlah: number
  status: 'belum' | 'lunas' | 'kurang'
  property_id: string
  tgl?: string
  jumlah_bayar?: number
  createdAt: string
}

interface Maintenance {
  id: string
  kamar: string
  deskripsi: string
  status: 'open' | 'in_progress' | 'selesai'
  prioritas: 'low' | 'medium' | 'high'
  tgl: string
  property_id: string
  catatan?: string
  foto?: string
}

interface Property {
  id: string
  nama: string
  alamat: string
  no_hp: string
  bank_nama?: string
  bank_rekening?: string
  bank_an?: string
  is_default?: boolean
  created_at: string
}
```

### Pinia Stores

Each store follows the same pattern: load from Firestore on init, expose reactive state, expose actions for CRUD operations.

```ts
// Example: src/stores/tagihan.ts
export const useTagihanStore = defineStore('tagihan', () => {
  const items = ref<Tagihan[]>([])

  async function load() {
    const snap = await getDocs(collection(db, 'tagihan'))
    items.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Tagihan))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async function add(data: Omit<Tagihan, 'id'>) { ... }
  async function update(id: string, data: Partial<Tagihan>) { ... }
  async function remove(id: string) { ... }

  return { items, load, add, update, remove }
})
```

The `app` store holds `currentPropertyId` (replaces the global variable) and a `filterByProperty<T>` computed that all views use.

---

## Views & Feature Parity

All existing pages are preserved 1:1 in functionality:

| View | Key responsibility |
|---|---|
| `DashboardView` | Metrics, recent tagihan/pengeluaran, contract alerts, property comparison |
| `KamarView` | Room grid grouped by kategori, collapsible sections, room detail modal |
| `PenghuniView` | Tenant table/cards, add/edit/evict, WA contact |
| `TagihanView` | Bill table with tab per month, pay/undo actions |
| `PengeluaranView` | Expense list, add/edit/delete |
| `LaporanView` | Financial report + **new charts** |
| `LogView` | Activity log |
| `SettingsView` | App settings, property management, PIN change |

Navigation (sidebar desktop / bottom nav mobile), dark mode, multi-property selector, PIN screen, and PWA behavior are all preserved exactly.

---

## New Feature 1 — WhatsApp Bill Reminders

**Location:** `TagihanView` → new "Kirim Reminder" button at the top of each month tab.

**How it works:**
1. User opens the month tab (e.g. "Mei 2026")
2. Taps "Kirim Reminder" — shows a preview list of all unpaid tenants for that month
3. Each row shows tenant name, room, amount due, and a "Kirim" button
4. Tapping "Kirim" opens WhatsApp with a pre-filled message: _"Halo [nama], tagihan kos bulan [bulan] sebesar [jumlah] belum dibayar. Mohon segera dilunasi. Terima kasih 🙏"_
5. User can customise the message template in Settings

**Composable (`useWAReminder.ts`):**
```ts
function generateReminderURL(penghuni: Penghuni, tagihan: Tagihan, template: string): string {
  const msg = template
    .replace('{nama}', penghuni.nama)
    .replace('{bulan}', tagihan.bulan)
    .replace('{jumlah}', fmt(tagihan.jumlah))
  return `https://wa.me/${penghuni.no_hp}?text=${encodeURIComponent(msg)}`
}
```

This complements the existing WA blast (which exports an HTML file for bulk messaging) — the reminder flow is faster for the common case of chasing unpaid bills at the start of each month.

---

## New Feature 2 — Analytics Charts (`LaporanView`)

**Charts added:**

| Chart | Type | Data |
|---|---|---|
| Revenue per month | Bar chart | Last 6 months of `tagihan` totals |
| Expense breakdown | Pie/doughnut | `pengeluaran` grouped by `kategori` |
| Occupancy trend | Line chart | Occupancy % per month (computed from `penghuni` masuk/kontrak_selesai dates — count of active tenants per month ÷ total rooms) |

**Implementation:** Each chart is a standalone component wrapping a `vue-chartjs` component. They receive their data as props from `LaporanView`, which computes the datasets from the Pinia stores. Charts are responsive and respect dark mode by watching the `app` store's `isDark` flag.

---

## New Feature 3 — Maintenance Requests (`MaintenanceView`)

The existing app already stores maintenance data in Firestore but has no proper UI. This builds it out fully.

**UI layout:**
- Board view: three columns — **Open**, **In Progress**, **Selesai**
- Each card shows: room number, description, priority badge (low/medium/high), date reported
- Tap a card → detail modal with notes, photo (optional), status change buttons
- "Laporkan Masalah" button → form: room picker, description, priority, optional photo

**Maintenance store:** loads the `maintenance` Firestore collection, exposes actions for `add`, `updateStatus`, `addNote`, `delete`.

**Priority badges:** `high` = red, `medium` = amber, `low` = gray (consistent with existing badge system).

---

## PWA

`vite-plugin-pwa` replaces the hand-written `sw.js`. Config:

```ts
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  manifest: { /* same as existing manifest.json */ },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [/* Firebase API calls */]
  }
})
```

---

## Migration Notes

- **No data migration needed.** The new app connects to the same Firebase project (`kos-manager-93c43`) with the same collection names. All existing data loads automatically.
- **PIN** is stored in `settings/pin` in Firestore — same as before, no change.
- **The old `index-2.html` stays untouched** until the new app is ready and tested. There is no incremental migration — hard cutover when complete.
- **Firebase security rules** should be tightened after migration (currently open read/write — acceptable for a private single-user app, but worth noting).

---

## Out of Scope (v2)

- Tenant portal / tenant-facing view
- Payment proof photo upload by tenants
- Bank statement import
- Occupancy calendar
- Waitlist

These are good candidates for v3 once the rewrite is stable.
