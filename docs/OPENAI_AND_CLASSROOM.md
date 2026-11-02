# Giao diện gọn và lớp mẫu 40 học sinh

Học sinh có ba bước: Trò chuyện → Nhận xét → Kế hoạch. Người tư vấn chỉ đọc các hồ sơ được phân công. Giáo viên xem tổng quan, số liệu tổng hợp và mã/tên nhóm theo từng mã HS sau khi học sinh đồng ý chia sẻ và xác nhận; không xem chat, bản tóm tắt hoặc ghi chú tư vấn. Dữ liệu lớp, tài khoản và phân công hiện đều giả lập, không phải triển khai cho học sinh thật.

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
## Câu hỏi tiếp nối về nhóm

Agent gửi tối đa sáu tin nhắn gần đây thành các lượt user/assistant riêng, trước tin nhắn hiện tại. Ngữ cảnh này chỉ ở RAM, hết hạn sau 30 phút, mất khi server restart và được xóa khi kết thúc/rút đồng thuận/xóa hồ sơ. Không lưu conversation ở OpenAI (`store:false`), không dùng `previous_response_id`.

Prompt `openai-2` yêu cầu đối chiếu cả lời kể trước khi em hỏi “thuộc nhóm nào”, nêu mã/tên nhóm có thể liên quan và căn cứ, không đánh đồng phân nhóm khung quan sát với chẩn đoán bệnh. Thiếu lịch sử hoặc chưa đủ bằng chứng vẫn phải hỏi làm rõ, không bịa lại. Nhận xét của AI trước đó không được coi là bằng chứng mới. Quan sát vẫn cần học sinh xác nhận trước khi lưu chính thức.

## Nhóm đã xác nhận cho giáo viên

Giáo viên → Lớp học → Nhóm học sinh đã xác nhận. Bảng có mã HS, mã và tên nhóm, ngày xác nhận. Dùng “Cập nhật nhóm” nếu học sinh vừa xác nhận ở cửa sổ khác. Chỉ hiển thị bản hiện hành gần nhất theo nhóm có `reported_present`, có thời điểm xác nhận và đồng thuận chia sẻ còn hiệu lực. Không có xác nhận/không đồng ý chia sẻ không được hiểu là không có khó khăn. Sửa thành không có/bỏ qua/chưa rõ sẽ không còn hiển thị như nhóm có trải nghiệm; rút đồng thuận/xóa loại nhóm khỏi bảng.

Đây là thay đổi quyền xem so với bản chỉ tổng hợp trước đó. Học sinh cần đọc và đồng ý lại thông báo mới (`demo-groups-2` hoặc `demo-openai-groups-2`). Không tự bật cờ chia sẻ cho hồ sơ cũ. API chỉ trả mã/tên nhóm và ngày; không trả tóm tắt, tần suất, ảnh hưởng hay hội thoại cho giáo viên. Admin không tự nhận quyền bảng nhóm này. Cần duyệt lại chính sách/quyền truy cập trước dùng thật.

## Phân tích và kế hoạch theo lời kể

Prompt `openai-3` chủ động đối chiếu khi đủ căn cứ; trình bày nhóm có thể liên quan, căn cứ, ảnh hưởng tự báo cáo và một bước để học sinh chọn. Mức độ lâm sàng, điểm nguy cơ và các mức nhẹ/vừa/nặng không được tạo từ chat. Tần suất/ảnh hưởng thiếu vẫn là null; học sinh sửa hai trường này trong Nhận xét trước xác nhận. Kế hoạch chỉ là gợi ý cho tới khi học sinh chọn và lưu; mốc xem lại lấy từ FOLLOW_UP_DAYS.

Kho truy xuất giữ tối đa sáu nhóm phù hợp, kèm sáu cặp ví dụ minh họa/counter-example do ứng dụng biên soạn. Các ví dụ là draft, không phải thang đo, không được coi là trải nghiệm của học sinh hoặc bằng chứng hiệu quả. Tài liệu nguồn vẫn có giới hạn như trong KNOWLEDGE_BASE.md. Kết quả kiểm thử tình huống không chứng minh độ chính xác lâm sàng.
