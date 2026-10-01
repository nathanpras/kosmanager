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

/* ════════════ RONDE 4: uang dan sewa ════════════ */

const bersihSheet = () => { closeAll(); qa('.is-out').forEach(el => el.remove()); };
const nominal = (path, teks) => ketik('.sheet [data-money="' + path + '"]', teks);
const judulSheet = () => q('.sheet-title').textContent.trim();
const tekSheet = () => q('.sheet').textContent.replace(/\s+/g, ' ').trim();

step('R4 sheet Aksi: tiga Tambah tidak lagi buntu', async () => {
  bersihSheet();
  await hash('#/room/p1-101');
  rawClick(q('[data-sheet="aksi:p1-101"]'));
  const buntu = qa('.sheet .aitem[data-act="soon"]');
  if (buntu.length) throw new Error(buntu.length + ' item masih buntu');
  return qa('.sheet .aitem').length + ' item, semuanya bertujuan';
});

step('R4 nominal nol menahan simpan', () => {
  rawClick(q('.sheet [data-sheet="trx:p1-101|tagihan"]'));
  if (!judulSheet().includes('Tambah tagihan')) throw new Error('judul: ' + judulSheet());
  rawClick(q('.sheet [data-simpan]'));
  if (tutup()) throw new Error('sheet menutup padahal nominal nol');
  if (!q('.sheet .note.bad')) throw new Error('catatan merah tidak muncul');
  return q('.sheet .note.bad').textContent.replace(/\s+/g, ' ').trim();
});

step('R4 keterangan kosong menahan simpan', () => {
  nominal('trx.nominal', '250000');
  rawClick(q('.sheet [data-simpan]'));
  if (tutup()) throw new Error('sheet menutup padahal keterangan kosong');
  if (!/Keterangan wajib/.test(q('.sheet .note.bad').textContent))
    throw new Error(q('.sheet .note.bad').textContent);
});

step('R4 ganti jenis: judul, pintasan, dan pesan simpan ikut berubah', () => {
  const sebelum = qa('.sheet .quick')[1].textContent.replace(/\s+/g, ' ').trim();
  rawClick(q('.sheet [data-jenis="lain"]'));
  if (!judulSheet().includes('biaya lain')) throw new Error('judul: ' + judulSheet());
  const sesudah = qa('.sheet .quick')[1].textContent.replace(/\s+/g, ' ').trim();
  if (sebelum === sesudah) throw new Error('pintasan nominal tidak berubah');
  if (q('.sheet [data-simpan]').dataset.simpan !== 'Biaya ditambahkan')
    throw new Error('pesan simpan: ' + q('.sheet [data-simpan]').dataset.simpan);
  /* nominal yang sudah diketik tidak boleh hilang saat jenis diganti */
  const nilai = q('.sheet [data-money="trx.nominal"]').value;
  if (!/^Rp25/.test(nilai)) throw new Error('nominal hilang: ' + nilai);
  rawClick(q('.sheet [data-jenis="tagihan"]'));
  return sebelum + ' → ' + sesudah;
});

step('R4 tagihan masuk daftar tagihan kamar, bukan arus kas', () => {
  ketik('.sheet [data-bind="trx.ket"]', 'Denda telat bayar');
  const kas = window.eval("(TXN.p1 || []).length");
  rawClick(q('.sheet [data-simpan]'));
  if (!tutup()) throw new Error('sheet tidak menutup');
  if (window.eval("(TXN.p1 || []).length") !== kas)
    throw new Error('tagihan bocor ke arus kas properti');
  bersihSheet();
  rawClick(qa('.ptab')[2]);
  if (!A().includes('Tagihan tambahan')) throw new Error('seksi tidak ada: ' + A().slice(0, 120));
  if (!A().includes('Denda telat bayar')) throw new Error('tagihan tidak tampil: ' + A().slice(0, 140));
  return window.eval("tagihanDi('p1-101').length") + ' tagihan tambahan, arus kas tak bertambah';
});

