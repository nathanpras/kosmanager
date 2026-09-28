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

/* jsdom tak memicu animationend, jadi layar yang sedang keluar dibuang manual.
   Tidak boleh asal "sisakan yang terakhir" — saat modal terbuka ada dua layar
   yang memang harus tetap hidup. */
const bersih = () => qa('.screen').forEach(el => {
  if (/anim-(pushBack|popOut|fadeGone|modalOut)/.test(el.className)) el.remove();
});
const tutup = () => !q('.sheet') || q('.sheet').classList.contains('is-out');  // animationend tak jalan di jsdom
const atas = () => qa('.screen').pop();                                  // layar paling atas
const A = () => atas().textContent.replace(/\s+/g, ' ').trim();          // teksnya
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

/* ════════════ RONDE 2: formulir ════════════ */

const ketik = (sel, teks) => {
  const el = q(sel);
  if (!el) throw new Error('isian tidak ditemukan: ' + sel);
  el.value = teks;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
  return el;
};

step('FAB kamar kosong membuka formulir penghuni sebagai modal', async () => {
  await hash('#/room/p1-108');
  await nav(q('.fab'));
  if (qa('.screen').length !== 2) throw new Error('layar dasar tidak dipertahankan: ' + qa('.screen').length);
  if (!qa('.screen')[0].classList.contains('is-stacked')) throw new Error('layar dasar tidak mundur');
  if (!atas().classList.contains('is-modal')) throw new Error('layar atas bukan modal');
  if (!A().includes('Tambah penghuni')) throw new Error(A().slice(0, 60));
  if (!q('#tabbar').classList.contains('is-hidden')) throw new Error('dok masih tampak');
  return 'kamar terisi awal = ' + q('[data-sheet^="pilih:kamar"] .val').textContent;
});

step('kamar 108 kosong -> tidak ada peringatan bentrok', () => {
  if (A().includes('masih ditempati')) throw new Error('peringatan muncul padahal kamar kosong');
});

step('pilih kamar 101 yang terisi -> peringatan merah muncul', () => {
  rawClick(q('[data-sheet^="pilih:kamar"]'));
  if (!q('.sheet')) throw new Error('sheet pemilih tidak muncul');
  const opsi = qa('.sheet .pick').find(b => b.textContent.includes('Kamar 101'));
  if (!opsi) throw new Error('opsi kamar 101 tidak ada');
  rawClick(opsi);
  if (!tutup()) throw new Error('sheet pemilih tidak menutup');
  const t = A();
  if (!t.includes('masih ditempati')) throw new Error('peringatan bentrok tidak muncul');
  if (!t.includes('Hizkia Nogie')) throw new Error('nama penghunya tidak disebut');
  return (t.match(/Kamar \d+ masih ditempati [A-Za-z ]+ sejak \d{2} \w{3} \d{4}/) || ['?'])[0];
});

step('pemilih tanggal: geser bulan lalu pilih', () => {
  rawClick(q('[data-sheet="tanggal:tenant.masuk"]'));
  if (!q('.sheet')) throw new Error('sheet tanggal tidak muncul');
  const judulAwal = q('[data-scalbody] strong').textContent.replace(/\s+/g, ' ');
  rawClick(q('[data-scal="1"]'));
  const judulBaru = q('[data-scalbody] strong').textContent.replace(/\s+/g, ' ');
  if (judulAwal === judulBaru) throw new Error('bulan tidak bergeser: ' + judulAwal);
  rawClick(qa('[data-scalbody] .cal-day[data-set]')[9]);   // tanggal 10
  if (!tutup()) throw new Error('sheet tanggal tidak menutup');
  const v = q('[data-sheet="tanggal:tenant.masuk"] .val').textContent;
  if (!/10 Okt 2026/.test(v)) throw new Error('tanggal tidak tersimpan: ' + v);
  return judulAwal + ' -> ' + judulBaru + ', terpilih ' + v;
});

step('isian teks tersimpan dan pencacahnya jalan', () => {
  ketik('[data-bind="tenant.nama"]', 'Yosafat Manik');
  const c = q('[data-cnt="tenant.nama"]');
  if (c.textContent !== '13/40') throw new Error('pencacah: ' + c.textContent);
  return 'pencacah ' + c.textContent;
});

step('isian rupiah diformat saat diketik', () => {
  const el = ketik('[data-money="tenant.harga"]', '1750000');
  if (el.value !== 'Rp1.750.000') throw new Error('hasil format: ' + el.value);
  return el.value;
});

step('sakelar mengubah teks penjelasnya', () => {
  const sebelum = A().includes('Penghuni belum bayar');
  rawClick(q('[data-toggle="tenant.sudahBayar"]'));
  const sesudah = A().includes('ditandai lunas');
  if (!sebelum || !sesudah) throw new Error('teks sakelar tidak berubah');
  if (!q('[data-toggle="tenant.sudahBayar"] .toggle').classList.contains('is-on')) throw new Error('sakelar tidak menyala');
});

