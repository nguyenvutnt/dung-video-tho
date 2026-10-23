#!/usr/bin/env node
// Kiểm video đã render: khổ, độ dài, độ to (LUFS), đỉnh, DÒ CHỚP, giây 0 đen, ảnh khung hình để mở ra xem.
// Dùng: node kiem-video.mjs <video.mp4> [--size 1080x1920] [--cam]   (--cam = video cố ý không có tiếng)
// Thoát: 0 = đạt (vẫn phải mở ảnh xem), 2 = hỏng, 1 = lỗi dùng lệnh.
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename, extname, resolve } from 'node:path';
import { probe, doTo, doSang, luoiKhung, anh1Khung, mmss } from './chung.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && !/^\d+x\d+$/.test(a));
if (!file || args.includes('--help')) {
  console.log('Dùng: node kiem-video.mjs <video.mp4> [--size 1080x1920] [--cam]');
  process.exit(file ? 0 : 1);
}
const vao = resolve(file);
if (!existsSync(vao)) { console.error(`Không thấy file: ${vao}`); process.exit(1); }
const iSize = args.indexOf('--size');
const khoDich = iSize >= 0 ? args[iSize + 1] : null;
const cam = args.includes('--cam');

const hong = [];
const nhac = [];
const p = probe(vao);
console.log(`Video: ${basename(vao)} · ${p.rong}×${p.cao} · ${mmss(p.giay)} · ${p.fps} fps · ${p.mb} MB`);

if (p.giay < 1) hong.push('video dài dưới 1 giây — render hỏng?');
if (khoDich && `${p.rong}x${p.cao}` !== khoDich) hong.push(`sai khổ: ${p.rong}x${p.cao}, cần ${khoDich}`);
if (!khoDich && !['1080x1920', '1920x1080', '1080x1080', '2160x3840', '3840x2160'].includes(`${p.rong}x${p.cao}`)) nhac.push(`khổ lạ ${p.rong}x${p.cao}`);

// Tiếng
if (!p.coTieng) (cam ? nhac : hong).push('video KHÔNG có tiếng' + (cam ? '' : ' (nếu cố ý thì thêm --cam)'));
else {
  const { lufs, dinh } = doTo(vao);
  console.log(`Tiếng: ${lufs} LUFS · đỉnh ${dinh} dBFS`);
  if (lufs === null || lufs < -18) hong.push(`tiếng quá nhỏ: ${lufs} LUFS (cần ≥ −18, đẹp nhất −14)`);
  else if (lufs < -16) nhac.push(`tiếng hơi nhỏ: ${lufs} LUFS (mạng xã hội chuẩn −14)`);
  if (lufs !== null && lufs > -9) nhac.push(`tiếng quá to: ${lufs} LUFS — dễ vỡ`);
  if (dinh !== null && dinh > -1) nhac.push(`đỉnh ${dinh} dBFS > −1 — có thể rè trên điện thoại`);
}

// Dò chớp: độ sáng vọt lên/xuống rồi quay về trong ≤ 0,25 s = chớp. Cắt thẳng thì không quay về → chỉ đếm, không lỗi.
const sang = doSang(vao);
const choChop = [];
let catGat = 0;
for (let i = 1; i < sang.length; i++) {
  const truoc = sang[i - 1].y;
  const nhay = sang[i].y - truoc;
  if (Math.abs(nhay) < 40) continue;
  let quayVe = false;
  for (let k = i + 1; k < sang.length && sang[k].t - sang[i].t <= 0.25; k++) {
    if (Math.abs(sang[k].y - truoc) < 15) { quayVe = true; break; }
  }
  if (quayVe) { choChop.push(sang[i].t); i += 3; } else catGat++;
}
if (choChop.length) hong.push(`CHỚP ở giây: ${choChop.map((t) => t.toFixed(2)).join(', ')} — xem lại chuyển cảnh / mốc cắt`);
if (catGat) nhac.push(`${catGat} chỗ đổi sáng mạnh (cắt thẳng giữa cảnh tối ↔ sáng) — cân nhắc mờ chồng 0,3 s`);
if (sang.length && sang[0].y < 16) hong.push('giây 0 gần như đen — khung đầu phải rõ ngay');
const tb = sang.length ? sang.reduce((s, x) => s + x.y, 0) / sang.length : 0;
if (tb && tb < 60) nhac.push(`cả video khá tối (sáng trung bình ${tb.toFixed(0)}/255)`);

// Ảnh để mở ra xem
const thuMuc = join(dirname(vao), `${basename(vao, extname(vao))}-kiem`);
mkdirSync(thuMuc, { recursive: true });
const moc = luoiKhung(vao, p.giay, join(thuMuc, 'luoi.jpg'), { soO: 24, cot: 6, rongO: 300 });
anh1Khung(vao, 0.05, join(thuMuc, '1-dau.jpg'));
anh1Khung(vao, p.giay / 2, join(thuMuc, '2-giua.jpg'));
anh1Khung(vao, p.giay - 0.5, join(thuMuc, '3-cuoi.jpg'));

console.log(`\nẢnh để MỞ ra xem: ${thuMuc}  (luoi.jpg: ô ≈ giây ${moc.join(', ')})`);
if (nhac.length) console.log('\n⚠ Nên xem:\n- ' + nhac.join('\n- '));
if (hong.length) {
  console.log('\n❌ HỎNG:\n- ' + hong.join('\n- '));
  process.exit(2);
}
console.log('\n✅ Máy đo đạt. Vẫn phải MỞ ảnh + xem trọn 1 lượt trước khi giao.');