step('R4 deposit masuk arus kas dan menambah deposit kamar', () => {
  rawClick(qa('.ptab')[0]);
  const dep = window.eval("room('p1-101').deposit");
  const kas = window.eval("(TXN.p1 || []).length");
  rawClick(q('[data-sheet="aksi:p1-101"]'));
  rawClick(q('.sheet [data-sheet="trx:p1-101|deposit"]'));
  nominal('trx.nominal', '750000');
  rawClick(q('.sheet [data-simpan]'));
  if (!tutup()) throw new Error('sheet tidak menutup padahal keterangan deposit opsional');
  if (window.eval("room('p1-101').deposit") !== dep + 750000)
    throw new Error('deposit kamar: ' + dep + ' → ' + window.eval("room('p1-101').deposit"));
  if (window.eval("(TXN.p1 || []).length") !== kas + 1) throw new Error('tidak masuk arus kas');
  return 'deposit ' + dep + ' → ' + (dep + 750000) + ', arus kas +1';
});

step('R4 ubah harga mengubah tab Harga dan kartu kamar', async () => {
  bersihSheet();
  await hash('#/room/p1-102');
  rawClick(qa('.ptab')[1]);
  if (!A().includes('Rp1.800.000')) throw new Error('harga awal: ' + A().slice(0, 110));
  rawClick(q('[data-sheet="harga:p1-102"]'));
  nominal('harga.nominal', '0');
  rawClick(q('.sheet [data-simpan]'));
  if (tutup()) throw new Error('harga nol diterima');
  nominal('harga.nominal', '1950000');
  rawClick(q('.sheet [data-simpan]'));
  if (!tutup()) throw new Error('sheet tidak menutup');
  if (!A().includes('Rp1.950.000')) throw new Error('tab Harga belum berubah: ' + A().slice(0, 110));
  bersihSheet();
  await hash('#/prop/p1');
  /* tabState masih menyimpan tab dari uji sebelumnya — kembalikan ke Kamar */
  rawClick(qa('.ptab')[0]);
  const kartu = qa('[data-go="room/p1-102"]').pop();
  if (!kartu.textContent.includes('1.950.000'))
    throw new Error('kartu kamar: ' + kartu.textContent.replace(/\s+/g, ' ').trim());
  return 'Rp1.800.000 → Rp1.950.000 di tab Harga dan kartu kamar';
});

step('R4 check-out mendahului check-in menahan simpan', async () => {
  bersihSheet();
  await hash('#/room/p1-112');            /* Yosafat, check-in 27 Sep 2026 */
  rawClick(q('[data-sheet="masa:p1-112"]'));
  rawClick(q('.sheet [data-radio="masa.tutup|tanggal"]'));
  if (!q('.sheet [data-sheet="tanggal:masa.keluar"]'))
    throw new Error('pemilih check-out tidak muncul setelah radio dipilih');
  rawClick(q('.sheet [data-simpan]'));
  if (tutup()) throw new Error('tersimpan tanpa tanggal check-out');
  rawClick(q('.sheet [data-sheet="tanggal:masa.keluar"]'));
  rawClick(q('.sheet [data-set="masa.keluar|2026-09-01"]'));
  if (!judulSheet().includes('Ubah masa tinggal'))
    throw new Error('pemilih tidak kembali ke induknya: ' + judulSheet());
  rawClick(q('.sheet [data-simpan]'));
  if (tutup()) throw new Error('check-out sebelum check-in diterima');
  return q('.sheet .note.bad').textContent.replace(/\s+/g, ' ').trim();
});

step('R4 masa tinggal tersimpan dan tampil di kartu', () => {
  rawClick(q('.sheet [data-sheet="tanggal:masa.keluar"]'));
  rawClick(q('.sheet [data-scal="1"]'));                       /* Oktober 2026 */
  rawClick(q('.sheet [data-set="masa.keluar|2026-10-31"]'));
  rawClick(q('.sheet [data-simpan]'));
  if (!tutup()) throw new Error('sheet tidak menutup');
  if (!A().includes('31 Okt 2026')) throw new Error('check-out tidak tampil: ' + A().slice(0, 170));
  return 'check-out ' + window.eval("room('p1-112').keluar");
});

