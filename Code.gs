/* =====================================================================
   Code.gs — Survei Playlist Kita
   Tempel di: Google Spreadsheet > Ekstensi > Apps Script
   Tidak ada yang wajib diubah. Sheet & kolom dibuat otomatis.
   ===================================================================== */

const NAMA_SHEET = 'Jawaban';

const HEADERS = ['Waktu', 'Nama', 'Jenjang', 'Genre', 'Artis', 'Platform',
                 'Frekuensi', 'Durasi', 'Waktu Favorit', 'Aktivitas',
                 'Pentingnya Musik', 'Kepuasan'];

// Teks harus SAMA PERSIS dengan pilihan durasi di App.js
const DURASI_JAM = {
  'Kurang dari 1 jam': 0.5,
  '1-2 jam': 1.5,
  '3-4 jam': 3.5,
  '5-6 jam': 5.5,
  'Lebih dari 6 jam': 7
};


/* ---------- Jalankan SEKALI secara manual (untuk memberi izin) ---------- */
function siapkanSheet() {
  const sheet = ambilSheet('');
  Logger.log('Siap! Sheet "' + sheet.getName() + '" sudah tersedia.');
}


/* ---------- Menerima permintaan GET (mengambil hasil) ---------- */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.action === 'hasil') {
      return keluarkanJson({ ok: true, hasil: hitungHasil(ambilSheet(p.sheet)) });
    }
    return keluarkanJson({ ok: true, pesan: 'Web App Survei Playlist Kita aktif.' });
  } catch (err) {
    return keluarkanJson({ ok: false, pesan: err.message });
  }
}


/* ---------- Menerima permintaan POST (menyimpan jawaban) ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  let terkunci = false;
  try {
    lock.waitLock(20000);
    terkunci = true;

    const body = JSON.parse(e.postData.contents);
    const d = body.data || {};

    const genre = daftar(d.genre);
    const waktu = daftar(d.waktu);
    const aktivitas = daftar(d.aktivitas);
    const penting = Number(d.penting);
    const puas = Number(d.puas);

    if (!genre.length || genre.length > 3) throw new Error('Genre harus 1 sampai 3 pilihan.');
    if (!waktu.length || !aktivitas.length) throw new Error('Waktu dan aktivitas wajib diisi.');
    if (!d.jenjang || !d.artis || !d.platform || !d.frekuensi || !d.durasi) throw new Error('Ada pertanyaan yang belum diisi.');
    if (!(penting >= 1 && penting <= 5) || !(puas >= 1 && puas <= 5)) throw new Error('Rating harus 1 sampai 5.');

    const sheet = ambilSheet(body.spreadsheetUrl);
    sheet.appendRow([
      new Date(),
      bersih(d.nama, 40),
      bersih(d.jenjang, 40),
      genre.join(', '),
      bersih(d.artis, 100),
      bersih(d.platform, 40),
      bersih(d.frekuensi, 40),
      bersih(d.durasi, 40),
      waktu.join(', '),
      aktivitas.join(', '),
      penting,
      puas
    ]);
    return keluarkanJson({ ok: true });
  } catch (err) {
    return keluarkanJson({ ok: false, pesan: err.message });
  } finally {
    if (terkunci) lock.releaseLock();
  }
}


/* ---------- Mengolah data menjadi statistik ---------- */
function hitungHasil(sheet) {
  const n = sheet.getLastRow();
  const rows = n < 2 ? [] : sheet.getRange(2, 1, n - 1, HEADERS.length).getValues();

  const pecah = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

  // Hitung kemunculan; multi = true untuk kolom yang isinya banyak pilihan
  const hitung = (idx, rapikan) => {
    const m = {};
    rows.forEach((r) => pecah(r[idx]).forEach((x) => {
      const k = x.toLowerCase();
      if (!m[k]) m[k] = { label: rapikan && x === k ? x.replace(/\b\w/g, (c) => c.toUpperCase()) : x, count: 0 };
      m[k].count++;
    }));
    return Object.keys(m).map((k) => m[k]).sort((a, b) => b.count - a.count);
  };

  const rata = (nilaiList) => {
    const ok = nilaiList.filter((v) => typeof v === 'number' && !isNaN(v));
    return ok.length ? Math.round((ok.reduce((a, b) => a + b, 0) / ok.length) * 10) / 10 : 0;
  };

  const terakhir = rows.length && rows[rows.length - 1][0] instanceof Date
    ? Utilities.formatDate(rows[rows.length - 1][0], Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm')
    : '';

  return {
    total: rows.length,
    genre: hitung(3),
    artis: hitung(4, true),
    platform: hitung(5),
    frekuensi: hitung(6),
    waktu: hitung(8),
    aktivitas: hitung(9),
    jenjang: hitung(2),
    rataDurasi: rata(rows.map((r) => DURASI_JAM[String(r[7]).trim()])),
    rataPenting: rata(rows.map((r) => Number(r[10]))),
    rataPuas: rata(rows.map((r) => Number(r[11]))),
    terakhir: terakhir
  };
}


/* ---------- Fungsi bantu ---------- */
function ambilSheet(urlDariWebsite) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Script ini harus dibuat lewat Ekstensi > Apps Script di dalam Google Spreadsheet.');

  // Cek: link di App.js harus spreadsheet yang sama dengan tempat script ini
  if (urlDariWebsite) {
    const cocok = String(urlDariWebsite).match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!cocok || cocok[1] !== ss.getId()) {
      throw new Error('SPREADSHEET_URL di App.js tidak cocok dengan spreadsheet tempat Code.gs dipasang.');
    }
  }

  let sheet = ss.getSheetByName(NAMA_SHEET);
  if (!sheet) sheet = ss.insertSheet(NAMA_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#FFE6EF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function daftar(v) {
  return (Array.isArray(v) ? v : []).slice(0, 12).map((x) => bersih(x, 40)).filter(Boolean);
}

// Merapikan teks + mencegah isi yang dibaca Sheets sebagai rumus
function bersih(v, maks) {
  let s = String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, maks || 100);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function keluarkanJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