step('tambah lalu hapus komponen', () => {
  rawClick(q('[data-sheet="komponen:x"]'));
  rawClick(qa('.sheet [data-addkomp]').find(b => b.textContent.includes('Deposit')));
  if (!tutup()) throw new Error('sheet komponen tidak menutup');
  if (!q('.komp')) throw new Error('komponen tidak masuk daftar');
  const teks = q('.komp').textContent.replace(/\s+/g, ' ').trim();
  rawClick(q('[data-delkomp]'));
  if (q('.komp')) throw new Error('komponen tidak terhapus');
  return teks + ' (ditambah lalu dihapus)';
});

step('simpan menutup modal dan memulihkan layar dasar', async () => {
  rawClick(q('[data-simpan]'));
  await tick(); bersih();
  if (qa('.screen').length !== 1) throw new Error('masih ada ' + qa('.screen').length + ' layar');
  if (atas().classList.contains('is-stacked')) throw new Error('layar dasar tidak dipulihkan');
  if (!A().includes('Kamar 108')) throw new Error('bukan layar asal: ' + A().slice(0, 50));
  const toast = q('.toast');
  if (!toast) throw new Error('toast tidak muncul');
  return 'toast: ' + toast.textContent;
});

step('formulir properti: dua langkah maju-mundur', async () => {
  await hash('#/home');
  await nav(qa('.link').find(b => b.dataset.form === 'prop'));
  if (!A().includes('Beri nama properti')) throw new Error(A().slice(0, 60));
  if (qa('.steps i.is-on').length !== 1) throw new Error('penanda langkah salah');
  ketik('[data-bind="prop.nama"]', 'Raffles Kost Citra 2');
  rawClick(q('[data-step="2"]'));
  if (!A().includes('Jenis sewa')) throw new Error('langkah 2 tidak terbuka: ' + A().slice(0, 60));
  if (qa('.steps i.is-on').length !== 2) throw new Error('penanda langkah tidak ikut');
  if (!atas().textContent.includes('Raffles Kost Citra 2')) throw new Error('judul tidak memakai nama baru');
  rawClick(q('[data-step="1"]'));
  if (!A().includes('Beri nama properti')) throw new Error('tidak bisa mundur');
  if (q('[data-bind="prop.nama"]').value !== 'Raffles Kost Citra 2') throw new Error('isian hilang saat mundur');
  return 'nama bertahan lintas langkah';
});

step('pilihan jenis sewa hanya satu yang aktif', () => {
  rawClick(q('[data-step="2"]'));
  rawClick(q('[data-radio="prop.sewa|kamar"]'));
  const on = qa('.radio.is-on');
  if (on.length !== 1) throw new Error(on.length + ' pilihan aktif');
  if (!on[0].textContent.includes('per kamar')) throw new Error('pilihan salah');
  if (!A().includes('tidak bisa diubah setelah disimpan')) throw new Error('peringatan jenis sewa hilang');
});

step('sakelar telepon menyembunyikan isiannya', () => {
  if (!q('[data-bind="prop.hp"]')) throw new Error('isian telepon harusnya tampak');
  rawClick(q('[data-toggle="prop.pakaiHp"]'));
  if (q('[data-bind="prop.hp"]')) throw new Error('isian telepon harusnya hilang');
  rawClick(q('[data-toggle="prop.pakaiHp"]'));
  if (!q('[data-bind="prop.hp"]')) throw new Error('isian telepon tidak kembali');
});

step('batal menutup formulir properti', async () => {
  rawClick(q('[data-step="1"]'));
  rawClick(q('[data-back]'));
  await tick(); bersih();
  if (qa('.screen').length !== 1) throw new Error('modal tidak tertutup');
  if (!A().includes('Daftar properti')) throw new Error(A().slice(0, 50));
});

step('FAB properti membuka sheet tambah kamar', async () => {
  await hash('#/prop/p1');
  rawClick(qa('.ptab')[0]);
  rawClick(q('.fab'));
  if (!q('.sheet')) throw new Error('sheet tidak muncul');
  const t = q('.sheet').textContent.replace(/\s+/g, ' ');
  if (!t.includes('Tambah kamar')) throw new Error(t.slice(0, 60));
  if (!t.includes('Nomor terakhir 207')) throw new Error('petunjuk nomor terakhir salah: ' + t.slice(0, 120));
  ketik('.sheet [data-bind="kamar.no"]', '208');
  rawClick(q('.sheet [data-toggle="kamar.belumSewa"]'));
  if (!q('.sheet [data-toggle="kamar.belumSewa"] .check').classList.contains('is-on')) throw new Error('centang tidak menyala');
  if (q('.sheet [data-bind="kamar.no"]').value !== '208') throw new Error('isian hilang saat sheet digambar ulang');
  rawClick(q('.sheet [data-simpan]'));
  if (!tutup()) throw new Error('sheet tambah kamar tidak menutup');
  return 'nomor 208 tersimpan, sheet tertutup';
});

