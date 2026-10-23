// Hàm dùng chung cho các script của skill dung-video-tho. Chỉ cần Node ≥ 22 + ffmpeg/ffprobe trong PATH.
import { spawnSync } from 'node:child_process';

export function chay(lenh, thamSo, { timeoutMs = 30 * 60_000 } = {}) {
  const r = spawnSync(lenh, thamSo, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, timeout: timeoutMs, windowsHide: true });
  if (r.error) throw new Error(`Không chạy được ${lenh}: ${r.error.message}`);
  return { ma: r.status, ra: r.stdout || '', loi: r.stderr || '' };
}

export function coLenh(lenh) {
  try { return chay(lenh, ['-version'], { timeoutMs: 20_000 }).ma === 0; } catch { return false; }
}

export function probe(file) {
  const r = chay('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { timeoutMs: 60_000 });
  if (r.ma !== 0) throw new Error(`ffprobe đọc không được ${file}: ${r.loi.trim()}`);
  const j = JSON.parse(r.ra);
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  let xoay = 0;
  if (v) {
    const sd = (v.side_data_list || []).find((d) => d.rotation !== undefined);
    xoay = Number(sd?.rotation ?? v.tags?.rotate ?? 0) || 0;
  }
  const [n, d] = String(v?.avg_frame_rate || '0/1').split('/').map(Number);
  return {
    giay: Number(j.format.duration) || 0,
    rong: v?.width || 0,
    cao: v?.height || 0,
    xoay,
    fps: d ? Math.round((n / d) * 100) / 100 : 0,
    coTieng: Boolean(a),
    mb: Math.round((Number(j.format.size) || 0) / 1048576 * 10) / 10,
  };
}

// Độ to tổng (LUFS) + đỉnh thật (dBTP) theo chuẩn EBU R128.
export function doTo(file) {
  const r = chay('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']);
  const tom = r.loi.slice(r.loi.lastIndexOf('Summary:'));
  const I = tom.match(/I:\s+(-?[\d.]+|-inf)\s+LUFS/);
  const P = tom.match(/Peak:\s+(-?[\d.]+|-inf)\s+dBFS/);
  return { lufs: I ? Number(I[1]) : null, dinh: P ? Number(P[1]) : null };
}

// Độ sáng trung bình (0–255) từng khung, ảnh thu nhỏ cho nhanh.
export function doSang(file) {
  const r = chay('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-an', '-vf',
    'scale=160:-2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-']);
  const ds = [];
  let t = 0;
  for (const dong of r.ra.split(/\r?\n/)) {
    const mt = dong.match(/pts_time:([\d.]+)/);
    if (mt) t = Number(mt[1]);
    const my = dong.match(/YAVG=([\d.]+)/);
    if (my) ds.push({ t, y: Number(my[1]) });
  }
  return ds;
}

// Lưới ảnh khung hình: tối đa `soO` ô, trả về mốc giây từng ô.
export function luoiKhung(file, giay, ra, { soO = 24, cot = 6, rongO = 320 } = {}) {
  const buoc = Math.max(0.5, giay / soO);
  const so = Math.max(1, Math.min(soO, Math.floor(giay / buoc)));
  const hang = Math.ceil(so / cot);
  const r = chay('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-an', '-vf',
    `fps=1/${buoc.toFixed(3)},scale=${rongO}:-2,tile=${cot}x${hang}:padding=4:color=black`, '-frames:v', '1', '-q:v', '4', ra]);
  if (r.ma !== 0) throw new Error(`Không tạo được lưới ảnh: ${r.loi.trim()}`);
  return Array.from({ length: so }, (_, i) => Math.round(i * buoc * 10) / 10);
}

export function anh1Khung(file, giay, ra) {
  chay('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(Math.max(0, giay)), '-i', file, '-frames:v', '1', '-q:v', '3', ra]);
}

export const mmss = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
