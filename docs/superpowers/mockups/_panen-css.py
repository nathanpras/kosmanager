"""Panen CSS mockup jadi src/style.mobile.css.

Setiap selektor diawali `.kmob` supaya menang atas aturan aplikasi tanpa
bergantung pada lapisan CSS — aturan tanpa lapisan selalu menang atas yang
berlapis, dan src/style.css seluruhnya tanpa lapisan.
"""
import re, pathlib

mock = pathlib.Path('docs/superpowers/mockups/kosmanager-mobile.html').read_text()
css = mock[mock.index('<style>') + len('<style>'):mock.index('</style>')]

# Buang deklarasi urutan lapis dan pembungkus @layer; lapisan tidak dipakai.
css = re.sub(r'@layer\s+tokens\s*,\s*components\s*,\s*screens\s*;', '', css)

def buka_layer(teks):
    """Buang `@layer nama {` beserta `}` pasangannya, sisakan isinya."""
    hasil, i = [], 0
    while True:
        m = re.search(r'@layer\s+\w+\s*\{', teks[i:])
        if not m:
            hasil.append(teks[i:])
            break
        awal = i + m.start()
        hasil.append(teks[i:awal])
        j, dalam = i + m.end(), 1
        while j < len(teks) and dalam:
            if teks[j] == '{': dalam += 1
            elif teks[j] == '}': dalam -= 1
            j += 1
        hasil.append(teks[awal + m.end() - m.start() + (i - i):j - 1] if False else teks[i + m.end():j - 1])
        i = j
    return ''.join(hasil)

css = buka_layer(css)

# Aturan yang milik bingkai telepon mockup, bukan milik aplikasi.
BUANG_SELEKTOR = {
    '*', '*::before', '*::after', 'html', 'body', 'button', ':focus-visible',
    '.phone', '.phone::after', '.statusbar', '.statusbar .sb-r',
    # Reset tipografi dan fokus; versi yang berlaku ditulis tangan di EKOR,
    # karena `.kmob body` adalah omong kosong — body tak pernah di dalam .kmob.
    'input', 'textarea',
}

def perlu_dibuang(sel):
    bagian = [s.strip() for s in sel.split(',')]
    return all(b in BUANG_SELEKTOR or b.startswith('body,') for b in bagian)

def awali(sel):
    """Beri awalan .kmob pada tiap selektor dalam satu daftar."""
    keluar = []
    for s in [x.strip() for x in sel.split(',') if x.strip()]:
        if s.startswith('@') or s.startswith('from') or s.startswith('to') or re.match(r'^\d', s):
            keluar.append(s); continue
        if s == ':root':
            keluar.append('.kmob'); continue
        keluar.append('.kmob ' + s if not s.startswith('.kmob') else s)
    return ', '.join(keluar)

# Urai blok tingkat atas satu per satu, hormati @media dan @keyframes.
def olah(teks, dalam_keyframes=False):
    keluar, i, n = [], 0, len(teks)
    while i < n:
        tanda = teks.find('{', i)
        if tanda < 0:
            keluar.append(teks[i:]); break
        sel_mentah = teks[i:tanda]
        # komentar sebelum selektor ikut dibawa
        j, dalam = tanda + 1, 1
        while j < n and dalam:
            if teks[j] == '{': dalam += 1
            elif teks[j] == '}': dalam -= 1
            j += 1
        isi = teks[tanda + 1:j - 1]
        sel = sel_mentah.strip()
        komentar = ''
        mk = re.match(r'^((?:\s*/\*[\s\S]*?\*/\s*)*)', sel_mentah)
        if mk:
            komentar = mk.group(1)
            sel = sel_mentah[len(komentar):].strip()

        if sel.startswith('@keyframes'):
            keluar.append(komentar + sel + '{' + isi + '}')
        elif sel.startswith('@media') or sel.startswith('@supports'):
            keluar.append(komentar + sel + '{' + olah(isi) + '}')
        elif dalam_keyframes:
            keluar.append(komentar + sel + '{' + isi + '}')
        elif perlu_dibuang(sel):
            pass   # dibuang: milik bingkai telepon
        else:
            keluar.append(komentar + awali(sel) + '{' + isi + '}')
        i = j
    return ''.join(keluar)

