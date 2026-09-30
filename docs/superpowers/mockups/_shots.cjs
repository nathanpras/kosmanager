/* Potret layar mockup pakai chromium bawaan Playwright.
   Gerak dimatikan lewat --force-prefers-reduced-motion supaya yang terekam
   adalah keadaan akhir, bukan tengah animasi. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const dir = __dirname;
const out = path.join(dir, '_shots');
const src = fs.readFileSync(path.join(dir, 'kosmanager-mobile.html'), 'utf8');

/* Repo ini dikerjakan bergantian dari Windows dan macOS, jadi chromium dicari
   di kedua tempat Playwright menaruhnya. Nama berkas binernya beda per sistem,
   dan di macOS ada dua arsitektur. */
const SARANG = {
  win32:  [path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright')],
  darwin: [path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')],
  linux:  [path.join(os.homedir(), '.cache', 'ms-playwright')],
}[process.platform] || [];

const BINER = {
  win32:  ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe'],
  darwin: ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
           'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
           'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'],
  linux:  ['chrome-linux/chrome'],
}[process.platform] || [];

const chrome = SARANG
  .filter(fs.existsSync)
  .flatMap(base => fs.readdirSync(base)
    .filter(d => /^chromium-\d+$/.test(d))
    /* versi terbaru dipakai: urutkan menurut angkanya, bukan menurut teksnya */
    .sort((a, b) => Number(a.slice(9)) - Number(b.slice(9)))
    .flatMap(d => BINER.map(b => path.join(base, d, ...b.split('/')))))
  .filter(fs.existsSync).pop();

if (!chrome) {
  console.error('chromium Playwright tidak ditemukan di ' + (SARANG.join(', ') || process.platform));
  console.error('pasang dengan: npx playwright install chromium');
  process.exit(1);
}

fs.mkdirSync(out, { recursive: true });

/* [nama, hash, [langkah...]] — tiap langkah dijalankan berjarak 450ms */
const SHOTS = [
  ['01-home',        '',                []],
  ['02-prop',        '#/prop/p1',       []],
  ['03-prop-txn',    '#/prop/p1',       [`qa('.ptab')[1].click()`]],
  ['04-room',        '#/room/p1-101',   []],
  ['05-room-scrl',   '#/room/p1-101',   [`q('.scroll').scrollTop = 300`]],
  ['06-sheet',       '#/room/p1-101',   [`q('[data-sheet]').click()`]],
  ['07-tenant',      '#/tenant/p1-111', []],
  ['08-tenants',     '#/tenants',       []],
  ['09-calendar',    '#/calendar',      []],
  ['10-empty',       '#/room/p1-108',   []],

  /* ronde 2 */
  ['11-form-tenant', '#/room/p1-108',   [`q('.fab').click()`]],
  ['12-form-warn',   '#/room/p1-108',   [
    `q('.fab').click()`,
    `q('[data-sheet^="pilih:kamar"]').click()`,
    `pick('.sheet .pick', 'Kamar 101').click()`,
    `q('.scroll').scrollTop = 150`,
  ]],
  ['13-form-komp',   '#/room/p1-108',   [
    `q('.fab').click()`,
    `q('.scroll').scrollTop = 520`,
    `q('[data-sheet="komponen:x"]').click()`,
  ]],
  ['14-form-prop1',  '',                [`pick('.link', 'Tambah').click()`]],
  ['15-form-prop2',  '',                [
    `pick('.link', 'Tambah').click()`,
    `set('[data-bind="prop.nama"]', 'Raffles Kost Citra 2')`,
    `q('[data-step="2"]').click()`,
    `q('[data-radio="prop.sewa|kamar"]').click()`,
  ]],
  ['16-sheet-kamar', '#/prop/p1',       [`q('.fab').click()`]],
  ['17-sheet-bayar', '#/room/p1-101',   [
    `q('[data-sheet^="aksi"]').click()`,
    `pick('.aitem', 'Catat pembayaran').click()`,
  ]],
  ['18-sheet-tgl',   '#/room/p1-108',   [
    `q('.fab').click()`,
    `q('[data-sheet="tanggal:tenant.masuk"]').click()`,
  ]],

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

  /* ronde 4 — uang dan sewa */
  ['29-trx-tagihan', '#/room/p1-101',   [
    `q('[data-sheet^="aksi"]').click()`,
    `pick('.aitem', 'Tambah tagihan').click()`,
    `set('[data-money="trx.nominal"]', '250000')`,
    `set('[data-bind="trx.ket"]', 'Denda telat bayar')`,
  ]],
  ['30-trx-galat',   '#/room/p1-101',   [
    `q('[data-sheet^="aksi"]').click()`,
    `pick('.aitem', 'Tambah biaya lain').click()`,
    `q('[data-simpan]').click()`,
  ]],
  ['31-trx-deposit', '#/room/p1-101',   [
    `q('[data-sheet^="aksi"]').click()`,
    `pick('.aitem', 'Tambah deposit').click()`,
    `set('[data-money="trx.nominal"]', '1000000')`,
  ]],
  ['32-harga',       '#/room/p1-101',   [
    `qa('.ptab')[1].click()`,
    `pick('.btn', 'Ubah harga kamar').click()`,
  ]],
  ['33-masa',        '#/room/p1-101',   [
    `pick('.link', 'Ubah').click()`,
    `q('[data-radio="masa.tutup|tanggal"]').click()`,
  ]],
  ['34-pindah',      '#/room/p1-105',   [
    `q('[data-sheet^="aksi"]').click()`,
    `pick('.aitem', 'Pengaturan sewa').click()`,
    `pick('.aitem', 'Pindah kamar').click()`,
    `q('[data-sheet^="pilih:kamarKosong"]').click()`,
    `pick('.sheet .pick', 'Kamar 203').click()`,
  ]],
  ['35-hapus',       '#/room/p1-109',   [
    `q('[data-sheet^="aksi"]').click()`,
    `pick('.aitem', 'Pengaturan sewa').click()`,
    `pick('.aitem', 'Hapus sewa').click()`,
    `q('[data-hapussewa]').click()`,
  ]],
  ['36-keluar',      '#/prop/p2',       [
    `qa('.ptab')[1].click()`,
    `q('.fab').click()`,
    `set('[data-money="keluar.nominal"]', '480000')`,
    `set('[data-bind="keluar.ket"]', 'Token listrik blok A')`,
  ]],
  /* Kategori terpanjang, untuk membuktikan kolom sempit tidak memotongnya */
  ['36b-keluar-pjg', '#/prop/p2',       [
    `qa('.ptab')[1].click()`,
    `q('.fab').click()`,
    `q('[data-sheet^="pilih:kategori"]').click()`,
    `pick('.sheet .pick', 'Transfer Tanah').click()`,
  ]],
  /* Hasil simpan: tagihan tambahan tampil di tab Transaksi kamar */
  ['37-room-txn',    '#/room/p1-101',   [
    `q('[data-sheet^="aksi"]').click()`,
    `pick('.aitem', 'Tambah tagihan').click()`,
    `set('[data-money="trx.nominal"]', '250000')`,
    `set('[data-bind="trx.ket"]', 'Denda telat bayar')`,
    `q('[data-simpan]').click()`,
    `qa('.ptab')[2].click()`,
  ]],
];

const RUNNER = langkah => `<script>
var q  = function (s) { return document.querySelector(s); };
var qa = function (s) { return [].slice.call(document.querySelectorAll(s)); };
var pick = function (s, t) { return qa(s).filter(function (e) { return e.textContent.indexOf(t) >= 0; })[0]; };
var set = function (s, v) {
  var el = q(s); el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
var LANGKAH = [${langkah.map(x => JSON.stringify(x)).join(', ')}];
setTimeout(function jalan(i) {
  i = i || 0;
  if (i >= LANGKAH.length) return;
  try { eval(LANGKAH[i]); } catch (e) { document.title = 'GAGAL LANGKAH ' + i + ': ' + e.message; }
  setTimeout(function () { jalan(i + 1); }, 450);
}, 450);
<\/script>`;

let gagal = 0;
for (const [nama, hash, langkah] of SHOTS) {
  const file = path.join(out, nama + '.html');
  fs.writeFileSync(file,
    '<!doctype html><html><head><meta charset="utf-8"></head><body>' + src +
    (langkah.length ? RUNNER(langkah) : '') + '</body></html>');

  /* Jalur Windows tidak berawalan "/", jalur POSIX sudah punya */
  const jalur = file.replace(/\\/g, '/');
  const url = 'file://' + (jalur.startsWith('/') ? '' : '/') + jalur + hash;
  execFileSync(chrome, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    '--force-prefers-reduced-motion',
    '--force-device-scale-factor=2',
    '--window-size=430,890',
    '--virtual-time-budget=' + (2500 + langkah.length * 700),
    '--screenshot=' + path.join(out, nama + '.png'),
    url,
  ], { stdio: 'ignore' });

  fs.unlinkSync(file);
  const s = fs.statSync(path.join(out, nama + '.png'));
  if (s.size < 20000) { gagal++; console.log(nama.padEnd(16) + 'MENCURIGAKAN ' + s.size + ' B'); }
  else console.log(nama.padEnd(16) + Math.round(s.size / 1024) + ' KB');
}
process.exit(gagal ? 1 : 0);
