/* =====================================================================
   PENGATURAN — HANYA BAGIAN INI YANG WAJIB KAMU ISI
   Tempel di antara tanda kutip "" (jangan hapus tanda kutipnya).
   ===================================================================== */
const CONFIG = {
  // 1) URL Web App dari Google Apps Script (berakhiran /exec)
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbzkU8rtPRFYZnmRtmo4ZWrGMb6cc-r1rLbrLQPR3EtNBqbtyPso95BQCWLhD4Wao-5G/exec",

  // 2) Link Google Spreadsheet tempat data disimpan
  SPREADSHEET_URL: "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ/edit#gid=0"
};
/* ===================================================================== */


/* ---------- Daftar pertanyaan (boleh diubah teks pilihannya) ----------
   PENTING: jangan ubah "id". Untuk pertanyaan durasi, teks pilihan harus
   sama persis dengan yang ada di DURASI_JAM pada Code.gs. */
const PERTANYAAN = [
  { id: "nama", tipe: "text", wajib: false, label: "Siapa nama panggilanmu?", placeholder: "Contoh: Nadia" },
  { id: "jenjang", tipe: "select", wajib: true, label: "Kamu sekarang di jenjang apa?",
    opsi: ["SMP", "SMA / SMK", "Kuliah", "Sudah bekerja", "Lainnya"] },
  { id: "genre", tipe: "checkbox", wajib: true, maks: 3, label: "Genre musik favoritmu?", hint: "Pilih maksimal 3.",
    opsi: ["Pop", "K-Pop", "Hip-hop / Rap", "R&B", "Rock", "Indie", "EDM", "Dangdut", "Jazz", "Lo-fi", "Anime / OST", "Lainnya"] },
  { id: "artis", tipe: "text", wajib: true, label: "Penyanyi atau band yang paling sering kamu dengar?",
    hint: "Boleh lebih dari satu, pisahkan dengan koma.", placeholder: "Contoh: Tulus, NewJeans, Taylor Swift" },
  { id: "platform", tipe: "radio", wajib: true, label: "Platform yang paling sering kamu pakai?",
    opsi: ["Spotify", "YouTube / YouTube Music", "Joox", "Apple Music", "TikTok / Reels", "Lainnya"] },
  { id: "frekuensi", tipe: "radio", wajib: true, label: "Seberapa sering kamu mendengarkan musik?",
    opsi: ["Setiap hari", "4-6 kali seminggu", "1-3 kali seminggu", "Jarang"] },
  { id: "durasi", tipe: "radio", wajib: true, label: "Kira-kira berapa jam sehari kamu mendengarkan musik?",
    opsi: ["Kurang dari 1 jam", "1-2 jam", "3-4 jam", "5-6 jam", "Lebih dari 6 jam"] },
  { id: "waktu", tipe: "checkbox", wajib: true, label: "Kapan biasanya kamu mendengarkan musik?", hint: "Boleh pilih lebih dari satu.",
    opsi: ["Pagi", "Siang", "Sore", "Malam", "Tengah malam"] },
  { id: "aktivitas", tipe: "checkbox", wajib: true, label: "Sambil apa kamu biasanya mendengarkan musik?", hint: "Boleh pilih lebih dari satu.",
    opsi: ["Belajar", "Mengerjakan tugas", "Di perjalanan", "Olahraga", "Rebahan / santai", "Bermain game", "Beres-beres", "Sebelum tidur"] },
  { id: "penting", tipe: "rating", wajib: true, label: "Seberapa penting musik dalam hidupmu?", kiri: "Biasa saja", kanan: "Penting banget" },
  { id: "puas", tipe: "rating", wajib: true, label: "Seberapa puas kamu dengan cara mendengarkan musikmu sekarang?", kiri: "Kurang puas", kanan: "Puas banget" }
];


/* ---------- Fungsi bantu ---------- */
const $ = (id) => document.getElementById(id);

function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function pesan(teks) { $("formMsg").textContent = teks || ""; }

function configSiap() {
  if (!CONFIG.WEB_APP_URL.startsWith("https://script.google.com/")) {
    return "Isi dulu WEB_APP_URL di file App.js (lihat panduan).";
  }
  if (!CONFIG.SPREADSHEET_URL.startsWith("https://docs.google.com/spreadsheets/")) {
    return "Isi dulu SPREADSHEET_URL di file App.js (lihat panduan).";
  }
  return "";
}


