# Ronde 3 Mockup Mobile kosmanager — Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti huruf mockup ke Inter lalu menambah edit penghuni, riwayat penghuni, catatan internal, unggah foto sungguhan, dan sheet WhatsApp, sesuai butir 15–20 kontrak desain.

**Architecture:** Semua perubahan masuk ke satu berkas `docs/superpowers/mockups/kosmanager-mobile.html` (vanilla JS, router hash, `VIEWS` per layar, `SHEETS` per bottom sheet, satu penangan klik terdelegasi di `#phone`). Setiap fitur diuji lebih dulu lewat langkah baru di `_smoke.cjs` (jsdom), lalu diperiksa visual lewat `_shots.cjs` (chromium). Tidak ada berkas baru selain rencana ini; `src/` tidak disentuh.

**Tech Stack:** HTML/CSS/JS vanilla, Google Fonts (Inter), jsdom untuk uji, chromium Playwright untuk potret.

**Kontrak:** `docs/superpowers/specs/2026-09-27-kosmanager-mobile-kamaru-design.md`, butir 15–20.

---

## Aturan kerja untuk seluruh tugas

- Semua perintah dijalankan dari akar repo `C:\Users\jonat\Downloads\kosmanager`.
- Uji: `node docs/superpowers/mockups/_smoke.cjs`. Hasil yang diharapkan tertulis per langkah; baris terakhir `Tidak ada error runtime.` berarti hijau.
- Langkah uji baru selalu disisipkan **tepat sebelum** komentar `/* ════════════ Audit statis ════════════` di `_smoke.cjs`, supaya dua audit statis tetap berjalan paling akhir dan ikut memeriksa class dari layar baru.
- Setiap atribut `data-*` baru yang harus bisa diklik **wajib** ditambahkan ke daftar selektor `closest()` di penangan klik (`phone.addEventListener('click', …)`). Kalau lupa, kliknya gagal tanpa pesan.
- Setiap class baru yang dirender wajib punya aturan CSS; audit statis akan menagihnya.
- Jangan `git add package-lock.json` (perubahan lama yang belum jelas asalnya).
- Commit memakai akhiran:

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```

Singkatan: `HTML` = `docs/superpowers/mockups/kosmanager-mobile.html`, `SMOKE` = `docs/superpowers/mockups/_smoke.cjs`, `SHOTS` = `docs/superpowers/mockups/_shots.cjs`.

---

### Tugas 1: Ganti huruf ke Inter

**Files:**
- Modify: `HTML` baris 4 (`<link>` Google Fonts), lapis `tokens` (`--f-*`), lapis `components` dan `screens` (aturan yang memakai `--f-display` / `--f-mono`), dua `<strong>` bergaya inline di `VIEWS.calendar` dan `miniCal`
- Test: `SMOKE`

- [ ] **Langkah 1: Tulis uji yang gagal**

Sisipkan di `SMOKE` sebelum komentar audit statis:

```js
/* ════════════ RONDE 3 ════════════ */

step('R3 huruf: hanya Inter yang dimuat', () => {
  const link = q('link[rel="stylesheet"]').getAttribute('href');
  if (!/family=Inter/.test(link)) throw new Error('Inter tidak dimuat: ' + link);
  if (/Instrument|DM\+Mono/.test(link)) throw new Error('huruf lama masih dimuat: ' + link);
  const css = qa('style').map(s => s.textContent).join('\n');
  if (/Instrument|DM Mono/.test(css)) throw new Error('nama huruf lama masih ada di CSS');
  if (/var\(--f-display\);[^}]*font-weight:\s*400/.test(css)) throw new Error('judul masih berat 400');
  return 'Inter saja';
});
```

- [ ] **Langkah 2: Jalankan, pastikan gagal**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: `GAGAL R3 huruf: hanya Inter yang dimuat` dengan pesan `Inter tidak dimuat`.

- [ ] **Langkah 3: Ganti `<link>` huruf**

Baris 4 `HTML` menjadi:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..800&display=swap">
```

- [ ] **Langkah 4: Ganti token huruf**

Di lapis `tokens`, ganti tiga baris `--f-ui` / `--f-display` / `--f-mono` dengan:

```css
    --f-ui:       'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    --f-display:  var(--f-ui);
    --f-mono:     var(--f-ui);   /* label huruf besar; nama lama dipertahankan agar selektor tak berubah */
    --w-display:  700;
    --ls-display: -.035em;
    --w-label:    600;
```

- [ ] **Langkah 5: Nyalakan fitur huruf Inter**

Di lapis `components`, tepat setelah aturan `button { font: inherit; … }`, tambahkan:

```css
  /* l berekor (cv05) dan angka terbuka (ss01): Il1 tetap bisa dibedakan */
  body, button, input, textarea { font-feature-settings: 'cv05', 'ss01'; }
```

- [ ] **Langkah 6: Sesuaikan setiap aturan judul dan label**

Ganti persis (kiri → kanan):

| Aturan | Sebelum | Sesudah |
|---|---|---|
| `.statusbar` | `font-family: var(--f-mono); font-size: 13px; font-weight: 500; color: var(--ink);` | `font-family: var(--f-ui); font-size: 13px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums;` |
| `.tb-title` | `font-family: var(--f-display); font-weight: 400; font-size: 19px;` + baris `letter-spacing: -.1px; line-height: 1.2;` | `font-family: var(--f-display); font-weight: 650; font-size: 17px;` + `letter-spacing: -.02em; line-height: 1.2;` |
| `.bigtitle` | `font-family: var(--f-display); font-weight: 400; font-size: 33px;` + `line-height: 1.08; letter-spacing: -.6px;` | `font-family: var(--f-display); font-weight: var(--w-display); font-size: 31px;` + `line-height: 1.08; letter-spacing: var(--ls-display);` |
| `.num` (beserta dua baris komentar di atasnya) | blok komentar Instrument Serif + `.num { font-family: var(--f-ui); font-weight: 500; font-size: .8em; letter-spacing: -.02em; padding-left: .08em; font-variant-numeric: tabular-nums; }` | `/* Sejak Inter, numify() tidak lagi mengganti huruf; span-nya hanya merapikan lebar angka. */` + `.num { font-variant-numeric: tabular-nums; }` |
| `.sechead h2` | `font-family: var(--f-mono); font-size: 11px; font-weight: 500;` | `font-family: var(--f-mono); font-size: 11px; font-weight: var(--w-label);` |
| `.mlabel` | `font-family: var(--f-mono); font-size: 10.5px; font-weight: 500;` | `font-family: var(--f-mono); font-size: 10.5px; font-weight: var(--w-label);` |
| komentar di atas `.mlabel.fig` | `/* Label huruf-besar yang memuat angka — Instrument Sans, bukan mono */` | `/* Label huruf-besar yang memuat angka; setara .mlabel sejak Inter */` |
| `.mlabel.fig` | `font-family: var(--f-ui); font-size: 10.5px; font-weight: 700;` | `font-family: var(--f-ui); font-size: 10.5px; font-weight: var(--w-label);` |
| `.av.lg` | `font-family: var(--f-display); font-weight: 400; font-size: 30px; letter-spacing: 0;` | `font-family: var(--f-display); font-weight: var(--w-display); font-size: 28px; letter-spacing: -.02em;` |
| `.sheet-title` | `font-family: var(--f-display); font-size: 22px; font-weight: 400; letter-spacing: -.3px; line-height: 1.15;` | `font-family: var(--f-display); font-size: 20px; font-weight: var(--w-display); letter-spacing: -.025em; line-height: 1.2;` |
| `.emptystate h3` | `font-family: var(--f-display); font-size: 22px; font-weight: 400; letter-spacing: -.3px;` | `font-family: var(--f-display); font-size: 19px; font-weight: var(--w-display); letter-spacing: -.025em;` |
| `.fhead h1` | `font-family: var(--f-display); font-weight: 400; font-size: 20px; letter-spacing: -.2px;` | `font-family: var(--f-display); font-weight: 650; font-size: 18px; letter-spacing: -.02em;` |
| `.flede` | `font-family: var(--f-display); font-size: 27px; font-weight: 400; line-height: 1.12; letter-spacing: -.5px;` | `font-family: var(--f-display); font-size: 25px; font-weight: var(--w-display); line-height: 1.15; letter-spacing: var(--ls-display);` |
| `.hero h2` | `font-family: var(--f-display); font-weight: 400; font-size: 25px;` + `line-height: 1.12; letter-spacing: -.4px;` | `font-family: var(--f-display); font-weight: var(--w-display); font-size: 23px;` + `line-height: 1.12; letter-spacing: var(--ls-display);` |
| `.hero h2 em` | `.hero h2 em { font-style: italic; }` | `.hero h2 em { font-style: normal; color: var(--brand); }` |
| komentar di lapis screens | `/* Nominal selalu huruf sans: angka 1 pada Instrument Serif mirip huruf l */` | `/* Nominal selalu huruf UI dengan angka tabular */` |
| `.profile h2` | `font-family: var(--f-display); font-size: 26px; font-weight: 400; letter-spacing: -.4px; line-height: 1.1;` | `font-family: var(--f-display); font-size: 24px; font-weight: var(--w-display); letter-spacing: var(--ls-display); line-height: 1.15;` |
| `.cal-dow` | `font-family: var(--f-mono); font-size: 10px; font-weight: 500;` | `font-family: var(--f-mono); font-size: 10px; font-weight: var(--w-label);` |

Dua gaya inline di JavaScript:

- `VIEWS.calendar`: `font-family:var(--f-display);font-weight:400;font-size:19px;letter-spacing:-.2px` → `font-family:var(--f-display);font-weight:700;font-size:18px;letter-spacing:-.02em`
- `miniCal`: `font-family:var(--f-display);font-weight:400;font-size:18px` → `font-family:var(--f-display);font-weight:700;font-size:17px;letter-spacing:-.02em`

Komentar JS di atas `numify` diganti menjadi:

```js
/* Bungkus deret angka di judul. Sejak Inter hanya merapikan lebar angka;
   berguna lagi bila suatu saat judul memakai huruf serif atau mono. */
```

Setelah itu cek: `grep -n "Instrument\|DM Mono\|DM+Mono" docs/superpowers/mockups/kosmanager-mobile.html` harus kosong.

