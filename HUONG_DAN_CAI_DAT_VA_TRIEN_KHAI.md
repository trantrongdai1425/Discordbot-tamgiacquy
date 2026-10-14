# 🤖 Hướng Dẫn Toàn Tập: Cài Đặt, Cấu Hình & Triển Khai Discord Bot (Từ A - Z)

Tài liệu này hướng dẫn chi tiết từ lúc khởi tạo một Bot mới trên **Discord Developer Portal**, chạy thử nghiệm trên máy tính cá nhân (**Local**), cho đến khi triển khai chạy online 24/7 trên đám mây (**Render / VPS Linux với PM2**).

---

## 📑 Mục Lục
- [1. Khởi Tạo & Cấu Hình Bot Trên Discord](#1-khởi-tạo--cấu-hình-bot-trên-discord)
  - [1.1. Tạo Application](#11-tạo-application)
  - [1.2. Lấy Bot Token & Bật Quyền Intents (Bắt Buộc)](#12-lấy-bot-token--bật-quyền-intents-bắt-buộc)
  - [1.3. Lấy Link Mời Bot Vào Server](#13-lấy-link-mời-bot-vào-server)
- [2. Cài Đặt & Chạy Bot Trên Máy Cá Nhân (Local)](#2-cài-đặt--chạy-bot-trên-máy-cá-nhân-local)
  - [2.1. Yêu Cầu Môi Trường](#21-yêu-cầu-môi-trường)
  - [2.2. Tải Mã Nguồn & Cài Đặt Thư Viện](#22-tải-mã-nguồn--cài-đặt-thư-viện)
  - [2.3. Cấu Hình File Biến Môi Trường (.env)](#23-cấu-hình-file-biến-môi-trường-env)
  - [2.4. Khởi Chạy Thử Nghiệm](#24-khởi-chạy-thử-nghiệm)
- [3. Cơ Chế Lệnh Gạch Chéo (Slash Commands)](#3-cơ-chế-lệnh-gạch-chéo-slash-commands)
- [4. Triển Khai Chạy 24/7 Miễn Phí Trên Render.com](#4-triển-khai-chạy-247-miễn-phí-trên-rendercom)
  - [4.1. Đẩy Mã Nguồn Lên GitHub](#41-đẩy-mã-nguồn-lên-github)
  - [4.2. Tạo Dịch Vụ Web Service Trên Render](#42-tạo-dịch-vụ-web-service-trên-render)
  - [4.3. Cấu Hình Biến Môi Trường (Environment Variables)](#43-cấu-hình-biến-môi-trường-environment-variables)
  - [4.4. Cơ Chế Chống Ngủ Đông (Keep-Alive Uptime)](#44-cơ-chế-chống-ngủ-đông-keep-alive-uptime)
- [5. Triển Khai Trên Máy Chủ Riêng (VPS Linux / Ubuntu)](#5-triển-khai-trên-máy-chủ-riêng-vps-linux--ubuntu)
- [6. Các Lỗi Phổ Biến & Cách Khắc Phục (FAQ)](#6-các-lỗi-phổ-biến--cách-khắc-phục-faq)

---

## 1. Khởi Tạo & Cấu Hình Bot Trên Discord

### 1.1. Tạo Application
1. Truy cập trang quản trị nhà phát triển của Discord: [Discord Developer Portal](https://discord.com/developers/applications).
2. Đăng nhập tài khoản Discord của bạn.
3. Nhấp vào nút **`New Application`** ở góc trên bên phải.
4. Đặt tên cho bot (ví dụ: `AI Bot & Tu Tiên Giới`) $\rightarrow$ Tích chọn đồng ý điều khoản $\rightarrow$ Nhấn **`Create`**.
5. *(Tùy chọn)* Tại mục **General Information**, bạn có thể tải lên Avatar và viết mô tả (Description) cho bot.

---

### 1.2. Lấy Bot Token & Bật Quyền Intents (Bắt Buộc)
> ⚠️ **Lưu ý tối quan trọng:** Token của Bot tương tự như mật khẩu. Tuyệt đối **không chia sẻ**, không gửi công khai lên mạng xã hội hoặc commit thẳng lên GitHub công khai.

1. Tại thanh menu bên trái, nhấp vào mục **`Bot`**.
2. **Lấy Token:**
   - Nhấp vào nút **`Reset Token`** $\rightarrow$ Xác nhận $\rightarrow$ Nhấp **`Copy`**.
   - Lưu lại mã Token này vào nơi an toàn (chúng ta sẽ dùng để dán vào file `.env`).
3. **Bật các quyền Privileged Gateway Intents (Bắt buộc phải bật để bot đọc được tin nhắn):**
   - Cuộn xuống phần **`Privileged Gateway Intents`**.
   - Gạt công tắc sang màu xanh (BẬT) cho cả 3 mục:
     - ✅ **Presence Intent**
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent** (Nếu không bật mục này, bot sẽ không nhận diện được các lệnh prefix như `!tutien`, `!pvp`, `!play`...)
   - Nhấp **`Save Changes`** ở góc dưới.

---

### 1.3. Lấy Link Mời Bot Vào Server
1. Tại thanh menu bên trái, chọn **`OAuth2`** $\rightarrow$ chọn tiếp **`URL Generator`**.
2. **Chọn Scopes:**
   - Tích chọn: `bot`
   - Tích chọn: `applications.commands` (Bắt buộc để sử dụng Slash Commands `/`).
3. **Chọn Bot Permissions:**
   - Để nhanh gọn và đầy đủ tính năng âm nhạc, chat, nút bấm: Tích chọn **`Administrator`** (hoặc tích chọn các quyền cụ thể: *Send Messages, Embed Links, Attach Files, Read Message History, Connect, Speak, Use Application Commands*).
4. Cuộn xuống cuối trang, nhấp **`Copy`** tại mục **Generated URL**.
5. Mở tab mới trên trình duyệt, dán URL vừa copy $\rightarrow$ Chọn Server Discord của bạn $\rightarrow$ Nhấn **Tiếp tục** $\rightarrow$ Nhấn **Ủy quyền** (Authorize) để mời bot vào server.

---

## 2. Cài Đặt & Chạy Bot Trên Máy Cá Nhân (Local)

### 2.1. Yêu Cầu Môi Trường
- **Node.js**: Phiên bản **v18.x** trở lên hoặc **v20.x LTS** (Tải tại [nodejs.org](https://nodejs.org/)).
- **Git**: Đã cài đặt Git trên máy tính ([git-scm.com](https://git-scm.com/)).

Kiểm tra phiên bản trong terminal/cmd:
```bash
node -v
npm -v
git --version
```

---

### 2.2. Tải Mã Nguồn & Cài Đặt Thư Viện
1. Mở Terminal (PowerShell / Command Prompt / Git Bash) tại thư mục dự án:
```bash
cd /duong-dan-toi-thu-muc/discord-ai-bot
```
2. Cài đặt tất cả các thư viện cần thiết từ `package.json`:
```bash
npm install
```

---

### 2.3. Cấu Hình File Biến Môi Trường (`.env`)
1. Tạo một file tên là `.env` tại thư mục gốc của dự án (nằm cùng cấp với `package.json` và `index.js`).
2. Mở file `.env` và điền cấu hình theo mẫu chuẩn sau:

```env
# ==========================================
# 1. DISCORD CONFIG (BẮT BUỘC)
# ==========================================
# Token lấy từ Discord Developer Portal (Mục Bot -> Reset Token)
DISCORD_TOKEN=MTE5ODcxM...your_bot_token_here...

# (Tùy chọn nhưng KHUYÊN DÙNG khi test): ID server Discord của bạn
# Giúp các lệnh Slash Commands (/) cập nhật ngay lập tức thay vì đợi 1 tiếng.
# Cách lấy: Bật Developer Mode trong Cài đặt Discord -> Chuột phải vào tên Server -> Copy Server ID
GUILD_ID=123456789012345678

# ==========================================
# 2. AI CONFIG (TÙY CHỌN DÀNH CHO TÍNH NĂNG AI)
# ==========================================
# Khóa API Google Gemini (để bot trò chuyện thông minh & kể chuyện độ kiếp)
# Lấy miễn phí tại: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSy...your_gemini_api_key...

# Khóa OpenAI (nếu dùng mô hình GPT)
OPENAI_API_KEY=

# ==========================================
# 3. SERVER PORT & KEEP-ALIVE
# ==========================================
PORT=3000
```

---

### 2.4. Khởi Chạy Thử Nghiệm
Chạy lệnh khởi động bot:
```bash
npm start
# hoặc:
node index.js
```

Khi bot hoạt động thành công, bạn sẽ thấy thông báo:
```text
[Discord Bot]: Đã đăng nhập thành công với tên: TênBot#1234
[TuTiên]: Nạp dữ liệu cơ sở dữ liệu thành công!
[SlashCommands]: Đã đăng ký thành công hệ thống lệnh!
```
Vào Discord và gõ lệnh `/tutien` hoặc `!tutien` để kiểm tra phản hồi!

---

## 3. Cơ Chế Lệnh Gạch Chéo (Slash Commands)

Bot Discord hiện đại sử dụng hệ thống **Slash Commands (`/`)**. Có 2 cơ chế đăng ký:

1. **Guild Commands (Lệnh cho 1 Server cụ thể):**
   - Khi bạn khai báo `GUILD_ID` trong file `.env`, bot sẽ đăng ký lệnh trực tiếp cho server đó.
   - **Ưu điểm:** Lệnh cập nhật **ngay lập tức trong 1 giây**. Khuyên dùng khi bạn đang code và sửa đổi lệnh liên tục.

2. **Global Commands (Lệnh cho Toàn Cầu / Mọi Server):**
   - Khi để trống `GUILD_ID`, bot sẽ đăng ký lệnh toàn cầu cho tất cả các server bot tham gia.
   - **Đặc điểm:** Discord cần từ **15 phút đến 1 tiếng** để đồng bộ lệnh trên toàn bộ hệ thống máy chủ Discord thế giới.

---

## 4. Triển Khai Chạy 24/7 Miễn Phí Trên Render.com

[Render.com](https://render.com) là dịch vụ đám mây miễn phí rất phổ biến để host Discord Bot Node.js.

### 4.1. Đẩy Mã Nguồn Lên GitHub
Đảm bảo mã nguồn của bạn đã được đẩy lên một kho lưu trữ (**Private** hoặc **Public**) trên GitHub:
```bash
git add .
git commit -m "feat: chuẩn bị deploy bot"
git push origin main
```
> ⚠️ **Lưu ý:** Đảm bảo file `.gitignore` đã có dòng `.env` để không bao giờ để lộ token lên GitHub!

---

### 4.2. Tạo Dịch Vụ Web Service Trên Render
1. Đăng ký/Đăng nhập tại [Render.com](https://render.com).
2. Nhấp vào nút **`New +`** ở góc trên $\rightarrow$ Chọn **`Web Service`**.
3. Chọn mục **Build and deploy from a Git repository** $\rightarrow$ Kết nối tài khoản GitHub của bạn $\rightarrow$ Chọn repository bot của bạn.
4. Điền các thông số cơ bản:
   - **Name:** Đặt tên dịch vụ (ví dụ: `my-discord-bot`).
   - **Region:** Chọn `Singapore` (để có độ trễ thấp nhất về Việt Nam).
   - **Branch:** `main` (hoặc nhánh bạn sử dụng).
   - **Runtime:** `Node`.
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Instance Type:** Chọn gói **Free** (512 MB RAM, 0.1 CPU).

---

### 4.3. Cấu Hình Biến Môi Trường (Environment Variables)
Cuộn xuống phần **`Environment Variables`**, nhấp **`Add Environment Variable`** và nhập từng biến (tương tự file `.env` của bạn):
- `DISCORD_TOKEN`: *(Dán mã token bot của bạn vào đây)*
- `GEMINI_API_KEY`: *(Dán mã API key nếu có)*
- `NODE_ENV`: `production`

Nhấp vào nút **`Create Web Service`** để Render tiến hành build và khởi chạy bot!

---

### 4.4. Cơ Chế Chống Ngủ Đông (Keep-Alive Uptime)
Ở gói Free của Render, nếu không có ai truy cập web trong 15 phút, máy chủ sẽ tự động chuyển sang chế độ "ngủ đông" (Sleep).

Trong mã nguồn `index.js`, bot đã tích hợp sẵn một Web Server nhẹ (HTTP Server) lắng nghe tại cổng `process.env.PORT` để Render hiển thị trạng thái `Live`.

**Cách giữ cho Bot luôn thức 24/7:**
1. Sao chép đường link URL mà Render cấp cho bạn (dạng: `https://ten-bot-cua-ban.onrender.com`).
2. Truy cập trang web miễn phí [UptimeRobot](https://uptimerobot.com/) (hoặc [cron-job.org](https://cron-job.org/)).
3. Tạo tài khoản $\rightarrow$ Nhấn **`Add New Monitor`**:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Discord Bot Keep-Alive`
   - **URL:** Dán đường link Render của bạn vào.
   - **Monitoring Interval:** Chọn `5 minutes` (cứ 5 phút ping 1 lần).
4. Nhấn **`Create Monitor`**. Từ giờ, UptimeRobot sẽ tự động gửi yêu cầu nhẹ mỗi 5 phút, giữ cho Bot của bạn **hoạt động 24/7 liên tục mà không bị ngủ đông**!

---

## 5. Triển Khai Trên Máy Chủ Riêng (VPS Linux / Ubuntu)

Nếu bạn thuê một VPS riêng (Ubuntu / Debian), đây là cách chuẩn nhất để quản lý bot bằng công cụ **PM2** (Process Manager):

1. **Cập nhật hệ thống & cài đặt Node.js:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git
   ```

2. **Cài đặt PM2 toàn cục:**
   ```bash
   sudo npm install -g pm2
   ```

3. **Tải mã nguồn & Cài đặt:**
   ```bash
   git clone https://github.com/tai-khoan/repo-bot.git
   cd repo-bot
   npm install
   nano .env  # Tạo và điền nội dung token vào file .env
   ```

4. **Khởi chạy bot với PM2:**
   ```bash
   pm2 start index.js --name "discord-bot"
   ```

5. **Cấu hình tự khởi động lại khi reboot VPS:**
   ```bash
   pm2 startup
   # Chạy dòng lệnh mà PM2 hiển thị trên màn hình (nếu có)
   pm2 save
   ```

6. **Các lệnh quản lý PM2 thường dùng:**
   - Xem nhật ký log chạy trực tiếp: `pm2 logs discord-bot`
   - Khởi động lại bot: `pm2 restart discord-bot`
   - Dừng bot: `pm2 stop discord-bot`
   - Xem thông số RAM / CPU: `pm2 status`

---

## 6. Các Lỗi Phổ Biến & Cách Khắc Phục (FAQ)

### ❓ Lỗi 1: `Used disallowed intents: PrivilegedGatewayIntents`
- **Nguyên nhân:** Bạn chưa bật quyền đọc nội dung tin nhắn và thành viên trên trang quản trị Discord.
- **Cách sửa:** Vào lại [Discord Developer Portal](https://discord.com/developers/applications) $\rightarrow$ Vào mục **Bot** $\rightarrow$ Kéo xuống mục **Privileged Gateway Intents** $\rightarrow$ Bật cả 3 công tắc (`Presence`, `Server Members`, `Message Content`) $\rightarrow$ Lưu lại và khởi động lại bot.

### ❓ Lỗi 2: `An invalid token was provided`
- **Nguyên nhân:** Token trong file `.env` bị sai, có dấu cách thừa, hoặc đã bị reset.
- **Cách sửa:** Vào mục **Bot** trên Developer Portal, nhấn **Reset Token** để lấy lại token mới, dán chính xác vào file `.env` và lưu ý không có khoảng trắng ở đầu/cuối.

### ❓ Lỗi 3: Gõ `/` nhưng không thấy lệnh của Bot xuất hiện
- **Nguyên nhân:**
  1. Lúc mời bot vào server, bạn chưa tích chọn quyền `applications.commands`.
  2. Bạn chưa điền `GUILD_ID` trong `.env` nên Discord cần tới 1 tiếng để đồng bộ lệnh toàn cầu.
- **Cách sửa:** Điền ID Server vào `GUILD_ID=...` trong `.env` rồi restart bot, các lệnh `/` sẽ hiển thị ngay lập tức.

### ❓ Lỗi 4: Không phát được âm thanh trong Voice Channel (FFmpeg)
- **Nguyên nhân:** Thiếu công cụ giải mã âm thanh FFmpeg trên hệ điều hành.
- **Cách sửa:** Dự án đã cài đặt sẵn thư viện `ffmpeg-static`. Nếu chạy trên VPS Linux, bạn có thể cài thêm FFmpeg hệ thống bằng lệnh: `sudo apt install ffmpeg -y`.

---

Chúc bạn cài đặt và triển khai Discord Bot thành công rực rỡ! 🚀