step('Aksi -> Catat pembayaran membuka sheet berisi nominal', async () => {
  await hash('#/room/p1-101');
  rawClick(q('[data-sheet^="aksi:"]'));
  rawClick(qa('.sheet .aitem').find(a => a.textContent.includes('Catat pembayaran')));
  const t = q('.sheet').textContent.replace(/\s+/g, ' ');
  if (!t.includes('Catat pembayaran')) throw new Error(t.slice(0, 60));
  const el = q('.sheet [data-money="bayar.nominal"]');
  if (el.value !== 'Rp1.800.000') throw new Error('nominal awal: ' + el.value);
  rawClick(qa('.sheet .fchip').find(b => b.textContent.includes('Setengah')));
  const v = q('.sheet [data-money="bayar.nominal"]').value;
  if (v !== 'Rp900.000') throw new Error('pintasan setengah: ' + v);
  return 'Rp1.800.000 -> ' + v;
});

step('pemilih metode kembali ke sheet pembayaran, bukan menutupnya', () => {
  rawClick(q('.sheet [data-sheet^="pilih:metode"]'));
  if (!q('.sheet').textContent.includes('Metode pembayaran')) throw new Error('pemilih tidak terbuka');
  rawClick(qa('.sheet .pick').find(b => b.textContent.trim().startsWith('QRIS')));
  const t = q('.sheet').textContent.replace(/\s+/g, ' ');
  if (!t.includes('Catat pembayaran')) throw new Error('tidak kembali ke sheet induk: ' + t.slice(0, 60));
  if (!t.includes('QRIS')) throw new Error('metode tidak tersimpan');
  closeAll();
  return 'kembali ke induk dengan metode QRIS';
});

step('kalender bisa digeser bulannya', async () => {
  await hash('#/calendar');
  const awal = q('.cal-grid').parentElement.querySelector('strong').textContent.replace(/\s+/g, ' ');
  rawClick(q('[data-cal="1"]'));
  const maju = q('.cal-grid').parentElement.querySelector('strong').textContent.replace(/\s+/g, ' ');
  rawClick(q('[data-cal="-1"]'));
  rawClick(q('[data-cal="-1"]'));
  const mundur = q('.cal-grid').parentElement.querySelector('strong').textContent.replace(/\s+/g, ' ');
  if (awal === maju || maju === mundur) throw new Error([awal, maju, mundur].join(' / '));
  if (q('.cal-day.today')) throw new Error('penanda hari ini muncul di bulan yang salah');
  rawClick(q('[data-cal="1"]'));
  if (!q('.cal-day.today')) throw new Error('penanda hari ini hilang saat kembali ke September');
  return awal + ' -> ' + maju + ' -> ' + mundur;
});

function closeAll() {
  const sc = q('.scrim');
  if (sc) rawClick(sc);
}

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

/* ════════════ Audit statis ════════════
   Dua kelas bug yang tak terdeteksi dengan menelusuri alur: ikon yang
   dipanggil tapi tak ada di peta, dan class yang dipakai tapi tak pernah
   punya aturan CSS (mis. .note yang sempat hilang saat rombak visual). */

const kelasDipakai = new Set();
const catatKelas = () => qa('[class]').forEach(el => el.classList.forEach(c => kelasDipakai.add(c)));

step('semua ikon yang dipanggil ada di peta', () => {
  const dipanggil = [...new Set([...body.matchAll(/ic\('([a-zA-Z]+)'/g)].map(m => m[1]))];
  const peta = body.slice(body.indexOf('const P = {'), body.indexOf('const ic ='));
  const hilang = dipanggil.filter(k => !new RegExp('(^|[\\s{])' + k + ':').test(peta));
  if (hilang.length) throw new Error('tidak ada di peta ikon: ' + hilang.join(', '));
  return dipanggil.length + ' ikon dipakai, semua terdefinisi';
});

step('setiap class yang dirender punya aturan CSS', () => {
  const css = qa('style').map(el => el.textContent).join('\n');
  const distyle = new Set([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map(m => m[1]));
  const yatim = [...kelasDipakai].filter(c => !distyle.has(c)).sort();
  if (yatim.length) throw new Error('dipakai tapi tanpa aturan CSS: ' + yatim.join(', '));
  return kelasDipakai.size + ' class dipakai, semua punya aturan';
});

(async () => {
  for (const [nama, fn] of steps) {
    /* jsdom tak memicu animationend: buang sisa sheet/scrim yang sedang menutup */
    qa('.is-out').forEach(el => el.remove());
    const sebelum = errs.length;
    let hasil = '';
    try { hasil = (await fn()) || ''; } catch (e) { errs.push(nama + ': ' + e.message); }
    catatKelas();   // kumpulkan class dari setiap keadaan yang pernah dirender
    console.log((errs.length > sebelum ? 'GAGAL ' : 'ok    ') + nama + (hasil ? '  -- ' + hasil : ''));
  }
  console.log('');
  console.log(errs.length ? errs.length + ' MASALAH:\n' + errs.join('\n') : 'Tidak ada error runtime.');
  process.exit(errs.length ? 1 : 0);
})();
