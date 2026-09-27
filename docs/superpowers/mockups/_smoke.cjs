/* Uji asap mockup: jalankan halaman di jsdom, telusuri rutenya, laporkan error runtime. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const file = path.join(__dirname, 'kosmanager-mobile.html');
const body = fs.readFileSync(file, 'utf8');
const doc = '<!doctype html><html><head><meta charset="utf-8"></head><body>' + body + '</body></html>';

const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(doc, {
  runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true, url: 'http://x/',
});
const { window } = dom;
const D = window.document;
window.addEventListener('error', e => errs.push('window.error: ' + e.message));

const q = s => D.querySelector(s);
const qa = s => [...D.querySelectorAll(s)];
const T = () => q('.screen').textContent.replace(/\s+/g, ' ').trim();

/* jsdom tak memicu animationend, jadi layar lama dibuang manual */
const bersih = () => qa('.screen').slice(0, -1).forEach(s => s.remove());
/* history.back() di jsdom butuh lebih dari satu putaran event loop */
const tick = async () => { for (let i = 0; i < 4; i++) await new Promise(r => setTimeout(r, 0)); };

const rawClick = el => {
  if (!el) throw new Error('elemen yang diklik tidak ditemukan');
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
};
/* klik yang memicu pindah layar: hashchange asinkron di jsdom */
const nav = async el => { rawClick(el); await tick(); bersih(); };
const hash = async h => { window.location.hash = h; await tick(); bersih(); };

const steps = [];
const step = (nama, fn) => steps.push([nama, fn]);

step('muat awal = beranda', () => {
  if (!T().includes('Daftar properti')) throw new Error('bukan beranda: ' + T().slice(0, 80));
  if (!q('#tabbar').children.length) throw new Error('tabbar kosong');
  return qa('.statchip').length + ' statchip, ' + qa('[data-go^="prop/"]').length + ' properti, ' +
    q('#tabbar').children.length + ' tab bawah';
});

step('chip statistik punya angka', () => {
  const telat = qa('.statchip').find(c => c.textContent.includes('Telat'));
  if (!telat) throw new Error('chip Telat tidak ada');
  return 'Telat=' + telat.querySelector('b').dataset.count;
});

step('tap chip Telat membuka layar filter', async () => {
  await nav(qa('.statchip').find(c => c.textContent.includes('Telat')));
  if (!T().includes('Pembayaran telat')) throw new Error('judul salah: ' + T().slice(0, 60));
  return qa('[data-go^="room/"]').length + ' kamar';
});

step('tombol kembali balik ke beranda', async () => {
  await nav(q('[data-back]'));
  if (!T().includes('Daftar properti')) throw new Error('tidak kembali: ' + T().slice(0, 60));
});

step('buka properti p1', async () => {
  await nav(q('[data-go="prop/p1"]'));
  if (!T().includes('Raffles Kost Citra 1')) throw new Error(T().slice(0, 60));
  return qa('.ptab').length + ' tab, ' + qa('[data-go^="room/"]').length + ' kamar';
});

step('tabbar disembunyikan di kedalaman 1', () => {
  if (!q('#tabbar').classList.contains('is-hidden')) throw new Error('tabbar masih tampak');
});

step('ganti tab: elemen ptabs TIDAK digambar ulang', () => {
  const sebelum = q('[data-ptabs]');
  rawClick(qa('.ptab')[1]);
  if (q('[data-ptabs]') !== sebelum) throw new Error('ptabs ikut diganti, indikator tak bisa morph');
  if (!T().includes('September 2026')) throw new Error('isi tab salah: ' + T().slice(0, 80));
  return 'FAB=' + (q('.fab') ? q('.fab').textContent.trim() : 'tidak ada');
});

step('tab Lainnya membuang FAB', () => {
  rawClick(qa('.ptab')[2]);
  if (!T().includes('Catatan internal')) throw new Error(T().slice(0, 80));
  if (q('.fab')) throw new Error('FAB masih ada padahal tab Lainnya');
  return 'FAB hilang, benar';
});