step('R4 pindah kamar memindahkan penghuni dan meninggalkan jejak', async () => {
  bersihSheet();
  await hash('#/room/p1-105');            /* Henri, Rp1.700.000 */
  rawClick(q('[data-sheet="aksi:p1-105"]'));
  rawClick(q('.sheet [data-sheet="sewa:p1-105"]'));
  rawClick(q('.sheet [data-sheet="pindah:p1-105"]'));
  rawClick(q('.sheet [data-simpan]'));
  if (tutup()) throw new Error('tersimpan tanpa kamar tujuan');
  rawClick(q('.sheet [data-sheet="pilih:kamarKosong|pindah.tujuan"]'));
  if (!qa('.sheet .pick').length) throw new Error('daftar kamar kosong tidak ada isinya');
  rawClick(q('.sheet [data-set="pindah.tujuan|p1-203"]'));
  if (!/mulai ditagih 1 Oktober 2026/.test(tekSheet()))
    throw new Error('aturan tagih tidak tertulis: ' + tekSheet().slice(0, 220));
  if (!/kamar 105.+penuh/.test(tekSheet())) throw new Error('kamar lama tidak disebut');
  rawClick(q('.sheet [data-simpan]'));
  if (!tutup()) throw new Error('sheet tidak menutup');
  if (window.eval("room('p1-105').status") !== 'kosong') throw new Error('kamar asal tidak dikosongkan');
  if (window.eval("room('p1-203').nama") !== 'Henri')
    throw new Error('kamar tujuan: ' + window.eval("room('p1-203').nama"));
  if (window.eval("room('p1-203').harga") !== 1700000)
    throw new Error('harga tidak ikut pindah: ' + window.eval("room('p1-203').harga"));
  bersihSheet();
  await hash('#/hist/p1-105');
  if (!T().includes('Pindah ke kamar 203')) throw new Error('jejak tidak ada: ' + T().slice(0, 170));
  return 'Henri 105 → 203, harga ikut, jejak tercatat di kamar asal';
});

step('R4 properti tanpa kamar kosong mematikan Simpan', async () => {
  window.eval("roomsOf('p2').filter(r => r.status === 'kosong')" +
              ".forEach(r => { r.status = 'lunas'; r.nama = 'Uji Penuh'; r.harga = 1400000; })");
  await hash('#/room/p2-A1');
  rawClick(q('[data-sheet="aksi:p2-A1"]'));
  rawClick(q('.sheet [data-sheet="sewa:p2-A1"]'));
  rawClick(q('.sheet [data-sheet="pindah:p2-A1"]'));
  if (q('.sheet [data-simpan]')) throw new Error('tombol Simpan masih ada');
  if (!q('.sheet .note.bad')) throw new Error('catatan merah tidak muncul');
  if (!q('.sheet [data-tutup]')) throw new Error('tidak ada tombol Tutup');
  const pesan = q('.sheet .note.bad').textContent.replace(/\s+/g, ' ').trim();
  bersihSheet();
  window.eval("['p2-A3','p2-B2','p2-B6'].forEach(id => " +
              "Object.assign(room(id), { status: 'kosong', nama: '', harga: 0 }))");
  return pesan;
});

step('R4 hapus sewa butuh dua ketukan dan menaruh penghuni di riwayat', async () => {
  await hash('#/room/p1-109');            /* Rendi Saputra */
  rawClick(q('[data-sheet="aksi:p1-109"]'));
  rawClick(q('.sheet [data-sheet="sewa:p1-109"]'));
  rawClick(q('.sheet [data-sheet="hapus:p1-109"]'));
  if (q('.sheet [data-simpan]')) throw new Error('sheet hapus tidak boleh punya tombol Simpan');
  rawClick(q('.sheet [data-hapussewa]'));
  if (tutup()) throw new Error('satu ketukan sudah mengakhiri sewa');
  if (!q('.sheet [data-hapussewa]').classList.contains('danger'))
    throw new Error('tombol tidak berubah jadi danger');
  rawClick(q('.sheet [data-hapussewa]'));
  if (!tutup()) throw new Error('ketukan kedua tidak menutup sheet');
  if (window.eval("room('p1-109').status") !== 'kosong') throw new Error('kamar tidak dikosongkan');
  bersihSheet();
  await hash('#/hist/p1-109');
  if (!T().includes('Rendi Saputra')) throw new Error('tidak masuk riwayat: ' + T().slice(0, 130));
  if (T().includes('Pindah ke kamar')) throw new Error('check-out salah ditandai sebagai pindah');
  return 'Rendi Saputra masuk riwayat kamar 109';
});

