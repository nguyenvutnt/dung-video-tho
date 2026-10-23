# Dựng Video Thô (dung-video-tho)

> **Skill biến clip quay thô từ điện thoại thành video TikTok, Reels, Shorts chuyên nghiệp** bằng **Claude AI / Antigravity** kết hợp engine kết xuất mã nguồn mở **HyperFrames** (HeyGen) và **FFmpeg**.

[![Demo Live](https://img.shields.io/badge/Demo-Xem_Trực_Tiếp-blue?style=for-the-badge)](https://nguyenvutnt.github.io/dung-video-tho/)
[![HyperFrames](https://img.shields.io/badge/HyperFrames-v0.8.168-brightgreen?style=for-the-badge)](https://hyperframes.dev)
[![Node.js](https://img.shields.io/badge/Node.js-≥22-green?style=for-the-badge)](https://nodejs.org)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Ready-red?style=for-the-badge)](https://ffmpeg.org)

---

## 🎬 Trải Nghiệm Demo Trực Tiếp

👉 **Xem Demo Online tại GitHub Pages:** [https://nguyenvutnt.github.io/dung-video-tho/](https://nguyenvutnt.github.io/dung-video-tho/)

Xem video kết xuất thực tế, hình ảnh phân tích khung hình, cùng tài liệu tương tác.

---

## ✨ Điểm Nổi Bật Của Skill

1. **Tuân thủ luật gu chuyên nghiệp**:
   - **Giây 0 rõ hình & chuyện**: Không màn đen, hook xuất hiện ngay giây đầu tiên.
   - **Cắt lời trọn câu**: Dò tìm khoảng lặng tự nhiên (`silencedetect`) để làm mốc cắt.
   - **Chuyển cảnh mượt mà**: Chuyển cảnh mờ chồng (cross-dissolve) $\ge 0.3$s, tuyệt đối không chớp giật.
   - **Zoom nhấn tinh tế**: Nhấn khung $1.0 \to 1.12$ vào các thời điểm cao trào.
   - **Âm thanh chuẩn mạng xã hội**: Chuẩn hóa âm lượng về mức **-14 LUFS**.

2. **Tự động hóa 5 bước khép kín**:
   - `scripts/kiem-may.mjs`: Tự động rà soát môi trường thực thi.
   - `scripts/soi-nguon.mjs`: Soi thông số clip, phát hiện điểm lặng âm thanh và xuất lưới ảnh.
   - `scripts/lam-sach.mjs`: Khử tạp âm nền (quạt gió, rè) và tự cân bằng sáng.
   - `scripts/phu-de.mjs`: Tự động chèn phụ đề từng chữ theo dòng thời gian.
   - `scripts/kiem-video.mjs`: Kiểm định chất lượng video sau khi kết xuất.

---

## 🚀 Cài Đặt Skill

### 1. Dành cho Claude Code
Sao chép thư mục `skill/` vào thư mục skills của Claude Code:
- **Linux / macOS**: `~/.claude/skills/dung-video-tho`
- **Windows**: `%USERPROFILE%\.claude\skills\dung-video-tho`

### 2. Dành cho Antigravity CLI / Gemini CLI
Sao chép vào thư mục `.agents/skills/`:
- `~/.agents/skills/dung-video-tho`

---

## 🛠️ Quy Trình Chạy Thực Tế

```bash
# 1. Rà máy
node skill/scripts/kiem-may.mjs

# 2. Soi clip thô trong thư mục nguon/
node skill/scripts/soi-nguon.mjs demo/nguon --out demo/soi

# 3. Làm sạch clip
node skill/scripts/lam-sach.mjs demo/nguon/c01.mp4

# 4. Khởi tạo & Kiểm tra dự án HyperFrames
cd demo/dung
npx hyperframes@0.8.168 check

# 5. Render video
npx hyperframes@0.8.168 render --output ../tho.mp4

# 6. Chuẩn hóa âm thanh & Kiểm định
ffmpeg -y -i ../tho.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k "../demo-v1.mp4"
node ../../skill/scripts/kiem-video.mjs "../demo-v1.mp4"
```

---

## 📁 Cấu Trúc Thư Mục

```
.
├── index.html              # Trang demo trực quan cho GitHub Pages
├── README.md               # Tài liệu dự án
├── skill/                  # Toàn bộ mã nguồn & script của Skill
│   ├── SKILL.md            # Đặc tả hành vi cho AI Agent
│   ├── HUONG-DAN-CAI.md    # Hướng dẫn chi tiết
│   ├── scripts/            # Bộ công cụ xử lý video & âm thanh
│   └── references/         # Template HTML dựng HyperFrames
├── demo/                   # Dữ liệu dự án demo thực tế đã chạy
│   ├── demo-v1.mp4         # Video thành phẩm chuẩn 1080x1920 (9:16)
│   ├── KE-HOACH.md         # Bảng cắt và kịch bản dựng
│   ├── nguon/              # Video gốc và video làm sạch
│   ├── soi/                # Kết quả phân tích nguồn & lưới ảnh
│   ├── dung/               # Source template HyperFrames
│   └── demo-v1-kiem/       # Ảnh chụp phân tích kiểm định
└── docs/
    └── gioi-thieu-skill.html # Tài liệu giới thiệu tương tác
```

---
*Phát triển trên nền tảng HyperFrames (HeyGen) & Claude AI Agent.*
