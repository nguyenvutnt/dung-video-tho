#!/usr/bin/env node
// Kiểm máy đủ đồ nghề chưa: Node ≥ 22, ffmpeg, ffprobe; HyperFrames CLI tự tải qua npx (lần đầu cần mạng).
// Dùng: node kiem-may.mjs            (thoát 0 = đủ, 1 = thiếu)
import { coLenh, chay } from './chung.mjs';

const HF = 'hyperframes@0.8.168';
const thieu = [];
const nodeChinh = Number(process.versions.node.split('.')[0]);

console.log(`Node ${process.versions.node} ${nodeChinh >= 22 ? '✅' : '❌ cần ≥ 22'}`);
if (nodeChinh < 22) thieu.push('Node.js 22 trở lên: tải bản LTS ở https://nodejs.org');

for (const l of ['ffmpeg', 'ffprobe']) {
  const ok = coLenh(l);
  console.log(`${l} ${ok ? '✅' : '❌ chưa có trong PATH'}`);
  if (!ok) thieu.push(process.platform === 'win32'
    ? `${l}: mở PowerShell gõ  winget install Gyan.FFmpeg  rồi tắt mở lại cửa sổ`
    : process.platform === 'darwin' ? `${l}: brew install ffmpeg` : `${l}: sudo apt install ffmpeg`);
}

if (nodeChinh >= 22) {
  try {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const r = process.platform === 'win32'
      ? chay('cmd.exe', ['/d', '/s', '/c', `${npx} --yes ${HF} --version`], { timeoutMs: 300_000 })
      : chay(npx, ['--yes', HF, '--version'], { timeoutMs: 300_000 });
    const ok = r.ma === 0;
    console.log(`HyperFrames ${ok ? r.ra.trim() + ' ✅' : '❌'}`);
    if (!ok) thieu.push(`HyperFrames: chạy  npx ${HF} --version  xem lỗi (cần mạng lần đầu)`);
  } catch (e) {
    console.log(`HyperFrames ❌ ${e.message}`);
    thieu.push(`HyperFrames: chạy  npx ${HF} --version  xem lỗi`);
  }
}

if (thieu.length) {
  console.log('\nCòn thiếu:\n- ' + thieu.join('\n- '));
  process.exit(1);
}
console.log('\nĐủ đồ nghề — dựng được rồi.');
