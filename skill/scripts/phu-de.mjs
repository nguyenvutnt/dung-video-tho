#!/usr/bin/env node
// Chèn PHỤ ĐỀ hiển thị lời nói vào index.html của HyperFrames: cả trang ≤ 2 dòng hiện trước,
// chữ đang nói sáng vàng, chữ đã nói trắng, chữ chưa nói mờ. Mốc lấy từ lời đã chép (đã SỬA tên riêng).
// Dùng: node phu-de.mjs <cat.json> --html <dung/index.html> [--mau "#FFD84D"]
// cat.json: { "kho": "doc" | "ngang",
//             "doan": [ { "loi": "c01.json", "media_start": 2, "start": 0, "duration": 4.4 }, … ] }
//   mỗi dòng "doan" = 1 thẻ <video> có lời trong bảng cắt (cùng media_start / start / duration). "loi" tính từ thư mục cat.json.
// Chạy lại bao nhiêu lần cũng được: chỉ thay phần giữa 2 dấu PHU-DE trong index.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const args = process.argv.slice(2);
const lay = (ten, md) => { const i = args.indexOf(ten); return i >= 0 ? args[i + 1] : md; };
const catFile = args.find((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
const htmlFile = lay('--html');
if (!catFile || !htmlFile || args.includes('--help')) {
  console.log('Dùng: node phu-de.mjs <cat.json> --html <dung/index.html> [--mau "#FFD84D"]');
  process.exit(catFile && htmlFile ? 0 : 1);
}
const mau = lay('--mau', '#FFD84D');
if (!/^#[0-9a-fA-F]{6}$/.test(mau)) { console.error('--mau phải dạng #RRGGBB'); process.exit(1); }
const cat = JSON.parse(readFileSync(resolve(catFile), 'utf8'));
const doc = (cat.kho || 'doc') === 'doc';
const MAX_CHU = doc ? 8 : 11;

const docLoi = (p) => {
  const g = JSON.parse(readFileSync(resolve(dirname(resolve(catFile)), p), 'utf8'));
  return (Array.isArray(g) ? g : g.words || (g.segments || []).flatMap((s) => s.words || []))
    .map((w) => ({ text: String(w.text ?? w.word ?? '').trim(), start: Number(w.start), end: Number(w.end) }))
    .filter((w) => w.text && Number.isFinite(w.start));
};

// Đổi mốc chữ từ giờ của clip nguồn sang giờ trên dòng thời gian video.
const chu = [];
for (const d of cat.doan || []) {
  const ms = Number(d.media_start || 0), st = Number(d.start), dur = Number(d.duration);
  for (const w of docLoi(d.loi)) {
    if (w.start < ms - 0.02 || w.end > ms + dur + 0.05) continue; // chữ nằm ngoài đoạn đã cắt
    chu.push({ text: w.text, t: st + (w.start - ms), e: st + (Math.min(w.end, ms + dur) - ms) });
  }
}
chu.sort((a, b) => a.t - b.t);
if (!chu.length) { console.error('Không có chữ nào rơi vào các đoạn — kiểm media_start / duration trong cat.json.'); process.exit(1); }

// Chia trang: ≤ MAX_CHU chữ, ngắt ở dấu câu, chỗ lặng > 0,5 s, hoặc trang dài > 3,5 s.
const trang = [];
let cur = [];
for (const w of chu) {
  const truoc = cur.at(-1);
  if (cur.length && (cur.length >= MAX_CHU || w.t - truoc.e > 0.5 || /[.!?…]$/.test(truoc.text) || w.e - cur[0].t > 3.5)) {
    trang.push(cur); cur = [];
  }
  cur.push(w);
}
if (cur.length) trang.push(cur);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r2 = (n) => Math.round(n * 100) / 100;
const html = [];
const js = [];
trang.forEach((tr, i) => {
  const bd = Math.max(0, tr[0].t - 0.1);
  const keTiep = trang[i + 1] ? Math.max(0, trang[i + 1][0].t - 0.1) : Infinity;
  const kt = Math.min(tr.at(-1).e + 0.35, keTiep);
  const id = `pd${i + 1}`;
  html.push(`<div class="clip pd-trang" data-start="${r2(bd)}" data-duration="${r2(kt - bd)}" data-track-index="20">` +
    `<div class="pd-khung" id="${id}">` + tr.map((w, k) => `<span class="pd-chu" id="${id}-${k}">${esc(w.text)}</span>`).join(' ') + '</div></div>');
  js.push(`tl.from("#${id}", { opacity: 0, y: 14, duration: 0.2, ease: "power2.out" }, ${r2(bd)});`);
  tr.forEach((w, k) => {
    js.push(`tl.to("#${id}-${k}", { opacity: 1, color: "${mau}", duration: 0.08 }, ${r2(w.t)}).to("#${id}-${k}", { color: "#ffffff", duration: 0.15 }, ${r2(Math.max(w.e, w.t + 0.12))});`);
  });
});

const css = `<style>
  .pd-trang { position: absolute; left: 0; right: 0; ${doc ? 'bottom: 430px;' : 'bottom: 80px;'} display: flex; justify-content: center; pointer-events: none; }
  .pd-khung { max-width: ${doc ? 920 : 1500}px; text-align: center; font-family: "Be Vietnam Pro", system-ui, sans-serif;
    font-weight: 800; font-size: ${doc ? 64 : 52}px; line-height: 1.22; padding: 10px 22px; border-radius: 18px;
    background: rgba(0, 0, 0, 0.38); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .pd-chu { color: #ffffff; opacity: 0.55; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6); }
</style>`;

let src = readFileSync(resolve(htmlFile), 'utf8');
const A = /<!-- PHU-DE:BAT-DAU -->[\s\S]*?<!-- PHU-DE:KET-THUC -->/;
const B = /\/\/ PHU-DE-JS:BAT-DAU[\s\S]*?\/\/ PHU-DE-JS:KET-THUC/;
if (!A.test(src) || !B.test(src)) {
  console.error('index.html thiếu dấu chèn. Thêm trong #root:  <!-- PHU-DE:BAT-DAU --><!-- PHU-DE:KET-THUC -->\n' +
    'và trong <script> trước dòng window.__timelines:  // PHU-DE-JS:BAT-DAU  (xuống dòng)  // PHU-DE-JS:KET-THUC   (xem khuon-index.html)');
  process.exit(1);
}
src = src.replace(A, () => `<!-- PHU-DE:BAT-DAU -->\n${css}\n${html.join('\n')}\n<!-- PHU-DE:KET-THUC -->`)
  .replace(B, () => `// PHU-DE-JS:BAT-DAU\n${js.join('\n')}\n// PHU-DE-JS:KET-THUC`);
writeFileSync(resolve(htmlFile), src);
console.log(`Đã chèn ${trang.length} trang phụ đề (${chu.length} chữ) vào ${htmlFile}. Chạy lint + snapshot, MỞ ảnh soát chữ sai dấu / che mặt.`);
