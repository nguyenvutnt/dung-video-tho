---
name: dung-video-tho
description: >
  Dựng video từ VIDEO THÔ (clip quay điện thoại, người nói vào máy, nhiều clip rời) bằng Claude Opus 5.5 + HyperFrames
  (mã nguồn mở, miễn phí cả thương mại). Claude xem clip, tìm câu chuyện, đưa bảng cắt cho duyệt 1 lần rồi dựng: hook
  2 giây đầu, cắt bỏ đoạn thừa, zoom nhấn, chữ lớn, chuyển cảnh mờ chồng (không chớp), khử tạp âm, tăng sáng clip tối,
  nhạc nền tự nhỏ khi có lời, kết kêu gọi; có lời thì thêm phụ đề sáng theo từng chữ. Ra MP4 dọc 9:16 hoặc ngang 16:9.
  Chỉ cần Node.js + FFmpeg. Trigger: "dựng video thô", "edit video này", "cắt clip này thành video", "ghép mấy clip này",
  "làm video TikTok từ clip quay", "/dung-video-tho".
---

# Dựng video thô → video có gu (Opus 5.5 + HyperFrames)

Bản gọn để **thử sức Opus 5.5 + HyperFrames**: ít cài đặt, 1 lần duyệt, ra video trong 1 phiên.
HyperFrames = video viết bằng HTML; Claude viết `index.html` theo bảng cắt, CLI render ra MP4.

## Luật gu (giữ dù làm nhanh)

1. **Không chớp**: cấm chớp trắng/màu, glitch, nháy sáng. Chỉ cắt thẳng hoặc **mờ chồng ≥ 0,3 s**.
2. **Giây 0 có hình rõ + chuyện**: không màn đen, không "xin chào". 2 giây đầu là cảnh mạnh nhất (kết quả / vấn đề / lạ),
   lấy từ BẤT KỲ đâu trong clip; chữ hook ≤ 6 từ hiện ngay giây 0.
3. **Cắt lời người thật = câu trọn**, không cắt giữa câu.
4. Chữ trên hình ≤ 6 từ / dòng, font có dấu Việt (Be Vietnam Pro). Dọc 9:16: chữ trong vùng x 60–1020, y 160–1500.
5. Zoom nhấn 1,0 → 1,12 trong 0,25 s đúng chữ quan trọng, tối đa 1 lần / 5 s.
6. Tiếng cuối ≈ −14 LUFS; nhạc nền ~0,3 khi có lời, 0,9 khi không lời.
7. **Kiểm bằng mắt trước khi giao**: chạy `kiem-video.mjs` rồi MỞ ảnh khung hình ra xem.

## Bước 0 — Rà máy (10 giây)

```bash
node "<thư mục skill>/scripts/kiem-may.mjs"
```
Chỉ cần **Node.js ≥ 22** và **FFmpeg**. HyperFrames KHÔNG phải cài — `npx` tự tải lần đầu (~1–3 phút, cần mạng).
Thiếu thì nói người dùng 1 câu, xin phép rồi cài: Windows `winget install OpenJS.NodeJS.LTS` / `winget install Gyan.FFmpeg`
· Mac `brew install node ffmpeg` (cài xong mở lại cửa sổ dòng lệnh). Không bắt cài gì khác.

## Bước 1 — Hỏi gộp 1 lần (có gợi ý sẵn, người dùng chỉ cần "ok")

Đăng ở đâu (dọc TikTok/Reels hay ngang YouTube) · thông điệp 1 câu · dài bao lâu (mặc định 20–40 s) · kết kêu gọi gì ·
có file nhạc không (không có → không nhạc, KHÔNG tự tải nhạc trên mạng).

## Bước 2 — Soi clip

Chép clip vào `<tên-video>/nguon/` (đặt `c01-…mp4`, `c02-…mp4`).
```bash
node "<thư mục skill>/scripts/soi-nguon.mjs" "<tên-video>/nguon" --out "<tên-video>/soi"
```
Ra `soi/bao-cao.md` (độ dài, khổ, xoay, có tiếng không, chỗ lặng, chỗ đổi cảnh) + lưới ảnh `soi/<clip>-khung.jpg`.
**MỞ từng ảnh lưới** (Read ảnh) — chọn cảnh đẹp, loại cảnh mờ / rung / có người lạ.

Làm sạch clip (chỉ dùng FFmpeg, không cài thêm): khử tạp âm + tự tăng sáng clip tối.
```bash
node "<thư mục skill>/scripts/lam-sach.mjs" "<tên-video>/nguon/c01-....mp4"      # → c01-...-sach.mp4
```
Giọng nghe méo → `--khu-on nhe`. Clip đã sạch thì script bảo dùng thẳng file gốc.