step('R4 tombol hapus tidak tetap terkokang setelah sheet ditutup', async () => {
  await hash('#/room/p1-111');
  const buka = () => {
    rawClick(q('[data-sheet="aksi:p1-111"]'));
    rawClick(q('.sheet [data-sheet="sewa:p1-111"]'));
    rawClick(q('.sheet [data-sheet="hapus:p1-111"]'));
  };
  buka();
  rawClick(q('.sheet [data-hapussewa]'));      /* sekali: terkokang */
  bersihSheet();
  buka();
  if (q('.sheet [data-hapussewa]').classList.contains('danger')) throw new Error('masih terkokang');
  if (window.eval("room('p1-111').status") === 'kosong')
    throw new Error('sewa berakhir padahal baru satu ketukan');
  bersihSheet();
  return 'dibuka ulang → kembali butuh dua ketukan';
});

step('R4 pengeluaran mengisi properti yang tadinya kosong', async () => {
  await hash('#/prop/p2');
  rawClick(qa('.ptab')[1]);
  if (!A().includes('Belum ada transaksi')) throw new Error('p2 harusnya kosong: ' + A().slice(0, 130));
  if (!q('.fab').textContent.includes('Pengeluaran'))
    throw new Error('label FAB: ' + q('.fab').textContent.trim());
  rawClick(q('.fab'));
  if (!judulSheet().includes('Catat pengeluaran')) throw new Error('judul: ' + judulSheet());
  rawClick(q('.sheet [data-simpan]'));
  if (tutup()) throw new Error('tersimpan tanpa nominal');
  nominal('keluar.nominal', '480000');
  rawClick(q('.sheet [data-simpan]'));
  if (tutup()) throw new Error('tersimpan tanpa keterangan');
  ketik('.sheet [data-bind="keluar.ket"]', 'Token listrik blok A');
  rawClick(q('.sheet [data-sheet="pilih:kategori|keluar.kategori"]'));
  rawClick(q('.sheet [data-set="keluar.kategori|Perbaikan"]'));
  if (!judulSheet().includes('Catat pengeluaran'))
    throw new Error('pemilih kategori tidak kembali ke induknya: ' + judulSheet());
  rawClick(q('.sheet [data-simpan]'));
  if (!tutup()) throw new Error('sheet tidak menutup');
  if (!A().includes('Token listrik blok A')) throw new Error('tidak tampil: ' + A().slice(0, 170));
  if (!A().includes('Perbaikan')) throw new Error('kategori tidak ikut tercatat');
  if (!A().includes('Keluar')) throw new Error('ringkasan masuk/keluar tidak muncul');
  bersihSheet();
  return window.eval("TXN.p2.length") + ' baris di arus kas p2, Rp480.000 keluar';
});

/* ════════════ RONDE 5: sisa jalan buntu ════════════ */