- [ ] **Langkah 7: Jalankan uji**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: `ok    R3 huruf: hanya Inter yang dimuat  -- Inter saja`, seluruh langkah lain tetap `ok`, baris akhir `Tidak ada error runtime.`

- [ ] **Langkah 8: Periksa visual**

Run: `node docs/superpowers/mockups/_shots.cjs`
Buka `_shots/01-home.png`, `04-room.png`, `07-tenant.png`, `11-form-tenant.png`, `18-sheet-tgl.png`. Periksa: judul besar tidak terpotong atau membungkus aneh, label huruf besar masih terbaca, angka di `Rp1.800.000` jelas, sapaan "Jonathan" berwarna biru dan tegak. Kalau ada judul yang meluber, turunkan ukurannya 1–2px di aturan yang bersangkutan.

- [ ] **Langkah 9: Commit**

```bash
git add docs/superpowers/mockups/kosmanager-mobile.html docs/superpowers/mockups/_smoke.cjs
git commit -m "feat(mockup): ganti huruf ke Inter" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tugas 2: Riwayat penghuni dan profil mantan penghuni

**Files:**
- Modify: `HTML` bagian 2 (data), bagian 3 (format), bagian 5 (`navRow`), bagian 6 (`VIEWS.prop`, `VIEWS.room`, `VIEWS.tenant`), bagian 9 (`depth`, `render`)
- Test: `SMOKE`

- [ ] **Langkah 1: Tulis uji yang gagal**

```js
step('R3 riwayat: dari Lainnya properti ke daftar mantan', async () => {
  await hash('#/prop/p1');
  rawClick(qa('.ptab')[2]);
  const baris = q('[data-go="hist/p1"]');
  if (!baris) throw new Error('baris Riwayat penghuni tidak bisa ditekan');
  const ring = baris.textContent.replace(/\s+/g, ' ');
  if (!ring.includes('7 penghuni sebelumnya')) throw new Error('ringkasan: ' + ring);
  await nav(baris);
  const ex = qa('[data-go^="ex/"]');
  if (ex.length !== 7) throw new Error('harusnya 7 mantan, dapat ' + ex.length);
  const pertama = ex[0].textContent.replace(/\s+/g, ' ');
  if (!pertama.includes('Rizky Ramadhan')) throw new Error('urutan salah: ' + pertama);
  if (!pertama.includes('Kamar 108')) throw new Error('riwayat properti harus menyebut kamar');
  return ex.length + ' mantan, teratas ' + pertama.trim().slice(0, 40);
});

step('R3 riwayat kamar 101: urutan dan lama tinggal', async () => {
  await hash('#/room/p1-101');
  if (!q('[data-go="hist/p1-101"]')) throw new Error('tautan Penghuni sebelumnya hilang');
  await hash('#/hist/p1-101');
  const ex = qa('[data-go^="ex/"]');
  if (ex.length !== 2) throw new Error('harusnya 2, dapat ' + ex.length);
  const t = ex[0].textContent.replace(/\s+/g, ' ');
  if (!t.includes('Andreas Siregar') || !t.includes('1 tahun 5 bulan')) throw new Error(t);
  if (t.includes('Kamar 101')) throw new Error('nomor kamar tak perlu diulang di riwayat per kamar');
  return t.trim();
});

step('R3 kamar tanpa riwayat -> empty state', async () => {
  await hash('#/hist/p1-102');
  if (!A().includes('Belum ada riwayat')) throw new Error(A().slice(0, 80));
});

step('R3 mantan penghuni: mode baca saja', async () => {
  await hash('#/hist/p1-101');
  await nav(q('[data-go="ex/x1"]'));
  const t = A();
  if (!t.includes('Andreas Siregar')) throw new Error(t.slice(0, 60));
  if (!t.includes('Mantan penghuni')) throw new Error('chip Mantan penghuni tidak ada');
  if (!t.includes('1 tahun 5 bulan')) throw new Error('lama tinggal tidak tampil');
  if (q('[aria-label="Ubah data penghuni"]')) throw new Error('ikon ubah muncul di mantan penghuni');
  if (q('[data-sheet^="aksi:"]')) throw new Error('tombol Aksi muncul di mantan penghuni');
  if (!q('.docgrid')) throw new Error('blok dokumen hilang');
  return 'baca saja';
});
```

- [ ] **Langkah 2: Jalankan, pastikan gagal**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: `GAGAL R3 riwayat: dari Lainnya properti …` dengan pesan `baris Riwayat penghuni tidak bisa ditekan`.

- [ ] **Langkah 3: Data mantan penghuni**

Di bagian 2 `HTML`, tepat setelah blok `const TXN = { … };`, tambahkan:

```js
/* Mantan penghuni: sudah check-out, datanya tetap bisa dibuka */
const MANTAN = [
  ['x1', 'p1-101', 'Andreas Siregar', 'L', 'Medan',    'Karyawan swasta', '2025-03-01', '2026-08-25'],
  ['x2', 'p1-101', 'Kevin Halim',     'L', 'Jakarta',  'Mahasiswa',       '2024-06-10', '2025-02-20'],
  ['x3', 'p1-104', 'Dewi Lestari',    'P', 'Bandung',  'Perawat',         '2024-09-01', '2025-12-30'],
  ['x4', 'p1-108', 'Rizky Ramadhan',  'L', 'Bogor',    'Kurir',           '2025-10-05', '2026-09-10'],
  ['x5', 'p1-108', 'Nadia Putri',     'P', 'Depok',    'Mahasiswa',       '2024-08-15', '2025-09-01'],
  ['x6', 'p1-110', 'Stefani Gunawan', 'P', 'Surabaya', 'Desainer',        '2025-05-20', '2026-04-10'],
  ['x7', 'p1-203', 'Fajar Nugraha',   'L', 'Garut',    'Teknisi',         '2025-01-12', '2026-07-31'],
  ['x8', 'p2-A1',  'Melati Sari',     'P', 'Tegal',    'Kasir',           '2025-03-10', '2026-01-31'],
  ['x9', 'p2-A3',  'Joko Susilo',     'L', 'Klaten',   'Satpam',          '2025-02-01', '2026-06-30'],
].map(([id, rid, nama, kelamin, asal, kerja, masuk, keluar], i) => ({
  id, rid, prop: rid.split('-')[0], no: rid.split('-')[1], nama, kelamin, asal, kerja, masuk, keluar,
  hp: '0857 ' + String(41236000 + i * 419).slice(0, 4) + ' ' + String(41236000 + i * 419).slice(4, 8),
  darurat: ['Orang tua', 'Kakak', 'Saudara'][i % 3],
  daruratHp: '0813 ' + String(55012000 + i * 307).slice(0, 4) + ' ' + String(55012000 + i * 307).slice(4, 8),
  dok: { wajah: true, ktp: i % 2 === 0, berkas: false },
}));
```

Dan setelah baris `const tenants = () => …`, tambahkan:

```js
const mantan  = id => MANTAN.find(x => x.id === id);
/* Lingkup: id properti ("p1") atau id kamar ("p1-101") */
const diKamar = scope => scope.includes('-');
const mantanDi = scope => MANTAN
  .filter(x => diKamar(scope) ? x.rid === scope : x.prop === scope)
  .sort((a, b) => b.keluar.localeCompare(a.keluar));
```

- [ ] **Langkah 4: Helper format**

Di bagian 3 `HTML`, setelah fungsi `periode(r)`, tambahkan:

```js
function lamaTinggal(dari, sampai) {
  const [y1, m1, d1] = dari.split('-').map(Number);
  const [y2, m2, d2] = sampai.split('-').map(Number);
  const bln = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  if (bln < 1) return 'Kurang dari sebulan';
  const th = Math.floor(bln / 12), sisa = bln % 12;
  return (th ? th + ' tahun' : '') + (th && sisa ? ' ' : '') + (sisa ? sisa + ' bulan' : '');
}
```

- [ ] **Langkah 5: `navRow` bisa menuju rute**

Ganti definisi `navRow` di bagian 5 dengan:

```js
const navRow = (icon, judul, sub, go) =>
  '<button class="card tap lrow" ' + (go ? 'data-go="' + go + '"' : 'data-act="soon"') + '>' +
    '<span class="av sq ghost">' + ic(icon, 19) + '</span>' +
    '<span class="lrow-body"><span class="lrow-title">' + judul + '</span>' +
    '<span class="lrow-sub">' + esc(sub) + '</span></span>' +
    '<span class="chev">' + ic('chev', 18) + '</span>' +
  '</button>';

const namaLingkup = scope => diKamar(scope) ? 'Kamar ' + room(scope).no : prop(scope).nama;
const ringkasRiwayat = scope => {
  const n = mantanDi(scope).length;
  return n ? n + ' penghuni sebelumnya' : 'Belum ada penghuni sebelumnya';
};
```

Catatan: `navRow` kini meng-escape `sub`. Pemanggil lama `navRow('info', 'Info properti', esc(p.daerah))` diubah jadi `navRow('info', 'Info properti', p.daerah)` supaya tidak ter-escape dua kali.

- [ ] **Langkah 6: Sambungkan tautan riwayat**

Di `VIEWS.prop`, baris riwayat pada `tabLain` menjadi:

```js
    navRow('users', 'Riwayat penghuni', ringkasRiwayat(pid), 'hist/' + pid) +
```

Di `VIEWS.room`, seksi "Penghuni sebelumnya" di `tabPenghuni`:

```js
      '<div class="sechead"><h2>Penghuni sebelumnya</h2></div>' +
      navRow('users', 'Riwayat penghuni', ringkasRiwayat(r.id), 'hist/' + r.id) +
```

dan baris riwayat pada `tabLain` kamar:

```js
    navRow('users',  'Riwayat penghuni', ringkasRiwayat(r.id), 'hist/' + r.id) +