/* ---------- Membuat form dari daftar PERTANYAAN ---------- */
function buatForm() {
  $("questions").innerHTML = PERTANYAAN.map((q, i) => {
    let isi = "";
    if (q.tipe === "text") {
      isi = `<input type="text" id="f_${q.id}" maxlength="100" placeholder="${q.placeholder || ""}">`;
    } else if (q.tipe === "select") {
      isi = `<select id="f_${q.id}"><option value="">Pilih salah satu...</option>${q.opsi.map((o) => `<option>${o}</option>`).join("")}</select>`;
    } else if (q.tipe === "radio" || q.tipe === "checkbox") {
      isi = `<div class="chips">${q.opsi.map((o) =>
        `<label class="chip"><input type="${q.tipe}" name="${q.id}" value="${o}"><span>${o}</span></label>`).join("")}</div>`;
    } else if (q.tipe === "rating") {
      isi = `<div class="rate" data-id="${q.id}" data-nilai="0">${[1, 2, 3, 4, 5].map((n) =>
        `<button type="button" data-n="${n}" aria-label="${n} dari 5">🎵</button>`).join("")}</div>
        <div class="rate-ends"><span>${q.kiri}</span><span>${q.kanan}</span></div>`;
    }
    return `<div class="q"><h3>${i + 1}. ${q.label}${q.wajib ? "" : " <small>(boleh dikosongkan)</small>"}</h3>
      ${q.hint ? `<p class="hint">${q.hint}</p>` : ""}${isi}</div>`;
  }).join("");

  // Klik rating
  document.querySelectorAll(".rate").forEach((r) => {
    r.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const n = Number(b.dataset.n);
      r.dataset.nilai = n;
      r.querySelectorAll("button").forEach((x) => x.classList.toggle("on", Number(x.dataset.n) <= n));
    });
  });

  // Batasi jumlah pilihan checkbox
  $("questions").addEventListener("change", (e) => {
    const t = e.target;
    if (t.type !== "checkbox") return;
    const q = PERTANYAAN.find((x) => x.id === t.name);
    if (q && q.maks && document.querySelectorAll(`input[name="${q.id}"]:checked`).length > q.maks) {
      t.checked = false;
      pesan(`Maksimal ${q.maks} pilihan ya.`);
    } else {
      pesan("");
    }
  });
}


/* ---------- Mengambil & memeriksa jawaban ---------- */
function ambilJawaban() {
  const data = {};
  let error = "";
  PERTANYAAN.forEach((q, i) => {
    let v;
    if (q.tipe === "text" || q.tipe === "select") v = $("f_" + q.id).value.trim();
    else if (q.tipe === "radio") {
      const c = document.querySelector(`input[name="${q.id}"]:checked`);
      v = c ? c.value : "";
    } else if (q.tipe === "checkbox") {
      v = [...document.querySelectorAll(`input[name="${q.id}"]:checked`)].map((x) => x.value);
    } else {
      v = Number(document.querySelector(`.rate[data-id="${q.id}"]`).dataset.nilai) || 0;
    }
    const kosong = Array.isArray(v) ? v.length === 0 : (v === "" || v === 0);
    if (q.wajib && kosong && !error) error = `Pertanyaan nomor ${i + 1} belum diisi.`;
    data[q.id] = v;
  });
  return { data, error };
}


/* ---------- Kirim ke Google Sheets ---------- */
async function kirim(e) {
  e.preventDefault();
  const cfg = configSiap();
  if (cfg) return pesan(cfg);

  const { data, error } = ambilJawaban();
  if (error) return pesan(error);

  const tombol = $("submitBtn");
  tombol.disabled = true;
  tombol.textContent = "Mengirim...";
  pesan("");
  try {
    const r = await fetch(CONFIG.WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ spreadsheetUrl: CONFIG.SPREADSHEET_URL, data })
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.pesan);
    $("surveyForm").hidden = true;
    $("terimaKasih").hidden = false;
  } catch (err) {
    pesan("Gagal mengirim: " + err.message);
  } finally {
    tombol.disabled = false;
    tombol.textContent = "Kirim jawaban";
  }
}

