/* Potret layar mockup pakai chromium bawaan Playwright.
   Gerak dimatikan lewat --force-prefers-reduced-motion supaya yang terekam
   adalah keadaan akhir, bukan tengah animasi. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const dir  = __dirname;
const out  = path.join(dir, '_shots');
const src  = fs.readFileSync(path.join(dir, 'kosmanager-mobile.html'), 'utf8');

const base = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
const chrome = fs.readdirSync(base)
  .filter(d => d.startsWith('chromium-'))
  .map(d => path.join(base, d, 'chrome-win64', 'chrome.exe'))
  .filter(fs.existsSync).pop();
if (!chrome) { console.error('chromium tidak ditemukan di ' + base); process.exit(1); }

fs.mkdirSync(out, { recursive: true });

/* nama, hash, skrip tambahan yang dijalankan setelah halaman siap */
const SHOTS = [
  ['01-home',      '',                 ''],
  ['02-prop',      '#/prop/p1',        ''],
  ['03-prop-txn',  '#/prop/p1',        "document.querySelectorAll('.ptab')[1].click()"],
  ['04-room',      '#/room/p1-101',    ''],
  ['05-room-scrl', '#/room/p1-101',    "document.querySelector('.scroll').scrollTop=300"],
  ['06-sheet',     '#/room/p1-101',    "document.querySelector('[data-sheet]').click()"],
  ['07-tenant',    '#/tenant/p1-111',  ''],
  ['08-tenants',   '#/tenants',        ''],
  ['09-calendar',  '#/calendar',       ''],
  ['10-empty',     '#/room/p1-108',    ''],
];

for (const [nama, hash, after] of SHOTS) {
  const file = path.join(out, nama + '.html');
  fs.writeFileSync(file,
    '<!doctype html><html><head><meta charset="utf-8"></head><body>' + src +
    (after ? '<script>setTimeout(function(){' + after + '},250);<\/script>' : '') +
    '</body></html>');

  const url = 'file:///' + file.replace(/\\/g, '/') + hash;
  execFileSync(chrome, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    '--force-prefers-reduced-motion',
    '--force-device-scale-factor=2',
    '--window-size=430,890',
    '--virtual-time-budget=5000',
    '--screenshot=' + path.join(out, nama + '.png'),
    url,
  ], { stdio: 'ignore' });

  fs.unlinkSync(file);
  const s = fs.statSync(path.join(out, nama + '.png'));
  console.log(nama.padEnd(14) + Math.round(s.size / 1024) + ' KB');
}