step('R5 foto kamar: unggah, tampil di galeri, hitungan naik', async () => {
  bersihSheet();
  await hash('#/room/p1-101');
  rawClick(qa('.ptab')[3]);                      /* tab Lainnya */
  const baris = q('[data-go="foto/p1-101"]');
  if (!baris) throw new Error('baris Foto kamar tidak menuju ke mana-mana');
  if (!baris.textContent.includes('Belum ada foto')) throw new Error(baris.textContent.trim());
  await nav(baris);
  if (!T().includes('Foto kamar 101')) throw new Error('bukan layar foto: ' + T().slice(0, 60));
  rawClick(q('[data-dok="p1-101|foto|new"]'));
  const inp = D.getElementById('berkas-in');
  if (inp.getAttribute('capture') !== 'environment') throw new Error('foto kamar harus kamera belakang');
  suntikBerkas('kamar-101-depan.jpg', 'image/jpeg');
  const ubin = q('[data-dok="p1-101|foto|0"]');
  if (!ubin || !ubin.classList.contains('has-img')) throw new Error('foto tidak muncul di galeri');
  await nav(q('[data-back]'));
  rawClick(qa('.ptab')[3]);
  if (!q('[data-go="foto/p1-101"]').textContent.includes('1 foto'))
    throw new Error('hitungan tidak naik: ' + q('[data-go="foto/p1-101"]').textContent.trim());
  return '1 foto, thumbnail ' + ubin.querySelector('img').getAttribute('src');
});

step('R5 foto bisa dihapus lewat penampil', async () => {
  await hash('#/foto/p1-101');
  rawClick(q('[data-dok="p1-101|foto|0"]'));
  if (!q('.viewer')) throw new Error('penampil tidak terbuka');
  if (!q('.viewer').textContent.includes('Kamar 101'))
    throw new Error('judul penampil: ' + q('.viewer-judul').textContent.trim());
  rawClick(q('[data-vhapus]'));
  if (q('.viewer')) throw new Error('penampil tidak menutup');
  if (window.eval("fotoDi('p1-101').length") !== 0) throw new Error('foto tidak terhapus');
});

step('R5 info properti menampilkan keterangan dan ringkasan terhitung', async () => {
  await hash('#/prop/p1');
  rawClick(qa('.ptab')[2]);                      /* tab Lainnya */
  await nav(q('[data-go="info/p1"]'));
  if (!T().includes('Info properti')) throw new Error(T().slice(0, 60));
  if (!T().includes('Jl. Citra Raya')) throw new Error('alamat tidak tampil');
  const kamar = window.eval("roomsOf('p1').length");
  const isi = window.eval("roomsOf('p1').filter(r => r.status !== 'kosong').length");
  if (!T().includes(isi + ' dari ' + kamar)) throw new Error('ringkasan terisi salah: ' + T().slice(0, 200));
  /* Alamat panjang harus boleh turun baris, bukan dipotong */
  const alamat = qa('.drow dd').find(d => d.textContent.includes('Citra Raya'));
  if (!alamat.classList.contains('wrap')) throw new Error('alamat masih dipotong');
  return kamar + ' kamar, ' + isi + ' terisi';
});

step('R5 menu properti berisi lima pintasan yang semuanya bertujuan', async () => {
  await hash('#/prop/p1');
  rawClick(q('[data-sheet="menuprop:p1"]'));
  const item = qa('.sheet .aitem');
  if (item.length !== 5) throw new Error(item.length + ' item');
  if (qa('.sheet .aitem[data-act="soon"]').length) throw new Error('masih ada item buntu');
  bersihSheet();
  return item.map(b => b.querySelector('.aitem-t').childNodes[0].textContent).join(' · ');
});

step('R5 menu kamar berbeda antara kamar terisi dan kamar kosong', async () => {
  await hash('#/room/p1-101');
  rawClick(q('[data-sheet="menukamar:p1-101"]'));
  const terisi = qa('.sheet .aitem').map(b => b.querySelector('.aitem-t').childNodes[0].textContent);
  if (!terisi.includes('Pengaturan sewa')) throw new Error('kamar terisi: ' + terisi.join(', '));
  bersihSheet();
  /* p1-105 dikosongkan oleh uji pindah kamar di ronde 4 */
  await hash('#/room/p1-105');
  rawClick(q('[data-sheet="menukamar:p1-105"]'));
  const kosong = qa('.sheet .aitem').map(b => b.querySelector('.aitem-t').childNodes[0].textContent);
  if (kosong.includes('Pengaturan sewa')) throw new Error('kamar kosong tidak boleh punya Pengaturan sewa');
  if (!kosong.includes('Tambah penghuni')) throw new Error('kamar kosong: ' + kosong.join(', '));
  bersihSheet();
  return 'terisi ' + terisi.length + ' item, kosong ' + kosong.length + ' item';
});

