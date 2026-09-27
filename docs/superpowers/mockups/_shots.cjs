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

const base = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
const chrome = fs.readdirSync(base)
  .filter(d => d.startsWith('chromium-'))
  .map(d => path.join(base, d, 'chrome-win64', 'chrome.exe'))
  .filter(fs.existsSync).pop();
if (!chrome) { console.error('chromium tidak ditemukan di ' + base); process.exit(1); }

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

  const url = 'file:///' + file.replace(/\\/g, '/') + hash;
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
