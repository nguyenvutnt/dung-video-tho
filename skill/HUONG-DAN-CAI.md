# Cài skill "Dựng video thô" — thử sức Opus 5.5 + HyperFrames

Đưa clip quay điện thoại, Claude Opus 5.5 tự xem, lập bảng cắt cho bạn duyệt 1 lần, rồi dựng ra video có hook, zoom,
chữ, chuyển cảnh mượt bằng HyperFrames (mã nguồn mở, miễn phí).

## Cần có
- **Claude Code**, chọn model **Opus 5.5**.
- **Node.js 22+** và **FFmpeg**. Chưa có thì cứ gọi skill — Claude tự rà và xin phép cài giúp.
  (Windows: `winget install OpenJS.NodeJS.LTS` và `winget install Gyan.FFmpeg` · Mac: `brew install node ffmpeg`)

HyperFrames không cần cài — lần đầu chạy tự tải (cần mạng, 1–3 phút).

## Cài (1 phút)
Giải nén, chép thư mục `dung-video-tho` vào:
- Windows: `C:\Users\<tên bạn>\.claude\skills\`
- Mac: `~/.claude/skills/`

## Dùng
Mở Claude Code ở thư mục có clip, gõ:
> /dung-video-tho dựng 2 clip trong thư mục `vay-tiec` thành video TikTok 30 giây, thông điệp "váy đi tiệc không cần là", cuối kêu gọi inbox.

Claude hỏi lại vài câu → soi clip → đưa **bảng cắt** để bạn "ok" → dựng + render → tự kiểm → giao file `-v1.mp4`.

---
© 2026 Agent Video Gbe AI Hub · HyperFrames © HeyGen (Apache 2.0)