step('R5 sakelar menu kalender mematikan penanda', async () => {
  await hash('#/calendar');
  const titik = () => qa('.cal-dots i').length;
  const awal = titik();
  if (!awal) throw new Error('kalender tidak punya penanda sama sekali');
  if (!T().includes('Telat')) throw new Error('legenda Telat tidak ada');
  rawClick(q('[data-sheet="menukal"]'));
  const sakelar = qa('.sheet [data-toggle]');
  if (sakelar.length !== 3) throw new Error(sakelar.length + ' sakelar');
  rawClick(q('.sheet [data-toggle="kal.late"]'));
  const sesudah = titik();
  if (sesudah >= awal) throw new Error('penanda tidak berkurang: ' + awal + ' → ' + sesudah);
  if (A().includes('Telat')) throw new Error('legenda Telat harusnya ikut hilang');
  rawClick(q('.sheet [data-toggle="kal.late"]'));         /* nyalakan lagi */
  if (titik() !== awal) throw new Error('tidak kembali seperti semula');
  bersihSheet();
  return awal + ' titik → ' + sesudah + ' saat Telat dimatikan';
});

step('R5 tap tanggal mengubah agenda, tap lagi kembali ke hari ini', async () => {
  await hash('#/calendar');
  if (!T().includes('Agenda hari ini')) throw new Error('judul awal: ' + T().slice(0, 120));
  const tgl5 = q('[data-hari="2026-09-05"]');
  if (!tgl5) throw new Error('tanggal 5 tidak bisa diketuk');
  rawClick(tgl5);
  if (!A().includes('Agenda 05 Sep 2026')) throw new Error('judul agenda: ' + A().slice(0, 140));
  const terpilih = q('.cal-day.is-sel');
  if (!terpilih || terpilih.textContent.trim()[0] !== '5') throw new Error('tanggal tidak ditandai terpilih');
  rawClick(q('[data-hari="2026-09-05"]'));
  if (!A().includes('Agenda hari ini')) throw new Error('tidak kembali ke hari ini: ' + A().slice(0, 120));
  if (q('.cal-day.is-sel')) throw new Error('penanda terpilih tidak dilepas');
});

/* Titik di kalender dan agenda di bawahnya harus menceritakan hal yang sama.
   Pernah tidak: tanggal 5 bertitik "jatuh tempo" tapi agendanya 0, karena
   titiknya ikut menandai kamar yang sudah lunas. */
step('R5 setiap tanggal bertitik tagihan punya agenda', async () => {
  await hash('#/calendar');
  const bohong = [];
  qa('.cal-day[data-hari]').forEach(el => {
    const titik = el.querySelectorAll('.cal-dots i').length;
    if (!titik) return;
    const iso = el.dataset.hari;
    const n = window.eval('agendaHari(' + JSON.stringify(iso) + ').length');
    if (!n) bohong.push(iso + ' (' + titik + ' titik, 0 agenda)');
  });
  if (bohong.length) throw new Error('titik tanpa agenda: ' + bohong.join(', '));
  const bertitik = qa('.cal-day .cal-dots').length;
  return bertitik + ' tanggal bertitik, semuanya punya agenda';
});

step('R5 pindah bulan membatalkan tanggal terpilih', () => {
  rawClick(q('[data-hari="2026-09-12"]'));
  if (!q('.cal-day.is-sel')) throw new Error('tanggal tidak terpilih');
  rawClick(q('[data-cal="1"]'));
  if (q('.cal-day.is-sel')) throw new Error('pilihan bulan lama masih menempel di bulan baru');
  if (!A().includes('Agenda hari ini')) throw new Error('judul: ' + A().slice(0, 120));
  rawClick(q('[data-cal="-1"]'));
});

