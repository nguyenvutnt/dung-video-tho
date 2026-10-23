#!/usr/bin/env node
// Soi nguồn video thô: thông số, độ to, chỗ lặng (mốc cắt lời), chỗ đổi cảnh, lưới ảnh khung hình.
// Dùng: node soi-nguon.mjs <thư mục | file.mp4 ...> [--out soi]
// Ra:   <out>/bao-cao.md, <out>/bao-cao.json, <out>/<clip>-khung.jpg
import { readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename, extname, resolve } from 'node:path';
import { probe, doTo, chay, luoiKhung, mmss } from './chung.mjs';

const DUOI = new Set(['.mp4', '.mov', '.m4v', '.mkv', '.webm', '.avi']);
const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Dùng: node soi-nguon.mjs <thư mục | file.mp4 ...> [--out soi]');
  process.exit(args.length ? 0 : 1);
}
const iOut = args.indexOf('--out');
const out = resolve(iOut >= 0 ? args[iOut + 1] : 'soi');
const nguon = args.filter((a, i) => a !== '--out' && i !== iOut + 1);

const files = [];
for (const n of nguon) {
  const p = resolve(n);
  if (statSync(p).isDirectory()) {
    for (const f of readdirSync(p).sort()) if (DUOI.has(extname(f).toLowerCase())) files.push(join(p, f));
  } else files.push(p);
}
if (!files.length) { console.error('Không thấy file video nào.'); process.exit(1); }
mkdirSync(out, { recursive: true });

function choLang(file) {
  const r = chay('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'silencedetect=n=-35dB:d=0.4', '-f', 'null', '-']);
  const ds = [];
  let bd = null;
  for (const d of r.loi.split(/\r?\n/)) {
    const s = d.match(/silence_start:\s*(-?[\d.]+)/);
    const e = d.match(/silence_end:\s*([\d.]+)/);
    if (s) bd = Math.max(0, Number(s[1]));
    if (e && bd !== null) { ds.push([Math.round(bd * 10) / 10, Math.round(Number(e[1]) * 10) / 10]); bd = null; }
  }
  return ds;
}

function doiCanh(file) {
  const r = chay('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-an', '-vf',
    "scale=320:-2,select='gt(scene,0.3)',showinfo", '-f', 'null', '-']);
  return [...r.loi.matchAll(/pts_time:([\d.]+)/g)].map((m) => Math.round(Number(m[1]) * 10) / 10).filter((t) => t > 0.1);
}

const bao = [];
const md = ['# Soi nguồn', '', '| Clip | Dài | Khổ | Xoay | fps | Tiếng | LUFS | MB |', '|---|---|---|---|---|---|---|---|'];
const chiTiet = [];

for (const f of files) {
  const ten = basename(f, extname(f));
  process.stdout.write(`Soi ${basename(f)} ... `);
  const p = probe(f);
  const dong = p.xoay === 90 || p.xoay === -90 || p.xoay === 270 || p.xoay === -270;
  const khoThat = dong ? `${p.cao}×${p.rong}` : `${p.rong}×${p.cao}`;
  const to = p.coTieng ? doTo(f) : { lufs: null, dinh: null };
  const lang = p.coTieng ? choLang(f) : [];
  const canh = doiCanh(f);
  const anh = `${ten}-khung.jpg`;
  const moc = luoiKhung(f, p.giay, join(out, anh));
  const muc = { file: f, ...p, khoThat, ...to, choLang: lang, doiCanh: canh, luoi: anh, mocLuoi: moc };
  bao.push(muc);
  md.push(`| ${basename(f)} | ${mmss(p.giay)} | ${khoThat} | ${p.xoay ? p.xoay + '° ⚠' : '—'} | ${p.fps} | ${p.coTieng ? 'có' : 'CÂM'} | ${to.lufs ?? '—'} | ${p.mb} |`);

  const canhBao = [];
  if (p.xoay) canhBao.push(`có cờ xoay ${p.xoay}° — khổ thật ${khoThat}, xử lý xoay trước khi đặt khung`);
  if (p.coTieng && to.lufs !== null && to.lufs < -30) canhBao.push(`tiếng rất nhỏ (${to.lufs} LUFS) — có thể là clip câm / chỉ tiếng phòng, đừng chạy Whisper`);
  if (p.giay < 1.5) canhBao.push('clip quá ngắn (< 1,5 s)');
  if (!p.coTieng) canhBao.push('clip CÂM — trong index.html thẻ <video> của clip này phải để `muted`, KHÔNG để data-has-audio="true" (render sẽ lỗi "asset do not match … expected: audio")');
  chiTiet.push(
    `## ${basename(f)}`, '',
    `Lưới ảnh: \`${anh}\` — ô thứ i (đếm từ 0, trái→phải, trên→dưới) ≈ giây: ${moc.join(', ')}`, '',
    `Chỗ đổi cảnh đột ngột (đừng đặt mốc cắt vắt qua): ${canh.length ? canh.join(', ') : 'không có'}`, '',
    `Chỗ lặng ≥ 0,4 s (mốc cắt lời đẹp): ${lang.length ? lang.map(([a, b]) => `${a}–${b}`).join(', ') : (p.coTieng ? 'không có' : 'clip câm')}`, '',
    ...(canhBao.length ? ['⚠ ' + canhBao.join('\n⚠ '), ''] : []),
  );
  console.log('xong');
}

writeFileSync(join(out, 'bao-cao.json'), JSON.stringify(bao, null, 2));
writeFileSync(join(out, 'bao-cao.md'), [...md, '', ...chiTiet,
  'Bước tiếp: Claude MỞ từng ảnh lưới để xem cảnh, rồi lấy lời bằng `npx hyperframes transcribe` cho clip có người nói.', ''].join('\n'));
console.log(`\nBáo cáo: ${join(out, 'bao-cao.md')}`);
