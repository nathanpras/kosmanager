# kosmanager

Aplikasi pengelola kos: properti, kamar, penghuni, tagihan, pengeluaran, dan
laporan. Vue 3 + TypeScript + Vite, data di Firestore.

> **Melanjutkan kerja?** Mulai dari **[docs/PROGRESS.md](docs/PROGRESS.md)** —
> di sana ada status terkini, keputusan yang sudah dikunci, apa yang berikutnya,
> dan jebakan yang sudah pernah kena.

## Menjalankan

```
npm install
npm run dev          # server pengembangan
npm run build        # periksa tipe lalu build produksi
npm run test:run     # uji unit
npm run typecheck    # periksa tipe saja
```

## Susunan

```
src/
  views/        satu berkas per layar
  stores/       Pinia, satu per koleksi Firestore
  components/   layout, bagan, komponen bersama
  composables/  useProperty, useToast, useWAReminder
docs/
  PROGRESS.md   papan status — baca ini dulu
  superpowers/
    specs/      kontrak desain yang sudah disetujui
    mockups/    prototype mobile bergaya Kamaru + skrip ujinya
```