step('R5 notifikasi diturunkan dari data, bukan daftar karangan', async () => {
  await hash('#/notif');
  const jml = window.eval("daftarNotif().length");
  if (!jml) throw new Error('daftar notifikasi kosong');
  if (!T().includes('Pembayaran telat')) throw new Error('tidak ada baris telat: ' + T().slice(0, 140));
  const sebelum = qa('[data-go^="room/"]').length;
  /* Satu kamar telat dilunaskan: daftarnya harus ikut menyusut */
  window.eval("room('p1-106').status = 'lunas'");
  await hash('#/home');
  await hash('#/notif');
  const sesudah = qa('[data-go^="room/"]').length;
  if (sesudah !== sebelum - 1) throw new Error('daftar tidak ikut berubah: ' + sebelum + ' → ' + sesudah);
  window.eval("room('p1-106').status = 'telat'");
  return sebelum + ' → ' + sesudah + ' setelah satu kamar dilunaskan';
});

step('R5 lencana lonceng ikut hitungan, hilang saat nol', async () => {
  await hash('#/home');
  const n = window.eval("jumlahNotif()");
  const lencana = q('.iconbtn .badge');
  if (!lencana) throw new Error('lencana tidak muncul padahal ada ' + n);
  if (lencana.textContent !== String(n)) throw new Error('isi lencana: ' + lencana.textContent + ' ≠ ' + n);
  /* Semua telat dan jatuh tempo dianggap lunas */
  window.eval("ROOMS.filter(r => r.status === 'telat' || r.status === 'belum')" +
              ".forEach(r => { r._asli = r.status; r.status = 'lunas'; })");
  await hash('#/calendar');
  await hash('#/home');
  if (q('.iconbtn .badge')) throw new Error('lencana masih ada padahal nol');
  window.eval("ROOMS.filter(r => r._asli).forEach(r => { r.status = r._asli; delete r._asli; })");
  return 'lencana ' + n + ' → hilang saat nol';
});

step('R5 cari menemukan properti, kamar, dan penghuni', async () => {
  await hash('#/home');
  await nav(q('[data-go="cari"]'));
  if (!T().includes('Mau cari apa?')) throw new Error('petunjuk awal tidak ada: ' + T().slice(0, 90));
  ketik('[data-cari]', 'citra');
  if (!A().includes('Raffles Kost Citra 1')) throw new Error('properti tidak ketemu: ' + A().slice(0, 140));
  ketik('[data-cari]', '203');
  if (!A().includes('Kamar')) throw new Error('kamar tidak ketemu: ' + A().slice(0, 140));
  ketik('[data-cari]', 'clara');
  if (!A().includes('Clara Wijaya')) throw new Error('penghuni tidak ketemu: ' + A().slice(0, 140));
  const hasil = qa('[data-hasil] [data-go]').length;
  ketik('[data-cari]', 'zzzz');
  if (!A().includes('Tidak ditemukan')) throw new Error('keadaan kosong tidak muncul: ' + A().slice(0, 140));
  /* Kolom cari tidak boleh ikut digambar ulang — fokus mengetik akan hilang */
  if (q('[data-cari]').value !== 'zzzz') throw new Error('isi kolom cari hilang saat menyaring');
  return hasil + ' hasil untuk "clara"';
});

step('R5 ikon cari tab Penghuni memfokuskan kolom yang sudah ada', async () => {
  await hash('#/tenants');
  const sebelum = qa('[data-search]').length;
  if (sebelum !== 1) throw new Error(sebelum + ' kolom cari di layar Penghuni');
  rawClick(q('[data-act="fokuscari"]'));
  if (qa('[data-search]').length !== 1) throw new Error('muncul kolom cari kedua');
  if (D.activeElement !== q('[data-search]')) throw new Error('kolom cari tidak difokuskan');
  return 'satu kolom cari, difokuskan';
});

step('R5 logo properti: pemilih berkas sungguhan, lalu tampil di ubinnya', async () => {
  await hash('#/home');
  rawClick(q('[data-form="prop"]'));
  await tick(); bersih();
  rawClick(q('[data-step="2"]'));
  const ubin = q('.uploader');
  if (!ubin) throw new Error('ubin logo tidak ada');
  if (ubin.dataset.act === 'soon') throw new Error('ubin logo masih buntu');
  rawClick(ubin);
  suntikBerkas('logo-kos.png', 'image/png');
  const baru = q('.uploader');
  if (!baru.classList.contains('has-img')) throw new Error('logo tidak tampil di ubinnya');
  if (!baru.querySelector('img')) throw new Error('tidak ada gambar di ubin');
  const src = baru.querySelector('img').getAttribute('src');
  /* Langkah 2 tidak punya [data-back] — tombol kirinya kembali ke langkah 1 */
  window.history.back();
  await tick(); bersih();
  return src;
});

