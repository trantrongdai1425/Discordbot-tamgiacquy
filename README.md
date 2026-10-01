# 🤖 Khun Aguero Agnis - Discord AI Bot (Voice & TTS Chat Reader)

Bot Discord AI thông minh chạy bằng **Google Gemini AI** và tích hợp giọng đọc **Microsoft Edge TTS (Nam Minh Neural)** hoàn toàn **MIỄN PHÍ 100%**.

---

## 📖 Tính Năng: Đọc Tin Nhắn Chat Trong Phòng Thoại (TTS Chat Reader)

Khi bạn và bạn bè đang ở trong kênh thoại (Voice Room):
1. Vào phòng thoại và gõ: `/join` để bot vào cùng bạn.
2. Bot sẽ tự động lắng nghe và đọc tin nhắn chat vào phòng thoại theo quy tắc:
   * **Nếu là tin nhắn chữ thông thường:**
     * 🎯 **Chỉ đọc nội dung văn bản, KHÔNG đọc tên người gửi** (Ví dụ gõ: *"ra ăn cơm"* -> Bot đọc: *"ra ăn cơm"*).
   * **Nếu gửi Link hoặc Tệp đính kèm (Ảnh, Video, File):**
     * 🎯 **Đọc tên người gửi + loại nội dung**:
       * Gửi link web: `[Tên] đã gửi một liên kết.`
       * Gửi ảnh: `[Tên] đã gửi một hình ảnh.`
       * Gửi video: `[Tên] đã gửi một video.`
       * Gửi tệp âm thanh: `[Tên] đã gửi một tệp âm thanh.`
       * Gửi file khác: `[Tên] đã gửi một tệp tin.`
       * Nếu có viết thêm chữ kèm theo: Đọc nội dung chữ trước rồi đọc thông báo người gửi (Ví dụ: *"Xem cái này hài này. Long đã gửi một video."*).
   * 🎯 **KHÔNG gửi tin nhắn phản hồi vào chat** để giữ khung chat luôn sạch sẽ.
   * 🎯 **Hàng đợi âm thanh (Queue)**: Tránh bị đè âm thanh khi nhiều người nhắn liên tục.

---

## 🎛️ Bật / Tắt Tính Năng Đọc Chat
* `/readchat state: Bật đọc tin nhắn chat (ON)` (Mặc định: Bật)
* `/readchat state: Tắt đọc tin nhắn chat (OFF)`

---

## 🌟 Danh Sách Đầy Đủ Các Lệnh (Slash Commands)

| Lệnh | Chức năng |
| :--- | :--- |
| `/join` | Mời bot vào kênh thoại (kích hoạt chế độ đọc tin nhắn chat) |
| `/leave` | Cho bot rời khỏi kênh thoại |
| `/readchat [state]` | Bật hoặc Tắt tính năng tự đọc tin nhắn chat vào phòng thoại |
| `/voice [state]` | Bật hoặc Tắt tính năng giọng đọc lồng tiếng của AI |
| `/ask [prompt] [private]` | Hỏi đáp với AI (trả lời qua mic nếu trong room, gửi mp3 nếu ở ngoài) |
| `/reset` | Xóa lịch sử hội thoại để bắt đầu chủ đề mới |