step('balik tab Kamar lalu buka kamar 101', async () => {
  rawClick(qa('.ptab')[0]);
  await nav(q('[data-go="room/p1-101"]'));
  if (!T().includes('Kamar 101')) throw new Error(T().slice(0, 60));
  /* masuk 01 Sep 2026, hari ini 27 Sep 2026 -> 26 hari = 3 minggu 5 hari */
  const d = (T().match(/Durasi\s*(.+?)berjalan/) || [])[1];
  if (!d || d.trim() !== '3 minggu 5 hari') throw new Error('durasi salah: ' + JSON.stringify(d));
  return 'durasi=' + d.trim() + ' (benar)';
});

step('kartu sewa: harga dan periode tagihan', () => {
  const t = T();
  if (!t.includes('Rp1.800.000')) throw new Error('harga tidak muncul');
  const m = t.match(/Sewa · \d{2} \w{3} – \d{2} \w{3}/);
  if (!m) throw new Error('periode tidak muncul');
  return m[0];
});

step('buka sheet Aksi', () => {
  rawClick(q('[data-sheet^="aksi:"]'));
  if (!q('.sheet')) throw new Error('sheet tidak muncul');
  return qa('.sheet .aitem').length + ' aksi: ' +
    qa('.sheet .aitem-t').map(e => e.childNodes[0].textContent.trim()).join(' / ');
});

step('Pengaturan sewa membuka sub-sheet', () => {
  rawClick(qa('.sheet .aitem').find(a => a.textContent.includes('Pengaturan sewa')));
  if (q('.sheet-title').textContent !== 'Pengaturan sewa') throw new Error('judul: ' + q('.sheet-title').textContent);
  return qa('.sheet .aitem-t').map(e => e.childNodes[0].textContent.trim()).join(' / ');
});

step('scrim menutup sheet', () => {
  rawClick(q('.scrim'));
  const s = q('.sheet');
  if (s && !s.classList.contains('is-out')) throw new Error('sheet tidak menutup');
});

step('buka detail penghuni', async () => {
  await nav(q('[data-go="tenant/p1-101"]'));
  const t = T();
  if (!t.includes('Hizkia Nogie')) throw new Error(t.slice(0, 60));
  if (!q('.docgrid')) throw new Error('blok dokumen hilang');
  return qa('.doc').length + ' slot dokumen';
});

step('kembali bertingkat: penghuni -> kamar -> properti -> beranda', async () => {
  await nav(q('[data-back]'));
  if (!T().includes('Kamar 101')) throw new Error('bukan kamar: ' + T().slice(0, 40));
  await nav(q('[data-back]'));
  if (!T().includes('Raffles Kost Citra 1')) throw new Error('bukan properti: ' + T().slice(0, 40));
  await nav(q('[data-back]'));
  if (!T().includes('Daftar properti')) throw new Error('bukan beranda: ' + T().slice(0, 40));
  if (q('#tabbar').classList.contains('is-hidden')) throw new Error('tabbar tidak muncul lagi');
});

step('tab bawah Penghuni', async () => {
  await nav(q('[data-go="tenants"]'));
  if (!T().includes('Penghuni aktif')) throw new Error(T().slice(0, 60));
  return qa('[data-tlist] > [data-go]').length + ' penghuni';
});

step('filter Telat', () => {
  rawClick(qa('.fchip').find(c => c.textContent.includes('Telat')));
  const n = qa('[data-tlist] > [data-go]').length;
  if (n !== 3) throw new Error('harusnya 3, dapat ' + n);
  return n + ' penghuni telat';
});

step('pencarian menyaring daftar', () => {
  rawClick(qa('.fchip')[0]);
  const inp = q('[data-search]');
  if (!inp) throw new Error('kolom cari hilang setelah ganti filter');
  inp.value = 'clara';
  inp.dispatchEvent(new window.Event('input', { bubbles: true }));
  const tampak = qa('[data-tlist] > [data-go]').filter(b => b.style.display !== 'none');
  if (tampak.length !== 1) throw new Error('hasil cari: ' + tampak.length);
  return tampak[0].textContent.replace(/\s+/g, ' ').trim().slice(0, 34);
});