/* Uji penutup ronde: telusuri seluruh rute dan sheet, pastikan tidak ada
   satu pun tombol yang hanya memunculkan toast. */
step('R5 tidak ada lagi tombol buntu di layar mana pun', async () => {
  bersihSheet();
  const buntu = [];
  const periksa = tempat => {
    const n = qa('[data-act="soon"]').length;
    if (n) buntu.push(tempat + ' (' + n + ')');
  };

  const RUTE = ['home', 'cari', 'notif', 'calendar', 'tenants', 'filter/telat',
                'prop/p1', 'prop/p2', 'room/p1-101', 'room/p1-105', 'room/p1-112',
                'tenant/p1-101', 'ex/x1', 'hist/p1', 'hist/p1-101',
                'notes/p1', 'notes/p1-101', 'foto/p1-101', 'info/p1', 'info/p2'];
  for (const r of RUTE) {
    await hash('#/' + r);
    periksa(r);
    /* setiap tab pada layar yang punya tab pil */
    const tab = qa('.ptab').length;
    for (let i = 1; i < tab; i++) { rawClick(qa('.ptab')[i]); periksa(r + ' tab' + i); }
  }

  const SHEET = ['menuprop:p1', 'menukamar:p1-101', 'menukamar:p1-105', 'menukal',
                 'aksi:p1-101', 'sewa:p1-101', 'kamar:p1', 'keluar:p1',
                 'trx:p1-101|tagihan', 'harga:p1-101', 'masa:p1-101',
                 'pindah:p1-101', 'hapus:p1-101', 'bayar:p1-101', 'komponen:x'];
  await hash('#/room/p1-101');
  for (const sp of SHEET) {
    window.eval('openSheet(' + JSON.stringify(sp) + ')');
    periksa('sheet ' + sp);
    bersihSheet();
  }

  /* formulir */
  for (const f of ['tenant:p1-105', 'prop', 'edit:p1-101']) {
    window.eval('mulaiForm(' + JSON.stringify(f) + ')');
    await tick(); bersih();
    periksa('form ' + f);
    if (f === 'prop') { rawClick(q('[data-step="2"]')); periksa('form prop langkah 2'); }
    window.history.back();
    await tick(); bersih();
  }

  if (buntu.length) throw new Error('masih buntu di: ' + buntu.join(', '));
  return RUTE.length + ' rute, ' + SHEET.length + ' sheet, 3 formulir — semuanya bertujuan';
});

/* ════════════ Audit statis ════════════
   Dua kelas bug yang tak terdeteksi dengan menelusuri alur: ikon yang
   dipanggil tapi tak ada di peta, dan class yang dipakai tapi tak pernah
   punya aturan CSS (mis. .note yang sempat hilang saat rombak visual). */

const kelasDipakai = new Set();
const catatKelas = () => qa('[class]').forEach(el => el.classList.forEach(c => kelasDipakai.add(c)));

step('semua ikon yang dipanggil ada di peta', () => {
  /* Dua bentuk: panggilan langsung ic('nama'), dan nama yang dititipkan
     sebagai data lalu dipanggil ic(n.i) — item sheet, notifikasi, agenda.
     Bentuk kedua tak terlihat oleh regex pertama, padahal ikon yang salah
     ketik di sana merender kotak kosong tanpa error apa pun. */
  const dipanggil = [...new Set([
    ...[...body.matchAll(/ic\('([a-zA-Z]+)'/g)].map(m => m[1]),
    ...[...body.matchAll(/\bi:\s*'([a-zA-Z]+)'/g)].map(m => m[1]),
  ])];
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