```

- [ ] **Langkah 7: Layar riwayat**

Di bagian 6, setelah `VIEWS.room`, tambahkan:

```js
VIEWS.hist = scope => {
  const list = mantanDi(scope);
  const perKamar = diKamar(scope);
  return chrome({ back: true, title: 'Riwayat penghuni' }) +
    '<div class="scroll">' + bigtitle('Riwayat penghuni') +
      '<div class="sechead"><h2>' + esc(namaLingkup(scope)) + '</h2>' +
        '<span class="count">' + list.length + '</span></div>' +
      (list.length
        ? '<div class="stack-v stagger">' + list.map(x =>
            '<button class="card tap lrow" data-go="ex/' + x.id + '">' +
              '<span class="av">' + esc(inisial(x.nama)) + '</span>' +
              '<span class="lrow-body">' +
                '<span class="lrow-title">' + esc(x.nama) + '</span>' +
                '<span class="lrow-sub">' + tgl(x.masuk) + ' – ' + tgl(x.keluar) + '</span>' +
                '<span class="lrow-sub">' + (perKamar ? '' : 'Kamar ' + esc(x.no) + ' · ') +
                  lamaTinggal(x.masuk, x.keluar) + '</span>' +
              '</span>' +
              '<span class="chev">' + ic('chev', 18) + '</span>' +
            '</button>').join('') + '</div>'
        : emptyBox('Belum ada riwayat',
            'Penghuni yang sudah check-out dari ' + (perKamar ? 'kamar' : 'properti') +
            ' ini akan tercatat di sini.')) +
    '</div>';
};
```

- [ ] **Langkah 8: Profil dipakai bersama penghuni aktif dan mantan**

Ganti seluruh `VIEWS.tenant = rid => { … };` dengan:

```js
/* Profil penghuni. bekas = true untuk mantan penghuni: baca saja */
function profilPenghuni(o, bekas) {
  const p = prop(o.prop);
  const baris = [
    ['Nama lengkap',  o.nama],
    ['Jenis kelamin', o.kelamin === 'L' ? 'Laki-laki' : o.kelamin === 'P' ? 'Perempuan' : '–'],
    ['Asal',          o.asal || '–'],
    ['Pekerjaan',     o.kerja || '–'],
    ['Tinggal di',    p.nama],
  ];
  if (bekas) baris.push(
    ['Masa tinggal', tgl(o.masuk) + ' – ' + tgl(o.keluar)],
    ['Lama tinggal', lamaTinggal(o.masuk, o.keluar)]);

  const angka = 'font-size:14.5px;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums';
  return chrome({ back: true, title: o.nama,
                  actions: bekas ? [] : [{ icon: 'edit', act: 'soon', label: 'Ubah data penghuni' }] }) +
    '<div class="scroll" style="padding-top:8px"><div data-tabbody><div class="stagger">' +

      '<section class="card profile">' +
        '<div class="av lg">' + esc(inisial(o.nama)) + '</div>' +
        '<h2>' + esc(o.nama) + '</h2>' +
        '<div class="profile-chips">' +
          '<span class="chip brand">Kamar ' + esc(o.no) + '</span>' +
          (bekas ? '<span class="chip mute">Mantan penghuni</span>' : statusChip(o.status)) +
        '</div>' +
        '<div class="profile-btns">' +
          '<button class="btn primary" data-act="soon">' + ic('wa', 17) + ' WhatsApp</button>' +
          (bekas ? '' : '<button class="btn" data-sheet="aksi:' + o.id + '">' + ic('sliders', 17) + ' Aksi</button>') +
        '</div>' +
      '</section>' +

      '<div class="sechead"><h2>Data diri</h2></div>' +
      '<dl class="card flush divide">' + baris.map(([k, v]) =>
        '<div class="drow"><dt>' + k + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>' +

      '<div class="sechead"><h2>Kontak</h2></div>' +
      '<dl class="card flush divide">' +
        '<div class="drow"><dt>No. HP<br><span style="' + angka + '">' + esc(o.hp) + '</span></dt>' +
          '<dd class="act"><button class="btn sm brandsoft" data-act="soon">' + ic('wa', 15) + ' Chat</button></dd></div>' +
        '<div class="drow"><dt>Kontak darurat · ' + esc(o.darurat) + '<br>' +
          '<span style="' + angka + '">' + esc(o.daruratHp) + '</span></dt></div>' +
      '</dl>' +

      '<div class="sechead"><h2>Foto &amp; dokumen</h2>' +
        '<button class="link" data-act="soon">Kelola</button></div>' +
      '<div class="docgrid">' + [
        ['camera', 'Foto wajah',  o.dok.wajah],
        ['idcard', 'KTP',         o.dok.ktp],
        ['file',   'Berkas lain', o.dok.berkas],
      ].map(([i, t, ada]) =>
        '<button class="doc' + (ada ? ' filled' : '') + '" data-act="soon">' + ic(i, 25) + '<span>' + t + '</span></button>'
      ).join('') +
        '<button class="doc add" data-act="soon">' + ic('plus', 25) + '<span>Tambah</span></button>' +
      '</div>' +

    '</div></div></div>';
}

VIEWS.tenant = rid => profilPenghuni(room(rid), false);
VIEWS.ex     = xid => profilPenghuni(mantan(xid), true);
```

(Tombol WhatsApp, Chat, dan grid dokumen masih `soon` di sini; Tugas 5 dan 6 menggantinya.)

- [ ] **Langkah 9: Router**

Ganti `depth` di bagian 9 dengan:

```js
/* Riwayat dan catatan satu tingkat di bawah pemiliknya: properti (1) → 2, kamar (2) → 3 */
const lingkupDalam = r => diKamar(r.split('/')[1] || '') ? 3 : 2;
const depth = r =>
  isModal(r) ? 9 :
  r.startsWith('ex/') ? 4 :
  (r.startsWith('hist/') || r.startsWith('notes/')) ? lingkupDalam(r) :
  r.startsWith('tenant/') ? 3 :
  r.startsWith('room/')   ? 2 :
  (r.startsWith('prop/') || r.startsWith('filter/')) ? 1 : 0;
```

Di `render(rute)`, sebelum `return (VIEWS[nama] || VIEWS.home)();`, tambahkan:

```js
  if (nama === 'hist')   return VIEWS.hist(arg);
  if (nama === 'ex')     return VIEWS.ex(arg);
```

- [ ] **Langkah 10: Jalankan uji**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: empat langkah `R3 riwayat…` / `R3 kamar tanpa riwayat…` / `R3 mantan penghuni…` `ok`; langkah lama tetap `ok`; `Tidak ada error runtime.`

- [ ] **Langkah 11: Commit**

```bash
git add docs/superpowers/mockups/kosmanager-mobile.html docs/superpowers/mockups/_smoke.cjs
git commit -m "feat(mockup): riwayat penghuni dan profil mantan penghuni" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tugas 3: Catatan internal

**Files:**
- Modify: `HTML` bagian 2 (data), bagian 6 (`VIEWS.prop`, `VIEWS.room`, layar baru), bagian 7 (`FORM`, `fArea`), bagian 8 (`SHEETS.catatan`, `openSheet`), bagian 9 (`render`), bagian 10 (penangan klik, penyimpan), lapis CSS `screens`
- Test: `SMOKE`

- [ ] **Langkah 1: Tulis uji yang gagal**

```js
step('R3 catatan: daftar properti terurut terbaru', async () => {
  await hash('#/prop/p1');
  rawClick(qa('.ptab')[2]);
  const baris = q('[data-go="notes/p1"]');
  if (!baris) throw new Error('baris Catatan internal tidak bisa ditekan');
  if (!baris.textContent.includes('2 catatan')) throw new Error('ringkasan: ' + baris.textContent.replace(/\s+/g, ' '));
  await nav(baris);
  const c = qa('.catat');
  if (c.length !== 2) throw new Error('harusnya 2 catatan, dapat ' + c.length);
  if (!c[0].textContent.includes('22 Sep 2026')) throw new Error('urutan: ' + c[0].textContent.slice(0, 40));
  if (!q('.fab')) throw new Error('FAB tambah catatan hilang');
  return c.length + ' catatan, FAB=' + q('.fab').textContent.trim();
});

step('R3 catatan kosong tidak bisa disimpan', () => {
  rawClick(q('.fab'));
  if (!q('.sheet') || !q('.sheet').textContent.includes('Catatan baru')) throw new Error('sheet catatan baru tidak muncul');
  rawClick(q('.sheet [data-simpan]'));
  if (tutup()) throw new Error('sheet menutup padahal isi kosong');
  if (!q('.sheet .note.bad')) throw new Error('pesan galat tidak muncul');
});

step('R3 catatan baru: tanggal dari pemilih, tersimpan paling atas', () => {
  rawClick(q('.sheet [data-sheet="tanggal:catatan.tgl"]'));
  rawClick(qa('[data-scalbody] .cal-day[data-set]')[27]);   // 28 Sep 2026
  if (!q('.sheet').textContent.includes('Catatan baru')) throw new Error('tidak kembali ke sheet catatan');
  ketik('.sheet [data-bind="catatan.teks"]', 'Cat ulang pagar depan minggu depan.');
  rawClick(q('.sheet [data-simpan]'));
  if (!tutup()) throw new Error('sheet tidak menutup setelah simpan');
  const c = qa('.catat');
  if (c.length !== 3) throw new Error('harusnya 3, dapat ' + c.length);
  const t = c[0].textContent.replace(/\s+/g, ' ');
  if (!t.includes('Cat ulang pagar') || !t.includes('28 Sep 2026')) throw new Error(t);
  return t.trim();
});

step('R3 ubah catatan lalu hapus dua langkah', () => {
  rawClick(qa('.catat').find(c => c.textContent.includes('Pompa air')));
  if (!q('.sheet').textContent.includes('Ubah catatan')) throw new Error('sheet ubah tidak muncul');
  if (q('.sheet [data-bind="catatan.teks"]').value.indexOf('Pompa air') !== 0) throw new Error('isi lama tidak terisi');
  rawClick(q('.sheet [data-hapuscat]'));
  if (tutup()) throw new Error('sekali ketuk langsung menghapus');
  if (!q('.sheet [data-hapuscat]').textContent.includes('sekali lagi')) throw new Error('tombol konfirmasi tidak berubah');
  rawClick(q('.sheet [data-hapuscat]'));
  if (!tutup()) throw new Error('sheet tidak menutup setelah hapus');
  if (qa('.catat').length !== 2) throw new Error('jumlah catatan: ' + qa('.catat').length);
  if (A().includes('Pompa air')) throw new Error('catatan masih tampil');
  return 'terhapus setelah konfirmasi';
});

step('R3 catatan kamar dari tab Lainnya kamar', async () => {
  await hash('#/room/p1-101');
  rawClick(qa('.ptab')[3]);
  const b = q('[data-go="notes/p1-101"]');
  if (!b || !b.textContent.includes('1 catatan')) throw new Error('baris catatan kamar salah');
  await nav(b);
  if (qa('.catat').length !== 1) throw new Error('harusnya 1 catatan kamar');
  if (!A().includes('Catatan kamar')) throw new Error(A().slice(0, 60));
  await hash('#/room/p1-101');
  rawClick(qa('.ptab')[0]);          // kembalikan tab supaya langkah lain tidak terpengaruh
});
```

- [ ] **Langkah 2: Jalankan, pastikan gagal**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: `GAGAL R3 catatan: daftar properti …` dengan `baris Catatan internal tidak bisa ditekan`.

- [ ] **Langkah 3: Data catatan**

Di bagian 2, setelah helper `mantanDi`, tambahkan:

```js
/* Catatan internal per properti dan per kamar */
const CATATAN = {
  p1: [
    { id: 'c1', tgl: '2026-09-22', teks: 'Token listrik lantai 2 diisi Rp450.000. Cek lagi akhir bulan.' },
    { id: 'c2', tgl: '2026-09-14', teks: 'Pompa air diservis Pak Darto. Garansi sampai Desember.' },
  ],
  'p1-101': [
    { id: 'c3', tgl: '2026-09-02', teks: 'Kunci cadangan dipegang penjaga kos. AC terakhir dicuci Agustus.' },
  ],
};
let nomorCatatan = 3;
const catatanDi = scope => (CATATAN[scope] || []).slice().sort((a, b) => b.tgl.localeCompare(a.tgl));
const ringkasCatatan = scope => {
  const c = catatanDi(scope);
  if (!c.length) return 'Belum ada catatan';
  const t = c[0].teks;
  return c.length + ' catatan · ' + (t.length > 30 ? t.slice(0, 30).trim() + '…' : t);
};
```

- [ ] **Langkah 4: Sambungkan tautan catatan**

`VIEWS.prop` → `tabLain`:

```js
    navRow('note',  'Catatan internal', ringkasCatatan(pid), 'notes/' + pid) +
```

`VIEWS.room` → `tabLain`:

```js
    navRow('note',   'Catatan kamar',    ringkasCatatan(r.id), 'notes/' + r.id) +
```

- [ ] **Langkah 5: Layar catatan**

Setelah `VIEWS.hist`, tambahkan:

```js
VIEWS.notes = scope => {
  const list = catatanDi(scope);
  const judul = diKamar(scope) ? 'Catatan kamar' : 'Catatan internal';
  return chrome({ back: true, title: judul }) +
    '<div class="scroll">' + bigtitle(judul) +
      '<div data-tabbody>' +
        '<div class="sechead"><h2>' + esc(namaLingkup(scope)) + '</h2>' +
          '<span class="count">' + list.length + '</span></div>' +
        (list.length
          ? '<div class="stack-v stagger">' + list.map(c =>
              '<button class="card tap catat" data-sheet="catatan:' + scope + '|' + c.id + '">' +
                '<span class="catat-tgl">' + tgl(c.tgl) + '</span>' +
                '<span class="catat-teks">' + esc(c.teks) + '</span>' +
              '</button>').join('') + '</div>'
          : emptyBox('Belum ada catatan',
              'Simpan hal kecil yang gampang lupa: servis, kunci cadangan, janji dengan penghuni.')) +
      '</div>' +
    '</div>' +
    '<button class="fab" data-sheet="catatan:' + scope + '|new">' + ic('plus', 20) +
      '<span class="fab-label">Catatan</span></button>';
};
```

Di `render(rute)` tambahkan:

```js
  if (nama === 'notes')  return VIEWS.notes(arg);
```

- [ ] **Langkah 6: CSS kartu catatan**

Di akhir lapis `screens` (sebelum `}` penutup `@layer screens`), tambahkan:

```css
  /* Catatan internal — bukan .note, yang sudah dipakai kotak peringatan */
  .catat { display: flex; flex-direction: column; gap: 6px; width: 100%; padding: 15px 16px; text-align: left; }
  .catat-tgl {
    font-size: 11px; font-weight: var(--w-label); letter-spacing: .08em; text-transform: uppercase;
    color: var(--ink-3); font-variant-numeric: tabular-nums;
  }
  .catat-teks { font-size: 14.5px; line-height: 1.5; color: var(--ink); overflow-wrap: anywhere; }
```

- [ ] **Langkah 7: Isian textarea dan status formulir**

Di objek `FORM`, tambahkan kunci:

```js
  catatan: { kunci: '', scope: '', id: '', tgl: '2026-09-27', teks: '', yakin: false, galat: '' },
```

Setelah `fDate`, tambahkan:

```js
function fArea(o) {
  const v = getF(o.path) == null ? '' : String(getF(o.path));
  return '<label class="field">' +
    '<span class="field-lbl">' + o.lbl + reqMark(o.req) + '</span>' +
    '<textarea class="field-in" data-bind="' + o.path + '" rows="4"' +
      (o.max ? ' maxlength="' + o.max + '"' : '') +
      ' placeholder="' + esc(o.ph || '') + '">' + esc(v) + '</textarea>' +
    (o.max ? '<span class="field-foot"><span class="cnt" data-cnt="' + o.path + '">' +
      v.length + '/' + o.max + '</span></span>' : '') +
  '</label>';
}
```

- [ ] **Langkah 8: Sheet catatan**

Di objek `SHEETS`, tambahkan:

```js
  catatan: arg => {
    const F = FORM.catatan;
    if (F.kunci !== arg) {
      const [scope, id] = arg.split('|');
      const ada = (CATATAN[scope] || []).find(c => c.id === id);
      Object.assign(F, { kunci: arg, scope, id: ada ? id : '', tgl: ada ? ada.tgl : '2026-09-27',
                         teks: ada ? ada.teks : '', yakin: false, galat: '' });
    }
    return {
      title: F.id ? 'Ubah catatan' : 'Catatan baru',
      sub: namaLingkup(F.scope),
      html: '<div class="fstack" style="padding:6px 10px 4px">' +
        fDate({ lbl: 'Tanggal', path: 'catatan.tgl' }) +
        fArea({ lbl: 'Isi catatan', req: 1, path: 'catatan.teks', ph: 'Mis. AC kamar 104 diservis', max: 280 }) +
        (F.galat ? '<div class="note bad">' + ic('warn', 18) + '<span>' + esc(F.galat) + '</span></div>' : '') +
        (F.id ? '<button class="btn block' + (F.yakin ? ' danger' : '') + '" data-hapuscat>' + ic('trash', 17) +
                (F.yakin ? ' Ketuk sekali lagi untuk menghapus' : ' Hapus catatan') + '</button>' : '') +
      '</div>',
      foot: [['Batal', ''], ['Simpan', F.id ? 'Catatan diperbarui' : 'Catatan tersimpan']],
    };
  },
```

Di `openSheet`, tepat setelah `const arg = …;`, tambahkan:

```js
  /* Dibuka dari luar (bukan kembali dari pemilih): mulai dari data tersimpan, bukan sisa ketikan */
  if (!kembali && FORM[key] && 'kunci' in FORM[key]) FORM[key].kunci = '';
```

CSS tombol bahaya, di lapis `components` setelah `.btn.block { … }`:

```css
  .btn.danger { background: var(--bad-tint); color: var(--bad); }
```

- [ ] **Langkah 9: Penyimpan nyata**

Di bagian 10, tepat sebelum `phone.addEventListener('click', …)`, tambahkan:

```js
/* Penyimpan per sheet/formulir. Mengembalikan false = tahan, jangan tutup. */
const PENYIMPAN = {
  'sheet:catatan': () => {
    const F = FORM.catatan;
    const teks = F.teks.trim();
    if (!teks) { F.galat = 'Tulis isi catatan dulu.'; segarkanSheet(); return false; }
    const daftar = CATATAN[F.scope] || (CATATAN[F.scope] = []);
    const ada = daftar.find(c => c.id === F.id);
    if (ada) Object.assign(ada, { tgl: F.tgl, teks });
    else daftar.push({ id: 'c' + (++nomorCatatan), tgl: F.tgl, teks });
    F.kunci = '';
    segarkanForm();
    return true;
  },
};
```

Ganti blok `if (t.dataset.simpan) { … }` di penangan klik dengan:

```js
  if (t.dataset.simpan) {
    const kunci = sheetEl && sheetSpec ? 'sheet:' + specSheet()[0] : 'form:' + (saatIni || '').split('/')[1];
    const simpan = PENYIMPAN[kunci];
    if (simpan && simpan() === false) return;
    const pesan = t.dataset.simpan;
    if (sheetEl) closeSheet(); else history.back();
    toast(pesan);
    return;
  }
```

Sebelum baris `if (t.hasAttribute('data-tutup'))`, tambahkan:

```js
  if (t.hasAttribute('data-hapuscat')) {
    const F = FORM.catatan;
    if (!F.yakin) { F.yakin = true; segarkanSheet(); return; }
    CATATAN[F.scope] = (CATATAN[F.scope] || []).filter(c => c.id !== F.id);
    F.kunci = '';
    closeSheet(); segarkanForm(); toast('Catatan dihapus');
    return;
  }
```

Tambahkan `[data-hapuscat]` ke daftar selektor `closest()`:

```js
    '[data-scal],[data-cal],[data-step],[data-tutup],[data-simpan],[data-hapuscat]');
```

- [ ] **Langkah 10: Jalankan uji**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: lima langkah `R3 catatan…` / `R3 ubah catatan…` `ok`; langkah ronde 2 `simpan menutup modal …` dan `FAB properti membuka sheet tambah kamar` tetap `ok`; `Tidak ada error runtime.`

- [ ] **Langkah 11: Commit**

```bash
git add docs/superpowers/mockups/kosmanager-mobile.html docs/superpowers/mockups/_smoke.cjs
git commit -m "feat(mockup): catatan internal bertanggal per properti dan kamar" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tugas 4: Edit penghuni

**Files:**
- Modify: `HTML` bagian 3 (`normHp`, `hpValid`), bagian 5 (`chrome`), bagian 6 (`profilPenghuni`), bagian 7 (`FORM`, `formEdit`, `VIEWS.form`, `mulaiForm`), bagian 9 (`terapkanHash`), bagian 10 (`PENYIMPAN`)
- Test: `SMOKE`

- [ ] **Langkah 1: Tulis uji yang gagal**

```js
step('R3 ikon ubah membuka formulir terisi data penghuni', async () => {
  await hash('#/tenant/p1-104');
  await nav(q('[data-form="edit:p1-104"]'));
  if (!atas().classList.contains('is-modal')) throw new Error('bukan modal');
  if (!A().includes('Ubah data penghuni')) throw new Error(A().slice(0, 60));
  if (q('[data-bind="edit.nama"]').value !== 'Maria') throw new Error('nama tidak terisi');
  return 'HP awal ' + q('[data-bind="edit.hp"]').value;
});

step('R3 HP tidak valid menahan simpan', async () => {
  ketik('[data-bind="edit.hp"]', '0812');
  rawClick(q('[data-simpan]'));
  await tick(); bersih();
  if (!atas().classList.contains('is-modal')) throw new Error('modal tertutup padahal HP tidak valid');
  if (!A().includes('No. HP belum valid')) throw new Error('pesan galat HP tidak muncul');
});

step('R3 nama kosong menahan simpan', async () => {
  ketik('[data-bind="edit.hp"]', '0812 7777 8888');
  ketik('[data-bind="edit.nama"]', '   ');
  rawClick(q('[data-simpan]'));
  await tick(); bersih();
  if (!atas().classList.contains('is-modal')) throw new Error('modal tertutup padahal nama kosong');
  if (!A().includes('Nama lengkap wajib diisi')) throw new Error('pesan galat nama tidak muncul');
});

step('R3 simpan memperbarui layar penghuni di bawahnya', async () => {
  ketik('[data-bind="edit.nama"]', 'Maria Goreti');
  rawClick(q('[data-simpan]'));
  await tick(); bersih();
  if (qa('.screen').length !== 1) throw new Error('masih ada ' + qa('.screen').length + ' layar');
  if (!A().includes('Maria Goreti')) throw new Error('layar dasar tidak diperbarui');
  if (!A().includes('0812 7777 8888')) throw new Error('HP baru tidak tampil');
  if (!q('.toast') || !q('.toast').textContent.includes('Data penghuni disimpan')) throw new Error('toast salah');
  return 'Maria -> Maria Goreti';
});
```

- [ ] **Langkah 2: Jalankan, pastikan gagal**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: `GAGAL R3 ikon ubah membuka formulir …` dengan `elemen yang diklik tidak ditemukan`.

- [ ] **Langkah 3: Aturan nomor HP**

Di bagian 3, setelah `inisial`, tambahkan (setara `normalizePhone` / `isValidPhone` di `src/composables/useWAReminder.ts`):

```js
const normHp  = hp => { let p = String(hp || '').replace(/\D/g, ''); if (p.startsWith('0')) p = '62' + p.slice(1); return p; };
const hpValid = hp => normHp(hp).length >= 8;
```

- [ ] **Langkah 4: `chrome` menerima aksi berupa formulir**

Ganti pemetaan `actions` di `chrome(o)` dengan:

```js
    (o.actions || []).map(a =>
      '<button class="iconbtn" ' + (a.form ? 'data-form="' + a.form + '"' : 'data-act="' + a.act + '"') +
        ' aria-label="' + esc(a.label) + '">' + ic(a.icon) + '</button>'
    ).join('') +
```

Di `profilPenghuni`, aksi penghuni aktif menjadi:

```js
                  actions: bekas ? [] : [{ icon: 'edit', form: 'edit:' + o.id, label: 'Ubah data penghuni' }] }) +
