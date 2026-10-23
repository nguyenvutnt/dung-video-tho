#!/usr/bin/env node
// Làm sạch 1 clip thô TRƯỚC khi dựng: khử tạp âm (quạt, gió, xì nền), lọc tiếng ù, tự tăng sáng clip tối.
// Dùng: node lam-sach.mjs <vao.mp4> [--out ra.mp4] [--khu-on nhe|vua|manh|tat] [--sang auto|tat|<0.01–0.2>]
// Mặc định: --khu-on vua --sang auto. Ra: <vao>-sach.mp4 (không ghi đè file gốc).
import { existsSync } from 'node:fs';
import { resolve, dirname, basename, extname, join } from 'node:path';
import { probe, doSang, chay } from './chung.mjs';

const args = process.argv.slice(2);
const vao = args.find((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
if (!vao || args.includes('--help')) {
  console.log('Dùng: node lam-sach.mjs <vao.mp4> [--out ra.mp4] [--khu-on nhe|vua|manh|tat] [--sang auto|tat|0.08]');
  process.exit(vao ? 0 : 1);
}
const lay = (ten, md) => { const i = args.indexOf(ten); return i >= 0 ? args[i + 1] : md; };
const f = resolve(vao);
if (!existsSync(f)) { console.error(`Không thấy file: ${f}`); process.exit(1); }
const ra = resolve(lay('--out', join(dirname(f), `${basename(f, extname(f))}-sach.mp4`)));
if (ra === f) { console.error('File ra trùng file vào — chọn --out khác.'); process.exit(1); }
const khuOn = lay('--khu-on', 'vua');
const sang = lay('--sang', 'auto');

const p = probe(f);
const locTieng = [];
if (p.coTieng && khuOn !== 'tat') {
  // afftdn: khử nhiễu nền theo phổ, tn=1 tự dò mức nhiễu suốt clip. nr = mức giảm (dB) — cao quá giọng bị "méo nước".
  const nr = { nhe: 8, vua: 12, manh: 20 }[khuOn];
  if (!nr) { console.error('--khu-on chỉ nhận nhe|vua|manh|tat'); process.exit(1); }
  locTieng.push('highpass=f=80', `afftdn=nr=${nr}:nf=-30:tn=1`, 'lowpass=f=14000');
}

const locHinh = [];
let tb = null;
if (sang !== 'tat') {
  const ds = doSang(f);
  tb = ds.length ? ds.reduce((s, x) => s + x.y, 0) / ds.length : 128;
  let muc = 0;
  if (sang === 'auto') muc = tb < 70 ? 0.1 : tb < 95 ? 0.06 : 0; // sáng trung bình /255: < 95 là tối với điện thoại
  else muc = Number(sang);
  if (!(muc >= 0 && muc <= 0.2)) { console.error('--sang phải từ 0 tới 0.2'); process.exit(1); }
  // Tăng ĐỀU cả clip (không đổi theo thời gian → không nháy). gamma nâng vùng tối, giữ vùng sáng không cháy.
  if (muc > 0) locHinh.push(`eq=brightness=${muc}:gamma=${(1 + muc * 2).toFixed(2)}:saturation=1.06`);
}

const ts = ['-hide_banner', '-loglevel', 'error', '-y', '-i', f];
if (locHinh.length) ts.push('-vf', locHinh.join(','), '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p');
else ts.push('-c:v', 'copy');
if (p.coTieng) {
  if (locTieng.length) ts.push('-af', locTieng.join(','), '-c:a', 'aac', '-b:a', '192k');
  else ts.push('-c:a', 'copy');
}
ts.push('-movflags', '+faststart', ra);

console.log(`Clip: ${basename(f)} · ${p.giay.toFixed(1)} s · ${p.coTieng ? 'có tiếng' : 'CÂM'}${tb !== null ? ` · sáng TB ${tb.toFixed(0)}/255` : ''}`);
console.log(`Khử tạp âm: ${locTieng.length ? khuOn : 'không'} · Tăng sáng: ${locHinh.length ? locHinh[0] : 'không cần'}`);
if (!locTieng.length && !locHinh.length) { console.log('Clip đã sạch, không cần làm gì — dùng thẳng file gốc.'); process.exit(0); }
const r = chay('ffmpeg', ts);
if (r.ma !== 0) { console.error(`ffmpeg lỗi: ${r.loi.trim()}`); process.exit(1); }
console.log(`Ra: ${ra}\nNghe thử 10 s đầu: giọng còn tự nhiên không? Méo / "ống nước" → chạy lại với --khu-on nhe.`);