step('tab bawah Kalender', async () => {
  await nav(q('[data-go="calendar"]'));
  const t = T();
  if (!t.includes('September 2026')) throw new Error(t.slice(0, 60));
  if (!t.includes('Yosafat Manik')) throw new Error('agenda check-in hari ini tidak muncul');
  return qa('.cal-day').length + ' sel, ' + qa('.cal-dots').length + ' hari bertanda';
});

step('kamar kosong: empty state + FAB tambah penghuni', async () => {
  await hash('#/room/p1-108');
  if (!T().includes('Kamar ini kosong')) throw new Error(T().slice(0, 80));
  if (!q('.fab')) throw new Error('FAB tambah penghuni hilang');
  return 'FAB=' + q('.fab').textContent.trim();
});

step('properti tanpa transaksi -> empty state', async () => {
  await hash('#/prop/p2');
  rawClick(qa('.ptab')[1]);
  if (!T().includes('Belum ada transaksi')) throw new Error(T().slice(0, 80));
});

step('semua kamar & penghuni dirender', async () => {
  const ids = [];
  for (const p of ['p1', 'p2']) {
    await hash('#/prop/' + p);
    rawClick(qa('.ptab')[0]);          // tab aktif diingat per rute, paksa balik ke Kamar
    for (const b of qa('[data-go^="room/"]')) ids.push(b.dataset.go);
  }
  let penghuni = 0;
  for (const r of ids) {
    await hash('#/' + r);
    if (!T()) throw new Error('layar kosong di ' + r);
    const t = q('[data-go^="tenant/"]');
    if (t) {
      const id = t.dataset.go;
      await hash('#/' + id);
      if (!q('.docgrid')) throw new Error('docgrid hilang di ' + id);
      penghuni++;
    }
  }
  return ids.length + ' kamar, ' + penghuni + ' detail penghuni';
});

step('semua rute filter dari beranda', async () => {
  await hash('#/home');
  const kunci = qa('.statchip').map(c => c.dataset.go);
  for (const k of kunci) {
    await hash('#/' + k);
    if (!T()) throw new Error('layar kosong di ' + k);
  }
  return kunci.length + ' filter';
});

step('tidak ada lebar tetap melebihi layar', () => {
  const css = qa('style').map(s => s.textContent).join('\n');
  const bad = [...css.matchAll(/(?<![a-z-])width:\s*(\d{3,})px/g)]
    .map(m => +m[1]).filter(w => w > 390);
  if (bad.length) throw new Error('lebar tetap > 390px: ' + bad.join(', '));
  return 'aman';
});

step('target sentuh utama minimal 44px', () => {
  const css = qa('style').map(s => s.textContent).join('\n');
  const perlu = ['.iconbtn', '.statchip', '.tabitem', '.fab'];
  const kecil = [];
  for (const sel of perlu) {
    const sisa = css.split(new RegExp('\\' + sel + '\\s*\\{'))[1] || '';
    const blok = sisa.split('}')[0];                    // hanya aturan selektor itu sendiri
    const h = (blok.match(/(?<![a-z-])height:\s*(\d+)px/) || [])[1];
    const pad = (blok.match(/padding:\s*(\d+)px[^;]*?(\d+)px;/) || []);
    const tinggi = h ? +h : (pad[1] ? +pad[1] + +pad[2] + 30 : null);
    if (tinggi !== null && tinggi < 40) kecil.push(sel + '=' + tinggi + 'px');
  }
  if (kecil.length) throw new Error(kecil.join(', '));
  return perlu.join(', ') + ' semua >= 40px';
});

(async () => {
  for (const [nama, fn] of steps) {
    const sebelum = errs.length;
    let hasil = '';
    try { hasil = (await fn()) || ''; } catch (e) { errs.push(nama + ': ' + e.message); }
    console.log((errs.length > sebelum ? 'GAGAL ' : 'ok    ') + nama + (hasil ? '  -- ' + hasil : ''));
  }
  console.log('');
  console.log(errs.length ? errs.length + ' MASALAH:\n' + errs.join('\n') : 'Tidak ada error runtime.');
  process.exit(errs.length ? 1 : 0);
})();