```

- [ ] **Langkah 5: Formulir ubah**

Di objek `FORM`, tambahkan:

```js
  edit:    { rid: '', nama: '', hp: '', kelamin: '', asal: '', kerja: '', darurat: '', daruratHp: '', galat: '' },
```

Setelah `formProp()`, tambahkan:

```js
/* ── Ubah data penghuni: hanya data diri dan kontak; harga & masa tinggal lewat Pengaturan sewa ── */
function formEdit() {
  const F = FORM.edit;
  return '<header class="fhead">' +
      '<button class="iconbtn" data-back aria-label="Tutup">' + ic('x') + '</button>' +
      '<h1>Ubah data penghuni</h1></header>' +
    '<div class="scroll isform"><div data-tabbody>' +
      fSec('users', 'Data diri') +
      '<div class="fstack">' +
        fText({ lbl: 'Nama lengkap', req: 1, path: 'edit.nama', ph: 'Nama sesuai KTP', max: 40 }) +
        '<div class="fgrid">' +
          fPick({ lbl: 'Jenis kelamin', path: 'edit.kelamin', list: 'kelamin', ph: 'Pilih',
                  label: v => v === 'L' ? 'Laki-laki' : v === 'P' ? 'Perempuan' : '' }) +
          fText({ lbl: 'Asal', path: 'edit.asal', ph: 'Kota asal' }) +
        '</div>' +
        fText({ lbl: 'Pekerjaan', path: 'edit.kerja', ph: 'Pekerjaan' }) +
      '</div>' +
      fSec('wa', 'Kontak') +
      '<div class="fstack">' +
        fText({ lbl: 'No. HP', req: 1, path: 'edit.hp', ph: '0812 3456 7890', mode: 'tel',
                help: 'Dipakai untuk pesan WhatsApp' }) +
        '<div class="fgrid">' +
          fText({ lbl: 'Kontak darurat', path: 'edit.darurat', ph: 'Mis. Orang tua' }) +
          fText({ lbl: 'No. HP darurat', path: 'edit.daruratHp', ph: '0813 …', mode: 'tel' }) +
        '</div>' +
      '</div>' +
      (F.galat ? '<div class="note bad" style="margin-top:15px">' + ic('warn', 18) +
        '<span>' + esc(F.galat) + '</span></div>' : '') +
    '</div></div>' +
    '<div class="ffoot">' +
      '<button class="btn grow" data-back>Batal</button>' +
      '<button class="btn primary grow" data-simpan="Data penghuni disimpan">Simpan</button>' +
    '</div>';
}
```

Ganti `VIEWS.form`:

```js
VIEWS.form = jenis => jenis === 'tenant' ? formTenant() : jenis === 'edit' ? formEdit() : formProp();
```

Di `mulaiForm`, ganti `} else {` terakhir dengan:

```js
  } else if (jenis === 'edit') {
    const r = room(arg);
    Object.assign(FORM.edit, { rid: r.id, nama: r.nama, hp: r.hp, kelamin: r.kelamin, asal: r.asal,
                               kerja: r.kerja, darurat: r.darurat, daruratHp: r.daruratHp, galat: '' });
  } else {
```

- [ ] **Langkah 6: Penyimpan formulir ubah**

Di objek `PENYIMPAN`, tambahkan:

```js
  'form:edit': () => {
    const F = FORM.edit;
    if (!F.nama.trim()) { F.galat = 'Nama lengkap wajib diisi.'; segarkanForm(); return false; }
    if (!hpValid(F.hp)) {
      F.galat = 'No. HP belum valid. Tulis minimal 8 digit, mis. 0812 3456 7890.';
      segarkanForm(); return false;
    }
    Object.assign(room(F.rid), {
      nama: F.nama.trim(), hp: F.hp.trim(), kelamin: F.kelamin, asal: F.asal.trim(),
      kerja: F.kerja.trim(), darurat: F.darurat.trim(), daruratHp: F.daruratHp.trim(),
    });
    F.galat = '';
    dasarBasi = true;
    return true;
  },
```

- [ ] **Langkah 7: Layar di bawah modal digambar ulang setelah simpan**

Di bagian 9, ubah `let modalEl = null, baseEl = null;` menjadi:

```js
let modalEl = null, baseEl = null;
let dasarBasi = false;      /* data layar di bawah modal berubah; gambar ulang saat modal ditutup */
```

Di `terapkanHash`, cabang penutupan modal, tepat setelah `b.classList.remove('is-stacked');`, tambahkan:

```js
    if (dasarBasi) { dasarBasi = false; b.innerHTML = render(rute); aktifkan(b); }
```

- [ ] **Langkah 8: Jalankan uji**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: empat langkah `R3` baru `ok`; `R3 mantan penghuni: mode baca saja` tetap `ok`; `Tidak ada error runtime.`

- [ ] **Langkah 9: Commit**

```bash
git add docs/superpowers/mockups/kosmanager-mobile.html docs/superpowers/mockups/_smoke.cjs
git commit -m "feat(mockup): ubah data penghuni dengan validasi nomor HP" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tugas 5: Unggah foto dan dokumen

**Files:**
- Modify: `HTML` bagian 2 (`DOK`, `SLOT`, `pemilik`), bagian 6 (`profilPenghuni` → grid dokumen), bagian baru "Berkas" setelah bagian TOAST, bagian 9 (`terapkanHash`), bagian 10 (penangan klik, `keydown`), lapis CSS `screens`
- Test: `SMOKE`

- [ ] **Langkah 1: Tulis uji yang gagal**

```js
/* Berkas palsu untuk <input type=file>: jsdom tak bisa membuka pemilih sungguhan */
const suntikBerkas = (nama, tipe) => {
  const inp = D.getElementById('berkas-in');
  if (!inp) throw new Error('input berkas tidak dibuat');
  Object.defineProperty(inp, 'files', { value: [new window.File(['x'], nama, { type: tipe })], configurable: true });
  inp.dispatchEvent(new window.Event('change'));
  return inp;
};
let urlDilepas = 0;

step('R3 unggah KTP lewat pemilih berkas', async () => {
  window.URL.createObjectURL = f => 'blob:uji/' + f.name;
  window.URL.revokeObjectURL = () => { urlDilepas++; };
  await hash('#/tenant/p1-102');
  const ktp = q('[data-dok="p1-102|ktp|"]');
  if (!ktp || ktp.classList.contains('filled')) throw new Error('KTP harusnya masih kosong');
  rawClick(ktp);
  const inp = D.getElementById('berkas-in');
  if (!inp) throw new Error('input berkas tidak dibuat');
  if (inp.getAttribute('capture') !== 'environment') throw new Error('KTP harus pakai kamera belakang');
  if (inp.accept !== 'image/*') throw new Error('accept: ' + inp.accept);
  suntikBerkas('ktp-fahril.jpg', 'image/jpeg');
  const baru = q('[data-dok="p1-102|ktp|"]');
  if (!baru.classList.contains('has-img')) throw new Error('ubin tidak berubah jadi thumbnail');
  if (baru.querySelector('img').getAttribute('src') !== 'blob:uji/ktp-fahril.jpg') throw new Error('src salah');
  return 'thumbnail ' + baru.querySelector('img').getAttribute('src');
});

step('R3 penampil: buka, ganti, hapus', () => {
  rawClick(q('[data-dok="p1-102|ktp|"]'));
  if (!q('.viewer')) throw new Error('penampil tidak terbuka');
  if (q('.viewer-img').getAttribute('src') !== 'blob:uji/ktp-fahril.jpg') throw new Error('gambar penampil salah');
  rawClick(q('[data-vganti]'));
  suntikBerkas('ktp-baru.jpg', 'image/jpeg');
  if (q('.viewer')) throw new Error('penampil tidak menutup setelah ganti');
  if (urlDilepas !== 1) throw new Error('URL lama tidak dilepas: ' + urlDilepas);
  if (q('[data-dok="p1-102|ktp|"] img').getAttribute('src') !== 'blob:uji/ktp-baru.jpg') throw new Error('gambar tidak terganti');
  rawClick(q('[data-dok="p1-102|ktp|"]'));
  rawClick(q('[data-vhapus]'));
  if (q('.viewer')) throw new Error('penampil tidak menutup setelah hapus');
  if (q('[data-dok="p1-102|ktp|"]').classList.contains('filled')) throw new Error('ubin masih terisi');
  if (urlDilepas !== 2) throw new Error('URL tidak dilepas saat hapus: ' + urlDilepas);
  return 'ganti + hapus, ' + urlDilepas + ' URL dilepas';
});

step('R3 tambah PDF sebagai berkas lain', () => {
  rawClick(q('[data-dok="p1-102|lain|new"]'));
  const inp = D.getElementById('berkas-in');
  if (inp.hasAttribute('capture')) throw new Error('berkas lain tidak boleh memaksa kamera');
  if (!inp.accept.includes('application/pdf')) throw new Error('PDF tidak diterima: ' + inp.accept);
  suntikBerkas('kontrak.pdf', 'application/pdf');
  const ubin = q('[data-dok="p1-102|lain|0"]');
  if (!ubin || !ubin.textContent.includes('kontrak.pdf')) throw new Error('ubin PDF tidak muncul');
  if (ubin.querySelector('img')) throw new Error('PDF tidak boleh jadi thumbnail gambar');
  if (A().includes('Kelola')) throw new Error('tautan Kelola masih ada');
  return 'kontrak.pdf';
});
```

- [ ] **Langkah 2: Jalankan, pastikan gagal**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: `GAGAL R3 unggah KTP …` dengan `KTP harusnya masih kosong` (selektor `data-dok` belum ada).

- [ ] **Langkah 3: Data berkas**

Di bagian 2, setelah blok `CATATAN` dan helpernya, tambahkan:

```js
/* Pemilik berkas: penghuni aktif (id kamar) atau mantan penghuni (id x…) */
const pemilik = id => room(id) || mantan(id);

/* Berkas per pemilik, hanya di memori. Isian awal "contoh" mewakili data dummy
   yang tidak punya gambar sungguhan. */
const DOK = {};
function dokOf(o) {
  if (!DOK[o.id]) DOK[o.id] = {
    wajah: o.dok.wajah  ? { contoh: true, nama: 'foto-wajah.jpg',      tipe: 'image', url: '' } : null,
    ktp:   o.dok.ktp    ? { contoh: true, nama: 'ktp.jpg',             tipe: 'image', url: '' } : null,
    lain:  o.dok.berkas ? [{ contoh: true, nama: 'perjanjian-sewa.pdf', tipe: 'pdf',   url: '' }] : [],
  };
  return DOK[o.id];
}
const SLOT = {
  wajah: { i: 'camera', t: 'Foto wajah',  accept: 'image/*',                 capture: 'user' },
  ktp:   { i: 'idcard', t: 'KTP',         accept: 'image/*',                 capture: 'environment' },
  lain:  { i: 'file',   t: 'Berkas lain', accept: 'image/*,application/pdf', capture: '' },
};
const berkasDi = (id, slot, idx) => {
  const d = dokOf(pemilik(id));
  return slot === 'lain' ? (idx === 'new' ? null : d.lain[+idx]) : d[slot];
};
```

- [ ] **Langkah 4: Ubin dokumen**

Di bagian 5, setelah `emptyBox`, tambahkan:

```js
function ubinDok(o, slot, idx) {
  const S = SLOT[slot];
  const ref = o.id + '|' + slot + '|' + (idx == null ? '' : idx);
  const b = berkasDi(o.id, slot, idx == null ? '' : String(idx));
  if (!b) return '<button class="doc" data-dok="' + ref + '">' + ic(S.i, 25) + '<span>' + S.t + '</span></button>';
  const gambar = b.url && b.tipe === 'image';
  return '<button class="doc filled' + (gambar ? ' has-img' : '') + '" data-dok="' + ref + '">' +
    (gambar ? '<img class="doc-img" src="' + esc(b.url) + '" alt="">' : ic(b.tipe === 'pdf' ? 'file' : S.i, 25)) +
    '<span>' + esc(slot === 'lain' ? b.nama : S.t) + '</span></button>';
}

const gridDok = o => {
  const lain = dokOf(o).lain;
  return '<div class="docgrid">' + ubinDok(o, 'wajah') + ubinDok(o, 'ktp') +
    lain.map((_, i) => ubinDok(o, 'lain', i)).join('') +
    '<button class="doc add" data-dok="' + o.id + '|lain|new">' + ic('plus', 25) +
      '<span>' + (lain.length ? 'Tambah' : 'Berkas lain') + '</span></button>' +
  '</div>';
};
```

Di `profilPenghuni`, ganti seluruh bagian dari `'<div class="sechead"><h2>Foto &amp; dokumen</h2>' +` sampai penutup `'</div>' +` milik `docgrid` dengan:

```js
      '<div class="sechead"><h2>Foto &amp; dokumen</h2></div>' +
      gridDok(o) +
```

- [ ] **Langkah 5: Pemilih berkas dan penampil**

Setelah bagian `8. TOAST` (setelah fungsi `toast`), tambahkan:

```js
/* ═══════════════════════════════════════════════
   8b. BERKAS — pemilih sungguhan, simpan di memori
   ═══════════════════════════════════════════════ */
let tujuanBerkas = null, penampilEl = null;

function inputBerkas() {
  let el = document.getElementById('berkas-in');
  if (!el) {
    el = document.createElement('input');
    el.type = 'file'; el.id = 'berkas-in'; el.hidden = true;
    el.addEventListener('change', () => {
      const f = el.files && el.files[0];
      if (f && tujuanBerkas) terimaBerkas(tujuanBerkas, f);
      el.value = '';
    });
    document.body.append(el);
  }
  return el;
}

function pilihBerkas(id, slot, idx) {
  const S = SLOT[slot];
  const el = inputBerkas();
  el.accept = S.accept;
  if (S.capture) el.setAttribute('capture', S.capture); else el.removeAttribute('capture');
  tujuanBerkas = { id, slot, idx };
  el.click();
}

const lepasUrl = b => { if (b && b.url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(b.url); };

function terimaBerkas(tj, f) {
  const d = dokOf(pemilik(tj.id));
  const baru = { nama: f.name, tipe: f.type === 'application/pdf' ? 'pdf' : 'image',
                 url: typeof URL.createObjectURL === 'function' ? URL.createObjectURL(f) : '' };
  if (tj.slot !== 'lain') { lepasUrl(d[tj.slot]); d[tj.slot] = baru; }
  else if (tj.idx === 'new') d.lain.push(baru);
  else { lepasUrl(d.lain[+tj.idx]); d.lain[+tj.idx] = baru; }
  tujuanBerkas = null;
  tutupPenampil();
  segarkanForm();
  toast(tj.slot === 'lain' && tj.idx === 'new' ? 'Berkas ditambahkan' : 'Berkas disimpan');
}

function bukaPenampil(id, slot, idx) {
  tutupPenampil();
  const o = pemilik(id);
  const b = berkasDi(id, slot, idx);
  const S = SLOT[slot];
  const ref = id + '|' + slot + '|' + idx;
  penampilEl = document.createElement('div');
  penampilEl.className = 'viewer';
  penampilEl.setAttribute('role', 'dialog');
  penampilEl.setAttribute('aria-label', S.t + ' ' + o.nama);
  penampilEl.innerHTML =
    '<div class="viewer-top">' +
      '<button class="iconbtn" data-vtutup aria-label="Tutup">' + ic('x') + '</button>' +
      '<div class="viewer-judul">' + esc(slot === 'lain' ? b.nama : S.t) + '<small>' + esc(o.nama) + '</small></div>' +
    '</div>' +
    '<div class="viewer-body">' + (b.url && b.tipe === 'image'
      ? '<img class="viewer-img" src="' + esc(b.url) + '" alt="' + esc(S.t + ' ' + o.nama) + '">'
      : '<div class="viewer-file">' + ic(b.tipe === 'pdf' ? 'file' : S.i, 44) +
          '<b>' + esc(b.nama) + '</b>' +
          '<span>' + (b.contoh ? 'Berkas contoh, tidak ada gambar aslinya.' : 'Pratinjau PDF tidak tersedia di mockup.') +
          '</span></div>') +
    '</div>' +
    '<div class="viewer-foot">' +
      '<button class="btn" data-vganti="' + ref + '">' + ic('camera', 17) + ' Ganti</button>' +
      '<button class="btn danger" data-vhapus="' + ref + '">' + ic('trash', 17) + ' Hapus</button>' +
    '</div>';
  phone.append(penampilEl);
}

function tutupPenampil() { if (penampilEl) { penampilEl.remove(); penampilEl = null; } }
```

Karena `phone` dideklarasikan dengan `const` di bagian 9, fungsi-fungsi ini hanya boleh **dipanggil** setelah halaman selesai dimuat (lewat klik); mendeklarasikannya di atas bagian 9 tetap aman.

- [ ] **Langkah 6: Penangan klik dan Escape**

Di penangan klik, sebelum `if (t.dataset.go)`, tambahkan:

```js
  if (t.dataset.dok) {
    const [id, slot, idx] = t.dataset.dok.split('|');
    if (berkasDi(id, slot, idx)) bukaPenampil(id, slot, idx); else pilihBerkas(id, slot, idx);
    return;
  }
  if (t.hasAttribute('data-vtutup')) { tutupPenampil(); return; }
  if (t.dataset.vganti) { const [id, slot, idx] = t.dataset.vganti.split('|'); pilihBerkas(id, slot, idx); return; }
  if (t.dataset.vhapus) {
    const [id, slot, idx] = t.dataset.vhapus.split('|');
    const d = dokOf(pemilik(id));
    if (slot === 'lain') lepasUrl(d.lain.splice(+idx, 1)[0]);
    else { lepasUrl(d[slot]); d[slot] = null; }
    tutupPenampil(); segarkanForm(); toast('Berkas dihapus');
    return;
  }
```

Daftar selektor `closest()` menjadi:

```js
    '[data-scal],[data-cal],[data-step],[data-tutup],[data-simpan],[data-hapuscat],' +
    '[data-dok],[data-vtutup],[data-vganti],[data-vhapus]');
```

Di penangan `keydown`, tepat setelah `if (e.key !== 'Escape') return;`, tambahkan:

```js
  if (penampilEl) { tutupPenampil(); return; }
```

Di `terapkanHash`, tepat setelah `if (rute === saatIni) return;`, tambahkan:

```js
  tutupPenampil();
```

- [ ] **Langkah 7: CSS ubin dan penampil**

Di aturan `.doc span` (lapis `screens`), ganti menjadi:

```css
  .doc span {
    font-size: 12.5px; font-weight: 600; letter-spacing: -.1px;
    max-width: 88%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
```

Di akhir lapis `screens`, tambahkan:

```css
  /* Thumbnail berkas: gambar memenuhi ubin, label jadi pil di bawah */
  .doc.has-img { justify-content: flex-end; overflow: hidden; padding-bottom: 10px; }
  .doc-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .doc.has-img span {
    position: relative; background: rgba(11,22,32,.62); color: #fff;
    padding: 3px 10px; border-radius: var(--r-pill);
  }

  /* Penampil berkas layar penuh */
  .viewer {
    position: absolute; inset: 0; z-index: 80;
    display: flex; flex-direction: column;
    background: #0B1620; color: #fff;
  }
  .viewer-top { display: flex; align-items: center; gap: 6px; padding: 48px 12px 8px; }
  .viewer-top .iconbtn { color: #fff; }
  .viewer-judul {
    flex: 1; min-width: 0; font-size: 16px; font-weight: 650;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .viewer-judul small { display: block; font-size: 12.5px; font-weight: 500; color: rgba(255,255,255,.6); }
  .viewer-body { flex: 1; min-height: 0; display: grid; place-items: center; padding: 12px 16px; }
  .viewer-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 12px; }
  .viewer-file { display: grid; justify-items: center; gap: 10px; text-align: center; color: rgba(255,255,255,.85); }
  .viewer-file b { font-size: 16px; font-weight: 650; overflow-wrap: anywhere; }
  .viewer-file span { font-size: 13px; color: rgba(255,255,255,.55); max-width: 26ch; }
  .viewer-foot { display: flex; gap: 10px; padding: 12px 20px max(20px, env(safe-area-inset-bottom)); }
  .viewer-foot .btn { flex: 1; height: 48px; background: rgba(255,255,255,.12); color: #fff; }
  .viewer-foot .btn.danger { background: var(--bad); color: #fff; }
```

- [ ] **Langkah 8: Jalankan uji**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: tiga langkah `R3` berkas `ok`; `buka detail penghuni` dan `semua kamar & penghuni dirender` tetap `ok`; audit class `ok`; `Tidak ada error runtime.`

- [ ] **Langkah 9: Commit**

```bash
git add docs/superpowers/mockups/kosmanager-mobile.html docs/superpowers/mockups/_smoke.cjs
git commit -m "feat(mockup): unggah foto dan dokumen penghuni dengan penampil" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tugas 6: Sheet WhatsApp

**Files:**
- Modify: `HTML` bagian 7 (`FORM`, template), bagian 8 (`SHEETS.wa`), bagian 6 (`profilPenghuni` tombol), bagian 10 (penangan klik), lapis CSS `components`
- Test: `SMOKE`

- [ ] **Langkah 1: Tulis uji yang gagal**

```js
step('R3 WhatsApp: template awal mengikuti status', async () => {
  await hash('#/tenant/p1-106');                    // Lisia, telat
  rawClick(q('[data-sheet="wa:p1-106|tagih"]'));
  const on = q('.sheet .fchip.is-on');
  if (!on || on.textContent !== 'Telat') throw new Error('template awal: ' + (on && on.textContent));
  const teks = q('.sheet [data-bind="wa.teks"]').value;
  const harap = 'Halo Lisia, tagihan kos kamar 106 bulan September 2026 sebesar Rp1.750.000 belum dilunasi';
  if (!teks.startsWith(harap)) throw new Error(teks);
  return teks.slice(0, 64) + '…';
});

step('R3 WhatsApp: ganti template lalu buka wa.me dengan teks terbaru', () => {
  rawClick(qa('.sheet .fchip').find(b => b.textContent === 'Kuitansi lunas'));
  if (!q('.sheet [data-bind="wa.teks"]').value.includes('sudah kami terima')) throw new Error('template tidak berganti');
  ketik('.sheet [data-bind="wa.teks"]', 'Halo Lisia, cek pesan ini ya');
  const a = q('.sheet [data-wa]');
  if (a.getAttribute('target') !== '_blank') throw new Error('tautan harus membuka tab baru');
  const cegah = e => e.preventDefault();      // jsdom tak bisa bernavigasi
  D.addEventListener('click', cegah);
  rawClick(a);
  D.removeEventListener('click', cegah);
  const harap = '?text=' + encodeURIComponent('Halo Lisia, cek pesan ini ya');
  if (!a.href.startsWith('https://wa.me/62812') || !a.href.endsWith(harap)) throw new Error(a.href);
  return a.href.slice(0, 40) + '…';
});

step('R3 WhatsApp: tombol Chat memilih template Kosong', () => {
  closeAll();
  qa('.is-out').forEach(el => el.remove());
  rawClick(q('[data-sheet="wa:p1-106|chat"]'));
  const on = q('.sheet .fchip.is-on');
  if (!on || on.textContent !== 'Kosong') throw new Error('template awal: ' + (on && on.textContent));
  if (q('.sheet [data-bind="wa.teks"]').value !== '') throw new Error('pesan harusnya kosong');
});

step('R3 WhatsApp: HP tidak valid menonaktifkan tombol', async () => {
  window.eval("room('p1-107').hp = '12'");
  await hash('#/tenant/p1-107');
  rawClick(q('[data-sheet="wa:p1-107|tagih"]'));
  if (q('.sheet [data-wa]')) throw new Error('tautan WhatsApp masih aktif');
  if (!q('.sheet .btn.is-off')) throw new Error('tombol nonaktif tidak tampil');
  if (!q('.sheet').textContent.includes('belum valid')) throw new Error('catatan merah tidak muncul');
  closeAll();
});

step('R3 WhatsApp mantan penghuni: tanpa template tagihan', async () => {
  await hash('#/ex/x1');
  rawClick(q('[data-sheet="wa:x1|tagih"]'));
  if (q('.sheet .fchip')) throw new Error('mantan penghuni tidak boleh diberi pilihan template');
  if (q('.sheet [data-bind="wa.teks"]').value !== '') throw new Error('pesan mantan harusnya kosong');
  closeAll();
});
```

- [ ] **Langkah 2: Jalankan, pastikan gagal**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: `GAGAL R3 WhatsApp: template awal …` dengan `elemen yang diklik tidak ditemukan`.

- [ ] **Langkah 3: Template dan status sheet**

Di objek `FORM`, tambahkan:

```js
  wa:      { kunci: '', id: '', tpl: 'kosong', teks: '' },
```

Setelah `LISTS`, tambahkan:

```js
/* Templat pesan; "telat" sama dengan DEFAULT_TEMPLATE di src/composables/useWAReminder.ts */
const TPL_WA = {
  tempo:  { l: 'Jatuh tempo',    t: 'Halo {nama}, tagihan kos kamar {kamar} bulan {bulan} sebesar {sisa} jatuh tempo pada {jatuh_tempo}. Mohon dilunasi tepat waktu. Terima kasih 🙏' },
  telat:  { l: 'Telat',          t: 'Halo {nama}, tagihan kos kamar {kamar} bulan {bulan} sebesar {sisa} belum dilunasi (jatuh tempo {jatuh_tempo}). Mohon segera dilunasi. Terima kasih 🙏' },
  lunas:  { l: 'Kuitansi lunas', t: 'Halo {nama}, pembayaran kos kamar {kamar} bulan {bulan} sebesar {jumlah} sudah kami terima. Terima kasih 🙏' },
  kosong: { l: 'Kosong',         t: '' },
};
const TPL_AWAL = { telat: 'telat', belum: 'tempo', lunas: 'lunas' };

function isiTemplate(kunci, o) {
  const tempo = TODAY.getFullYear() + '-' + String(TODAY.getMonth() + 1).padStart(2, '0') + '-' +
                String(o.tglTagih || 1).padStart(2, '0');
  const isi = {
    nama: o.nama, kamar: o.no, bulan: BLN_FULL[TODAY.getMonth()] + ' ' + TODAY.getFullYear(),
    sisa: rp(o.harga || 0), jumlah: rp(o.harga || 0), jatuh_tempo: tgl(tempo),
  };
  return TPL_WA[kunci].t.replace(/\{(\w+)\}/g, (m, k) => (k in isi ? isi[k] : m));
}

const urlWA = () => 'https://wa.me/' + normHp(pemilik(FORM.wa.id).hp) + '?text=' + encodeURIComponent(FORM.wa.teks);
```

- [ ] **Langkah 4: Sheet WhatsApp**

Di objek `SHEETS`, tambahkan:

```js
  wa: arg => {
    const [id, mode] = arg.split('|');
    const o = pemilik(id);
    const bekas = !room(id);
    const F = FORM.wa;
    if (F.kunci !== arg) {
      const tpl = bekas || mode === 'chat' ? 'kosong' : (TPL_AWAL[o.status] || 'kosong');
      Object.assign(F, { kunci: arg, id, tpl, teks: isiTemplate(tpl, o) });
    }
    const valid = hpValid(o.hp);
    return {
      title: 'Kirim WhatsApp',
      sub: o.nama + ' · Kamar ' + o.no,
      html: '<div style="padding:6px 10px 4px">' +
        (bekas ? '' : '<div class="quick" style="padding:0 0 14px">' + Object.keys(TPL_WA).map(k =>
          '<button class="fchip' + (F.tpl === k ? ' is-on' : '') + '" data-tpl="' + k + '">' +
            TPL_WA[k].l + '</button>').join('') + '</div>') +
        fArea({ lbl: 'Pesan', path: 'wa.teks', ph: 'Tulis pesan untuk ' + o.nama, max: 1000 }) +
        (valid
          ? '<p class="fnote" style="margin:10px 2px 0">Dikirim ke +' + normHp(o.hp) + '</p>'
          : '<div class="note bad" style="margin-top:12px">' + ic('warn', 18) +
            '<span>No. HP ' + esc(o.nama) + ' belum valid. Perbaiki lewat Ubah data penghuni.</span></div>') +
      '</div>' +
      '<div class="sheet-foot" style="padding:12px 10px 6px">' +
        (valid
          ? '<a class="btn primary" data-wa href="' + esc(urlWA()) + '" target="_blank" rel="noopener">' +
              ic('wa', 17) + ' Buka WhatsApp</a>'
          : '<span class="btn primary is-off" aria-disabled="true">' + ic('wa', 17) + ' Buka WhatsApp</span>') +
      '</div>',
    };
  },
```

CSS di lapis `components`, setelah `.btn.danger`:

```css
  a.btn { text-decoration: none; }
  .btn.is-off { opacity: .45; pointer-events: none; }
```

- [ ] **Langkah 5: Tombol profil**

Di `profilPenghuni`, tombol WhatsApp:

```js
          '<button class="btn primary" data-sheet="wa:' + o.id + '|tagih">' + ic('wa', 17) + ' WhatsApp</button>' +
```

dan tombol Chat:

```js
          '<dd class="act"><button class="btn sm brandsoft" data-sheet="wa:' + o.id + '|chat">' + ic('wa', 15) + ' Chat</button></dd></div>' +
```

- [ ] **Langkah 6: Penangan klik**

Sebelum `if (t.dataset.go)`, tambahkan:

```js
  if (t.dataset.tpl) {
    FORM.wa.tpl = t.dataset.tpl;
    FORM.wa.teks = isiTemplate(t.dataset.tpl, pemilik(FORM.wa.id));
    segarkanSheet(); return;
  }
  /* Isi pesan bisa diedit: pasang URL terbaru tepat sebelum tautan dibuka */
  if (t.hasAttribute('data-wa')) { t.href = urlWA(); return; }
```

Daftar selektor `closest()` menjadi:

```js
    '[data-scal],[data-cal],[data-step],[data-tutup],[data-simpan],[data-hapuscat],' +
    '[data-dok],[data-vtutup],[data-vganti],[data-vhapus],[data-tpl],[data-wa]');