## Bước 3 — Bảng cắt → DỪNG chờ duyệt (lần duyệt duy nhất)

Viết `<tên-video>/KE-HOACH.md` ngắn:
- 3 câu hook để chọn + khung kể: Mở (0–2 s) → Thân → Kết (3–5 s kêu gọi).
- Bảng: `# | clip | từ giây | đến giây | đặt ở giây | chuyển vào | chữ trên hình`.
Mốc cắt lời: đặt ở **chỗ lặng** trong `bao-cao.md` để không cắt giữa câu; không vắt qua "chỗ đổi cảnh".
Đưa người dùng, chờ "ok" (đổi gì sửa đúng chỗ đó).

## Bước 4 — Dựng + render

```bash
cd "<tên-video>"
npx --yes hyperframes@0.8.168 init dung --resolution portrait --skip-transcribe     # ngang: --resolution landscape
```
Chép `<thư mục skill>/references/khuon-index.html` đè `dung/index.html`, chép clip `-sach` cần dùng vào `dung/`, rồi sửa theo
bảng cắt. Khuôn có sẵn đủ: hook, zoom nhấn, mờ chồng, kết kêu gọi, nhạc tự nhỏ khi có lời, chỗ chèn phụ đề. Quy tắc khuôn:
- `<video>`: `data-start` (đặt ở giây) · `data-duration` · `data-media-start` (từ giây trong clip) · **mỗi thẻ có `id`**.
- Clip có lời → `data-has-audio="true"`; clip CÂM → `muted` (để sai là render lỗi "expected: audio").
- Mờ chồng: 2 đoạn chồng nhau đúng độ dài mờ, đoạn trước chạy dư — copy y mẫu `#v1`/`#v2` trong khuôn.
- Không có nhạc → xoá thẻ `<audio id="nhac">`.

Phụ đề (khi có người nói và máy chép lời được): `npx hyperframes@0.8.168 transcribe <clip-sach.mp4> -l vi -m large-v3`
→ sửa tên riêng sai trong file json → viết `cat.json` → chạy `phu-de.mjs` (cách dùng in ở đầu file script). Báo
"whisper-cpp not found" → **bỏ phụ đề, không bắt cài thêm**, chỉ giữ chữ hook / chữ nhấn viết tay.

```bash
cd dung
npx hyperframes@0.8.168 check                      # lỗi "Navigation timeout" lần đầu → chạy lại 1 lần
npx hyperframes@0.8.168 render --output ../tho.mp4
ffmpeg -y -i ../tho.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k "../<tên-video>-v1.mp4"
node "<thư mục skill>/scripts/kiem-video.mjs" "../<tên-video>-v1.mp4"
```
Video không có tiếng → bỏ lệnh ffmpeg, đổi tên `tho.mp4`, kiểm thêm `--cam`.

## Bước 5 — Kiểm + giao

`kiem-video.mjs` thoát 2 = hỏng (chớp, tiếng quá nhỏ, sai khổ, giây 0 đen) → sửa, render lại. Thoát 0 vẫn **MỞ**
`<tên-video>-v1-kiem/luoi.jpg` + 3 ảnh đầu/giữa/cuối: chữ đúng dấu, không che mặt, giây 0 rõ.
Giao: đường dẫn video, độ dài, khổ, ảnh lưới. Sửa thêm ra `-v2`, không ghi đè.

## Lỗi hay gặp

| Triệu chứng | Sửa |
|---|---|
| Render lỗi "asset do not match … expected: audio" | clip câm mà để `data-has-audio="true"` → đổi `muted` |
| Video ra không tiếng | thẻ `<video>`/`<audio>` thiếu `id` |
| Hình bị xoay ngang | `bao-cao.md` cột xoay ⚠ → xoay bằng CSS `transform: rotate()` trong khung |
| Đoạn hiện lên từ nền đen | đoạn trước phải chạy dư thêm đúng độ dài mờ chồng |
| `kiem-video` báo chớp | dời mốc cắt tránh "chỗ đổi cảnh" của nguồn |

Muốn làm sâu hơn (nhiều kiểu phụ đề, hiệu ứng khác): `npx hyperframes@0.8.168 skills` cài bộ skill chính chủ HyperFrames — tuỳ chọn.

---
Skill chia sẻ miễn phí — © 2026 Agent Video Gbe AI Hub. HyperFrames © HeyGen, giấy phép Apache 2.0.
