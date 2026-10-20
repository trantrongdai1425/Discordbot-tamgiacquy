# 📻 HƯỚNG DẪN TRIỂN KHAI BOT NHẠC LOFI 24/7 (CHUYÊN DỤNG)

Dự án này là mã nguồn **Discord Bot chuyên trách phát nhạc Lofi 24/7**, được thiết kế siêu nhẹ (~35MB RAM), tích hợp đầy đủ công nghệ mã hóa âm thanh mới nhất của Discord (DAVE Protocol & Opus), 5 kênh đài Lofi HD 192kbps trực tiếp, bảng điều khiển nút bấm tiện lợi và cơ chế tự động ghim phòng 24/24.

---

## 🎯 Ưu Điểm Khi Tách Bot Lofi Riêng:
1. **Hoạt động độc lập:** Không bị ảnh hưởng bởi các tính năng khác (Tu Tiên, AI, Mini-game).
2. **Siêu nhẹ:** Chỉ mất ~35MB RAM, hoàn hảo để treo trên các dịch vụ hosting miễn phí trọn đời (như Bot-Hosting.net, Wispbyte...).
3. **Mở toàn bộ cổng Voice UDP:** Phát nhạc có tiếng 100%, không bao giờ bị "câm" hay kẹt kết nối như khi host trên Render.

---

## 🚀 Bước 1: Tạo Con Bot Mới Trên Discord Developer Portal (2 Phút)

1. Truy cập: [Discord Developer Portal](https://discord.com/developers/applications)
2. Nhấn nút **`New Application`** ở góc trên bên phải.
3. Đặt tên cho bot (ví dụ: `Lofi Radio 24/7` hoặc `Chillhop Radio`) $\rightarrow$ Tích đồng ý điều khoản $\rightarrow$ Nhấn **`Create`**.
4. Vào mục **`Bot`** ở menu bên trái:
   - Đặt ảnh đại diện (Avatar) cho bot tùy thích.
   - Nhấn **`Reset Token`** $\rightarrow$ **Copy mã Token** này cất vào ghi chú.
   - Cuộn xuống phần **Privileged Gateway Intents**:
     - ✅ Bật **`Message Content Intent`**
     - ✅ Bật **`Server Members Intent`**
   - Nhấn **`Save Changes`**.
5. Vào mục **`Installation`** (hoặc `OAuth2` $\rightarrow$ `URL Generator`):
   - Chọn Scopes: `bot`, `applications.commands`
   - Chọn Bot Permissions: `Administrator` (hoặc tích `Connect`, `Speak`, `Send Messages`, `Embed Links`, `Use Application Commands`).
   - Copy đường link mời bot và dán vào trình duyệt để **mời Bot vào Server của bạn**!

---

## ☁️ Bước 2: Treo Bot 24/24 Miễn Phí Trên Bot-Hosting.net (Khuyên dùng)

1. Truy cập trang web: [bot-hosting.net](https://bot-hosting.net/)
2. Bấm **Login with Discord** (Đăng nhập bằng tài khoản Discord của bạn).
3. Sau khi vào Dashboard, bấm nút **`Create Server`**:
   - **Name:** Đặt tên bất kỳ (ví dụ: `my-lofi-bot`)
   - **Type / Egg:** Chọn **Node.js**
4. Sau khi server tạo xong, bấm vào server để mở bảng điều khiển:
   - Vào mục **Files**:
     - Tải 2 file quan trọng lên: [`index.js`](./index.js) và [`package.json`](./package.json).
     - Bấm nút **Create File** $\rightarrow$ Đặt tên file là `.env` $\rightarrow$ Dán nội dung:
       ```env
       DISCORD_TOKEN=dán_token_bot_mới_vào_đây
       ```
       $\rightarrow$ Nhấn **Save Content**.
5. Chuyển sang mục **Console** $\rightarrow$ Bấm nút **`START`**!
   - Hệ thống sẽ tự động cài đặt thư viện (`npm install`) và khởi động bot.
   - Khi màn hình hiện: `📻 Bot Lofi 24/7 đã sẵn sàng` là bot đã online 24/24 vĩnh viễn!

---

## 🕹️ Bước 3: Cách Dùng Trong Discord

- **Vào một phòng Voice bất kỳ rồi gõ:**
  ```text
  /lofi
  ```
  hoặc gõ trong kênh chat:
  ```text
  !lofi
  ```
- **Bảng điều khiển trực quan sẽ hiện lên:**
  - 📻 **Menu chọn đài:** Chuyển đổi giữa 5 thể loại (☕ *Lofi Chill & Study*, 🎧 *Chillhop Beats*, 🌙 *Sleep & Relax*, 🌌 *Synthwave*, 🍰 *Coffee Shop*).
  - `[ ⏸️ Tạm Dừng / ▶️ Tiếp Tục ]`: Tạm dừng hoặc tiếp tục luồng nhạc.
  - `[ 🔒 24/7: BẬT / TẮT ]`: Ghim bot ở lì trong phòng, không bao giờ tự thoát.
  - `[ 🔀 Đổi Đài ]`: Đổi ngẫu nhiên thể loại khác.
  - `[ 🛑 Dừng & Rời ]`: Tắt đài và cho bot rời phòng thoại.

---

> [!NOTE]
> Bot đã được lập trình sẵn cơ chế **Auto-Resume**: Nếu máy chủ hosting khởi động lại, bot sẽ **tự động vào lại đúng phòng voice cũ và tiếp tục phát nhạc** mà bạn không cần phải gọi lại lệnh!