hasil = olah(css)

# Nama @keyframes bersifat global: yang didefinisikan terakhir menang untuk
# SELURUH halaman. modalIn, sheetUp, dan toastIn ada di kedua stylesheet, jadi
# tanpa awalan animasi desktop akan berubah diam-diam. Semua diberi awalan,
# bukan hanya yang bentrok, supaya tambahan berikutnya aman tanpa dipikir lagi.
nama_kf = re.findall(r'@keyframes\s+([\w-]+)', hasil)
for nama in sorted(set(nama_kf), key=len, reverse=True):
    hasil = re.sub(r'@keyframes\s+' + re.escape(nama) + r'\b', '@keyframes kmob-' + nama, hasil)
    # Rujukan hanya diganti di dalam deklarasi animation / animation-name
    def ganti(m, _n=nama):
        return m.group(1) + re.sub(r'\b' + re.escape(_n) + r'\b', 'kmob-' + _n, m.group(2))
    hasil = re.sub(r'(animation(?:-name)?\s*:)([^;}]*)', ganti, hasil)
print('keyframes diberi awalan:', len(set(nama_kf)))

kepala = """/* Shell mobile bergaya Kamaru — dipanen dari
   docs/superpowers/mockups/kosmanager-mobile.html (ronde 1-5).

   SETIAP selektor di berkas ini diawali `.kmob`. Itu bukan gaya penulisan,
   melainkan syarat: src/style.css seluruhnya tanpa lapisan, dan aturan tanpa
   lapisan selalu menang atas aturan berlapis — jadi @layer tidak bisa dipakai
   untuk melindungi diri di sini. `.kmob .card` (0,2,0) menang atas `.card`
   (0,1,0), dan desktop tidak pernah punya `.kmob` sebagai leluhur.

   Aturan bingkai telepon milik mockup (html, body, .phone, .statusbar) dan
   reset global sengaja tidak ikut — di aplikasi sungguhan layarnya memang
   seluruh layar, dan resetnya sudah diurus src/style.css.

   Jangan sunting dengan tangan tanpa alasan: berkas ini hasil panen. Kalau
   bentuknya perlu berubah, ubah mockup-nya lalu panen ulang supaya mockup
   tetap jadi acuan desain yang sahih. */

"""
# Ditulis tangan, bukan hasil panen. Mockup menaruh semua ini di `.phone`,
# yaitu bingkai telepon palsu; di aplikasi sungguhan perannya diambil akar
# shell. Bagian ini sengaja ditaruh di skrip panen supaya tidak hilang setiap
# kali CSS-nya dipanen ulang.
EKOR = """

/* ───────────────────────────────────────────────────────────────
   Ditulis tangan — bukan hasil panen.
   Pengganti `.phone` milik mockup: di sana ia bingkai telepon palsu,
   di sini ia seluruh layar. Keturunannya (.stack, .screen, .dock, .sheet)
   diposisikan absolut terhadap akar ini, jadi akar WAJIB jadi acuan
   posisi dan WAJIB memotong luapan.
   ─────────────────────────────────────────────────────────────── */
.kmob {
  position: fixed; inset: 0; z-index: 1;
  overflow: hidden; isolation: isolate;
  background: var(--ground);
  font-family: var(--f-ui);
  font-size: 15px; line-height: 1.45; color: var(--ink);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
.kmob *, .kmob *::before, .kmob *::after { box-sizing: border-box; margin: 0; padding: 0; }
.kmob button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
/* l berekor (cv05) dan angka terbuka (ss01): Il1 tetap bisa dibedakan */
.kmob, .kmob button, .kmob input, .kmob textarea { font-feature-settings: 'cv05', 'ss01'; }
.kmob :focus-visible { outline: 2px solid var(--brand); outline-offset: 3px; border-radius: 8px; }
/* Bilah status palsu milik mockup tidak ikut; ruangnya diambil safe area asli */
.kmob .topbar { padding-top: calc(10px + env(safe-area-inset-top, 0px)); }
.kmob .dock   { bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
"""

pathlib.Path('src/style.mobile.css').write_text(kepala + hasil.strip() + EKOR)
print('ditulis: src/style.mobile.css')
