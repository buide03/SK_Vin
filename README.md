# Agent tư vấn — SK_Vin

Đóng gói Docker và triển khai Render: xem [hướng dẫn từng bước](docs/DEPLOY_RENDER.md). Có bản Docker/PGlite với persistent disk và bản Free dùng PostgreSQL riêng; mặc định mock, có mật khẩu truy cập, chỉ dùng dữ liệu giả.

Demo Render Free hiện dùng PostgreSQL Free tách khỏi web để tránh giới hạn RAM của DB nhúng. Đặt `DATABASE_URL` nội bộ trong Render Environment; không cần disk cho backend này. DB Free hết hạn sau 30 ngày. Không có URL thì app dùng PGlite local như trước.

Ứng dụng tiếng Việt chạy local với một agent điều phối, đang chạy mock, sẵn adapter OpenAI API và Ollama. Xem [giao diện/lớp 40 và OpenAI](docs/OPENAI_AND_CLASSROOM.md), [kho kiến thức](docs/KNOWLEDGE_BASE.md). Chỉ nhập dữ liệu giả. Giai đoạn 0–6 có các lát cắt demo và kiểm tra tự động; các phần còn thiếu so với nghiệm thu đầy đủ được ghi rõ trong docs/REVIEW_REQUIRED.md và docs/ARCHITECTURE.md. LLM thật local đã được nối; triển khai với dữ liệu/tài khoản thật và pilot vẫn bị chặn.

## Chạy local

Node 24 LTS và npm. Trong thư mục repo:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run seed
npm run dev
```

Mở http://127.0.0.1:3000 . Chọn HS01–HS40, đồng ý và trò chuyện. Mở Nhận xét để sửa/xác nhận, sau đó chọn Kế hoạch. Chọn Quản trị → Lớp học → Nạp lớp mẫu để có bộ dữ liệu giả 40 học sinh; Giáo viên xem thống kê tổng hợp, Quản trị → Kiến thức xem sáu nhóm và chín nguồn. Có thể rút đồng thuận/xóa ngay trên giao diện. Mock cố ý không tự gán hiện diện; học sinh tự chọn trạng thái.

Máy hiện tại thiếu lệnh npm trong PATH. Có thể thay `npm` bằng `node C:\Users\Admin\.cache\sk-vin-npm\package\bin\npm-cli.js`. Tiện ích bootstrap nằm ngoài repo; khi chuyển máy nên cài Node/npm thông thường. Không cần API key, Docker hoặc PostgreSQL server để chạy demo. PGlite lưu bền ở .data/pg, không đưa vào Git. Chỉ một tiến trình truy cập data directory; dừng server trước chạy seed. Seed có bốn hồ sơ giả (nhiều nhóm/vắng mặt/bỏ qua/mâu thuẫn), chạy lại không tăng bản ghi. A/B dùng để thao tác hành trình; seed fixture dùng cho báo cáo và test. Không tự tạo tài khoản thật.

## Kiểm tra

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

NEXT_TELEMETRY_DISABLED=1 trong .env.local. Nếu build chưa đọc env hoặc kiểm thử dùng tiến trình mới, đặt `$env:NEXT_TELEMETRY_DISABLED='1'` trước lệnh. Bài test integration dùng PostgreSQL nhúng riêng trong RAM, không sửa demo DB. Kiểm tra trình duyệt dùng DB riêng trên cổng 3100 với dữ liệu giả, độc lập app cổng 3000. Không chạy nhiều server Next trên cùng thư mục.

## Cấu hình và giới hạn

APP_MODE chỉ demo; MODEL_MODE=mock dùng kiểm thử, MODEL_MODE=live gọi provider đã cấu hình: OpenAI API (cần API key, được phép gửi ra ngoài và đồng thuận phù hợp) hoặc Ollama local. APP_MODE=live/pilot vẫn bị chặn; không fallback mock ngầm. SMALL_CELL_THRESHOLD tối thiểu 10; FOLLOW_UP_DAYS từ 1–90, mặc định 7. Giá trị sai bị từ chối. E01 không có trong danh mục hợp lệ. Không cần API key cho LLM local; chưa có người hỗ trợ, SSO hoặc nguồn approved. Không điền giả thông tin thật. Không có tác vụ gửi email, nhắc bên ngoài, export CSV hay triển khai pilot.

GET /api/app trả hồ sơ theo cookie server; POST /api/app nhận op/key/version/payload, kiểm tra schema, quyền và xung đột; GET /api/app?report=1&start=YYYY-MM-DD&end=YYYY-MM-DD chỉ cho giáo viên/tư vấn. POST /api/demo chỉ tạo phiên với danh tính giả trong whitelist. Không có student_id/org_id trong hợp đồng ghi do client hoặc model chỉ định.

Nội dung draft và bộ phát hiện từ khóa chưa được thẩm định; không phải công cụ chẩn đoán hoặc bảo đảm phát hiện nguy cấp. Các giới hạn quan trọng về schema dữ liệu, đăng nhập thật, báo cáo, quản trị nội dung và vận hành được liệt kê trong docs/REVIEW_REQUIRED.md. Không dùng demo với học sinh thật.