```

- [ ] **Langkah 7: Jalankan uji**

Run: `node docs/superpowers/mockups/_smoke.cjs`
Expected: lima langkah `R3 WhatsApp…` `ok`; tidak ada `Not implemented: navigation` di keluaran; `Tidak ada error runtime.`

- [ ] **Langkah 8: Commit**

```bash
git add docs/superpowers/mockups/kosmanager-mobile.html docs/superpowers/mockups/_smoke.cjs
git commit -m "feat(mockup): sheet pesan WhatsApp dengan templat per status" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tugas 7: Potret, terbitkan, dan dokumentasi

**Files:**
- Modify: `SHOTS`, `docs/superpowers/specs/2026-09-27-kosmanager-mobile-kamaru-design.md`, `docs/PROGRESS.md`

- [ ] **Langkah 1: Tambah potret ronde 3**

Di array `SHOTS` `_shots.cjs`, setelah entri `18-sheet-tgl`, tambahkan:

```js

  /* ronde 3 */
  ['19-hist',        '#/hist/p1',       []],
  ['20-ex',          '#/ex/x1',         []],
  ['21-notes',       '#/notes/p1',      []],
  ['22-note-sheet',  '#/notes/p1',      [`q('.catat').click()`]],
  ['23-edit',        '#/tenant/p1-104', [`q('[data-form^="edit:"]').click()`]],
  ['24-edit-galat',  '#/tenant/p1-104', [
    `q('[data-form^="edit:"]').click()`,
    `set('[data-bind="edit.hp"]', '0812')`,
    `q('[data-simpan]').click()`,
  ]],
  ['25-wa',          '#/tenant/p1-106', [`q('[data-sheet="wa:p1-106|tagih"]').click()`]],
  ['26-docs',        '#/tenant/p1-111', [`q('.scroll').scrollTop = 900`]],
  ['27-viewer',      '#/tenant/p1-111', [`q('.doc.filled').click()`]],
  ['28-thumb',       '#/tenant/p1-102', [
    `q('[data-dok="p1-102|ktp|"]').click()`,
    `(function () {
       var c = document.createElement('canvas'); c.width = 640; c.height = 400;
       var g = c.getContext('2d');
       g.fillStyle = '#CFE3F5'; g.fillRect(0, 0, 640, 400);
       g.fillStyle = '#0070C0'; g.fillRect(40, 60, 180, 240);
       g.fillStyle = '#00456F'; g.font = 'bold 44px sans-serif'; g.fillText('KTP CONTOH', 260, 140);
       c.toBlob(function (b) {
         var dt = new DataTransfer();
         dt.items.add(new File([b], 'ktp.png', { type: 'image/png' }));
         var i = document.getElementById('berkas-in');
         i.files = dt.files;
         i.dispatchEvent(new Event('change'));
       });
     })()`,
    `q('.scroll').scrollTop = 900`,
  ]],
```

