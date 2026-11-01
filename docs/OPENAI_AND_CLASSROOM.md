# Giao diện gọn và lớp mẫu 40 học sinh

Học sinh có ba bước: Trò chuyện → Nhận xét → Kế hoạch. Người tư vấn chỉ đọc các hồ sơ được phân công. Giáo viên xem tổng quan và số liệu tổng hợp; không xem chat/hồ sơ cá nhân. Dữ liệu lớp, tài khoản và phân công hiện đều giả lập, không phải triển khai cho học sinh thật.

40 mã HS01–HS40 là độc lập, dùng namespace demo-class40 riêng với tài khoản thử nghiệm cũ. Quản trị chọn **Nạp lớp mẫu** để tạo tập dữ liệu giả có đáp án đối chiếu (hai nhóm 20/40, 20 học sinh có kế hoạch, 10 có phản hồi). Chạy lại không nhân bản và không ghi đè học sinh đã có dữ liệu. Vì thế kết quả trên DB đã dùng có thể khác bộ fixture sạch. Các ô nhỏ và ô bổ sung vẫn bị ẩn. Danh sách lớp không tiết lộ trạng thái từng học sinh cho giáo viên. Người tư vấn demo được phân công các mã lẻ; đây chưa phải hệ thống quản lý phân công/SSO thật.

## Chạy mock trước

`.env.example` mặc định MODEL_MODE=mock và MODEL_PROVIDER=openai. Trên máy phát triển hiện đã cấu hình khóa phía server và xác minh OpenAI thật bằng dữ liệu giả. Không ghi khóa trong tài liệu; mock vẫn có thể bật bằng MODEL_MODE=mock. Khóa `.env` và `.env.local` đều bị Git bỏ qua.

Khi có khóa, thêm vào **một** file `.env` hoặc `.env.local`:

```dotenv
OPENAI_API_KEY=
```

Điền giá trị thật sau dấu bằng trên máy, không gửi vào chat và không đặt NEXT_PUBLIC_. Sau đó đổi cấu hình trong `.env.local`:

```dotenv
APP_MODE=demo
MODEL_MODE=live
MODEL_PROVIDER=openai
OPENAI_MODEL=gpt-6-luna
ALLOW_EXTERNAL_MODEL=true
MODEL_TIMEOUT_MS=90000
MAX_MODEL_CONCURRENCY=4
```

Next ưu tiên `.env.local` hơn `.env`. Không để OPENAI_API_KEY rỗng trong `.env.local` nếu đã đặt khóa trong `.env`. Khởi động lại app, chạy `npm run check:llm` với mẫu giả để xác minh quyền truy cập model và tài khoản. Model là cấu hình; chưa xác nhận quyền/hạn mức của tài khoản người dùng. Không tự fallback sang Ollama/mock khi lỗi.

OpenAI adapter dùng Responses API, JSON schema strict, store=false, giới hạn output và timeout. Không gửi ID học sinh/tổ chức, toàn bộ lịch sử hoặc thinking; chỉ tin nhắn, tối đa sáu tóm tắt đã xác nhận và tài liệu cần thiết. store=false không phải cam kết zero data retention của nhà cung cấp. Cần rà soát chính sách dữ liệu trước khi dùng dữ liệu thật.

Đồng thuận cũ cho local/mock không tự cho phép gửi nội dung tới OpenAI: trước lượt chat thật, học sinh phải xác nhận thông báo mới. API key chỉ đọc phía server và không trả về UI. /api/model chỉ báo trạng thái cấu hình, không xác nhận một cuộc gọi tính phí đã thành công; thiếu key vẫn dùng mock bình thường.

## Sức tải và kiểm tra

Hàng chờ giới hạn bốn yêu cầu model đồng thời, tối đa 40 đang đợi, có hủy/timeout. Gọi model ở ngoài transaction. Đã kiểm thử 40 tác vụ mô phỏng và tính độc lập/phân quyền; chưa chạy thử 40 học sinh thật hoặc đo hạn mức OpenAI thật. Hiệu năng thực phụ thuộc model, tier, hạn mức và máy chủ. PGlite hiện dành cho một tiến trình local; triển khai nhiều máy vẫn cần PostgreSQL, xác thực và vận hành thật.

Lệnh: `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`. Trình duyệt test tự dùng mock/DB riêng trên cổng 3100. Thư viện kiến thức tại Quản trị → Kiến thức; xem KNOWLEDGE_BASE.md.

Tài liệu OpenAI chính thức đã đối chiếu: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Responses migration](https://developers.openai.com/api/docs/guides/migrate-to-responses?api-mode=responses.html), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Data controls](https://developers.openai.com/api/docs/guides/your-data). Không tuyên bố kết nối OpenAI thực đã thành công khi chưa có key.


Xác minh OpenAI thật ngày 2026-11-01: direct adapter trả openai_llm_ok; API ứng dụng trả app_openai_journey_ok với model gpt-6-luna, hồ sơ giả HS39, source_ids SRC-DOCX-1 và REF-FANG-2025. Đã kiểm tra chat, không tự lưu quan sát, xác nhận, kế hoạch và check-in (khoảng 6 giây cho lượt thử đã làm nóng). Đây là kiểm tra kết nối/luồng, không phải kiểm định chất lượng lâm sàng. Ngữ cảnh gần đây tối đa sáu tin nhắn/phiên, lưu RAM tối đa 30 phút từ hoạt động cuối, tự xóa theo timer, xóa ngay khi đóng/rút/xóa; không ghi lịch sử thô vào DB. Khóa đã được người dùng gửi qua chat nên cần thay khóa sau đợt thử.