function isiLagi() {
  $("surveyForm").reset();
  document.querySelectorAll(".rate").forEach((r) => {
    r.dataset.nilai = 0;
    r.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
  });
  pesan("");
  $("terimaKasih").hidden = true;
  $("surveyForm").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}


/* ---------- Halaman hasil ---------- */
async function muatHasil() {
  const box = $("hasilBox");
  const cfg = configSiap();
  if (cfg) { box.innerHTML = `<p class="error">${esc(cfg)}</p>`; return; }
  box.innerHTML = `<p class="loading">Memuat data terbaru...</p>`;
  try {
    const url = CONFIG.WEB_APP_URL + "?action=hasil&sheet=" + encodeURIComponent(CONFIG.SPREADSHEET_URL) + "&t=" + Date.now();
    const r = await fetch(url);
    const j = await r.json();
    if (!j.ok) throw new Error(j.pesan);
    gambarHasil(j.hasil);
  } catch (err) {
    box.innerHTML = `<p class="error">Gagal memuat hasil: ${esc(err.message)}</p>`;
  }
}

function gambarHasil(h) {
  const box = $("hasilBox");
  if (!h.total) {
    box.innerHTML = `<div class="card kosong">Belum ada jawaban masuk. Jadilah yang pertama mengisi survei!</div>`;
    return;
  }
  const teratas = (arr) => (arr.length ? arr[0].label : "-");
  const kartu = [
    ["Jumlah responden", h.total + " orang"],
    ["Genre terpopuler", teratas(h.genre)],
    ["Platform terbanyak", teratas(h.platform)],
    ["Artis terbanyak dipilih", teratas(h.artis)],
    ["Rata-rata durasi", h.rataDurasi + " jam/hari"],
    ["Waktu favorit", teratas(h.waktu)],
    ["Aktivitas terpopuler", teratas(h.aktivitas)],
    ["Pentingnya musik", h.rataPenting + " / 5"],
    ["Tingkat kepuasan", h.rataPuas + " / 5"]
  ].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${esc(v)}</b></div>`).join("");

  const grafik = (judul, arr) => `<div class="card"><h3>${judul}</h3>${arr.slice(0, 8).map((x) =>
    `<div class="baris"><span class="nama">${esc(x.label)}</span>
     <div class="track"><div class="fill" data-w="${Math.round((x.count / h.total) * 100)}"></div></div>
     <span class="angka">${x.count}</span></div>`).join("")}</div>`;

  const tabelArtis = `<div class="card"><h3>10 artis paling banyak dipilih</h3><table>${h.artis.slice(0, 10).map((x, i) =>
    `<tr><td>${i + 1}</td><td>${esc(x.label)}</td><td>${x.count}</td></tr>`).join("")}</table></div>`;

  box.innerHTML = `<div class="stats">${kartu}</div>
    ${grafik("Genre favorit", h.genre)}
    ${grafik("Platform yang dipakai", h.platform)}
    ${tabelArtis}
    ${grafik("Seberapa sering mendengarkan", h.frekuensi)}
    ${grafik("Waktu mendengarkan", h.waktu)}
    ${grafik("Aktivitas sambil mendengarkan", h.aktivitas)}
    ${grafik("Jenjang responden", h.jenjang)}
    <p class="catatan">Panjang batang = persentase responden yang memilih. Data terakhir masuk: ${esc(h.terakhir || "-")}</p>`;

  setTimeout(() => {
    box.querySelectorAll(".fill").forEach((f) => { f.style.width = f.dataset.w + "%"; });
  }, 60);
}


/* ---------- Pindah tab ---------- */
function bukaTab(nama) {
  $("view-form").hidden = nama !== "form";
  $("view-hasil").hidden = nama !== "hasil";
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("aktif", b.dataset.view === nama));
  if (nama === "hasil") muatHasil();
}


/* ---------- Mulai ---------- */
buatForm();
$("surveyForm").addEventListener("submit", kirim);
$("btnIsiLagi").addEventListener("click", isiLagi);
$("btnLihatHasil").addEventListener("click", () => bukaTab("hasil"));
$("btnSegarkan").addEventListener("click", muatHasil);
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => bukaTab(b.dataset.view)));