- [ ] **Langkah 2: Potret dan periksa**

Run: `node docs/superpowers/mockups/_shots.cjs`
Expected: 28 baris berukuran KB, tanpa `MENCURIGAKAN`.

Buka setiap potret 19–28 dan periksa:
- `19-hist`: dua baris sub (tanggal, kamar · lama tinggal) tidak terpotong aneh.
- `20-ex`: chip "Mantan penghuni", tanpa ikon pensil dan tombol Aksi, baris Masa tinggal muat.
- `21-notes` / `22-note-sheet`: teks catatan membungkus rapi; FAB tidak menutupi kartu terakhir.
- `23-edit` / `24-edit-galat`: kotak merah terlihat di bawah Kontak.
- `25-wa`: empat chip templat muat (boleh dua baris), tombol Buka WhatsApp penuh selebar sheet.
- `26-docs`: label berkas panjang terpotong dengan elipsis.
- `27-viewer`: penampil gelap menutupi layar, tombol Ganti/Hapus di bawah.
- `28-thumb`: ubin KTP menampilkan gambar, label jadi pil gelap.

Perbaiki yang meleset, jalankan ulang `_smoke.cjs` dan `_shots.cjs`, lalu commit:

```bash
git add docs/superpowers/mockups/kosmanager-mobile.html docs/superpowers/mockups/_shots.cjs
git commit -m "test(mockup): potret layar ronde 3" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Langkah 3: Terbitkan ulang ke link hidup**

Link hidup: `https://claude.ai/code/artifact/c775f041-8521-466d-98fa-5bb931ede24b`. Baca dulu versi terbitnya (`Artifact` action `read` dengan `url` tersebut), lalu terbitkan `docs/superpowers/mockups/kosmanager-mobile.html` dengan `url` yang sama supaya link tidak berubah.

- [ ] **Langkah 4: Cek tautan WhatsApp di sandbox**

Minta pemilik membuka link hidup di HP, buka penghuni mana pun, tekan WhatsApp lalu Buka WhatsApp.
- Kalau WhatsApp terbuka dengan pesan terisi: selesai.
- Kalau diblokir: tambahkan tombol kedua `Salin pesan` di `sheet-foot` SHEETS.wa (`<button class="btn" data-salinwa>`), penangan klik `navigator.clipboard.writeText(FORM.wa.teks).then(() => toast('Pesan disalin'), () => toast('Tidak bisa menyalin di sini'))`, tambahkan `[data-salinwa]` ke selektor `closest()`, tambah uji smoke yang memastikan tombolnya ada, lalu terbitkan ulang.

- [ ] **Langkah 5: Perbarui dokumen**

Kontrak desain:
- `**Status:**` → `Ronde 1, 2, dan 3 selesai.`
- Judul `### Ronde 3 — kelengkapan penghuni (disetujui 28 September)` → `### Ronde 3 — kelengkapan penghuni (selesai)`.
- Bagian "Cara memverifikasi": jumlah langkah smoke dan jumlah potret diganti dengan angka dari keluaran terakhir.

`docs/PROGRESS.md`:
- `**Terakhir diperbarui:**` → tanggal hari ini + hasil `npm run test:run` terbaru (jalankan dulu; `src/` tidak berubah jadi hasilnya harus sama).
- Tabel jalur: jalur B → `Ronde 1, 2, dan 3 selesai. Belum di-port ke src/.`
- Tabel berkas: jumlah langkah `_smoke.cjs` dan potret `_shots.cjs` sesuai keluaran.
- Keputusan terkunci, baris Huruf → `Inter saja, dipilih 28 September dari tujuh opsi. cv05 + ss01 menyala supaya Il1 terbedakan`.
- "Sudah selesai" → tambah paragraf **Ronde 3 — kelengkapan penghuni.** berisi lima fitur.
- "Berikutnya" butir 2 → ganti kandidat ronde 3 dengan kandidat ronde 4 yang tersisa: foto kamar, info properti, menu properti dan kamar (masih `soon`).
- "Jebakan" → tambah temuan baru bila ada selama pengerjaan.

- [ ] **Langkah 6: Commit dan push**

```bash
git add docs/superpowers/specs/2026-09-27-kosmanager-mobile-kamaru-design.md docs/PROGRESS.md
git commit -m "docs: ronde 3 mockup mobile selesai" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git pull --rebase
git push
```
