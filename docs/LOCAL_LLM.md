# Một agent dùng LLM thật trên máy

`APP_MODE=demo` giữ dữ liệu và tài khoản giả. `MODEL_MODE=live` gọi LLM thật qua Ollama local, không có nghĩa là đã bật pilot hoặc sử dụng với học sinh thật. Chỉ có một Service điều phối; LLM không được tự ghi/xóa hồ sơ, gửi thông báo hay đọc học sinh khác. Các nội dung nghiệp vụ vẫn draft.

## Khởi động

Ollama portable 0.40.13 được tải từ release chính thức vào `%USERPROFILE%\.cache\sk-vin-ollama\runtime`. Model nằm ngoài repo tại `%USERPROFILE%\.cache\sk-vin-ollama\models`. Có thể dùng bản Ollama đã cài thông thường khi chuyển máy.

```powershell
.\scripts\start-local-llm.ps1 -Background
```

Script chỉ bind `127.0.0.1:11434`, tắt cloud qua `OLLAMA_NO_CLOUD=1`, không tạo tác vụ tự khởi động Windows. Nếu chạy foreground, dùng Ctrl+C để dừng. Nếu chạy background, script in PID; chỉ dừng đúng PID Ollama đó khi cần. Không dừng các tiến trình khác.

Chọn model đã tải trong `.env.local`:

```dotenv
APP_MODE=demo
MODEL_MODE=live
MODEL_PROVIDER=ollama
OLLAMA_MODEL=qwen3:4b
MODEL_TIMEOUT_MS=90000
NEXT_TELEMETRY_DISABLED=1
```

Model Qwen3 4B tải khoảng 2.5 GB. Khi cài trên máy khác, dùng `ollama pull qwen3:4b` với cùng `OLLAMA_HOST` và `OLLAMA_MODELS` như script. Có GPU sẽ nhanh hơn; lượt đầu có thể chậm do nạp model. Adapter không nhận URL cloud hoặc API key. Endpoint cố định ở loopback, không tự chuyển sang mock khi lỗi.

```powershell
npm run check:llm
npm run dev
```

Nếu máy thiếu lệnh npm, thay bằng `node C:\Users\Admin\.cache\sk-vin-npm\package\bin\npm-cli.js`. `check:llm` chỉ dùng mẫu hoàn toàn giả, không đọc hồ sơ hoặc lịch sử học sinh. Thành công in `real_local_llm_ok`, tên model, thời gian và câu trả lời thật. `/api/model` trả trạng thái cấu hình/model đã cài, không tự sinh câu trả lời. UI hiển thị LLM thật/local và tên model; trạng thái ready chỉ kiểm tra kết nối và model tồn tại, không đại diện chất lượng câu trả lời.

## Cách dữ liệu được dùng

Mỗi lượt gửi tới Ollama: chỉ dẫn phiên bản `local-llm-1`, danh mục/sources nháp được phép, tin nhắn hiện tại và tối đa sáu tóm tắt đã xác nhận của chính học sinh. Không gửi ID tổ chức, ID học sinh hoặc toàn bộ lịch sử. Chat hiển thị trong bộ nhớ trình duyệt và được xóa khi đổi danh tính/rút/xóa. Không lưu thinking của model. Quan sát đề xuất có provenance model/prompt version và vẫn cần xác nhận.

Kiểm tra schema JSON, sáu nhóm hợp lệ, nguồn hợp lệ, tín hiệu an toàn và quyền vẫn áp dụng. Một lần gọi/lượt, tối đa 1024 output tokens, timeout cấu hình (mặc định 90 giây), AbortSignal và không retry tự động. Gọi model nằm ngoài giao dịch DB; khi trở lại, máy chủ kiểm tra lại đồng thuận, phiên bản và thứ tự phiên. Kết quả đang chờ sẽ không lưu nếu học sinh đã rút đồng thuận. Mock tiếp tục có thể bật rõ bằng `MODEL_MODE=mock` để chạy test, không phải fallback ngầm.

## Kiểm tra và giới hạn

`npm test` kiểm tra cả adapter bằng transport giả (loopback, schema, từ chối cloud, sai nguồn/nhóm, lỗi/truncation/cancel) cùng các test nghiệp vụ; những bài đó không gọi LLM thật. `npm run check:llm` kiểm tra suy luận thật. Test trình duyệt tự chạy mock trên cổng 3100, build directory .next-e2e và DB .data/e2e-pg riêng; không đổi model của ứng dụng cổng 3000. Không mô tả các test này thành kiểm định chất lượng LLM.

Qwen là model bên thứ ba; hướng dẫn trong prompt và bộ lọc từ khóa không bảo đảm mọi đầu ra phù hợp. Vẫn chỉ dùng dữ liệu giả. Không bật E01, tự tạo điểm nguy cơ, chẩn đoán, triển khai pilot hoặc gửi dữ liệu ra nhà cung cấp. Nếu sau này chọn API cloud, cần cấu hình riêng và xác nhận rõ phạm vi dữ liệu được gửi; chưa có adapter API cloud trong phiên bản này.

Tài liệu chính thức đã đối chiếu: [Ollama chat](https://docs.ollama.com/api/chat), [structured outputs](https://docs.ollama.com/capabilities/structured-outputs), [Windows](https://docs.ollama.com/windows), [Qwen3 4B](https://ollama.com/library/qwen3:4b).


Kết quả kiểm tra ngày 2026-11-01: `check:llm` trả real_local_llm_ok, model qwen3:4b, nguồn SRC-DOCX-1, nhóm G01; lượt đầu 72.7 giây trên RTX 3050 4 GB (bao gồm warm-up). Đây là xác nhận kết nối và suy luận thật với dữ liệu giả, không phải đánh giá chất lượng hoặc an toàn lâm sàng. Digest model và các thành phần được lưu ở local-model-manifest.json.

Kiểm tra đường API ứng dụng cùng ngày: `app_real_llm_ok`, response_origin=local_llm, model=qwen3:4b, khoảng 15.3 giây sau warm-up; một proposal và không có observation trước xác nhận. Dữ liệu giả của bài kiểm tra đã được xóa sau khi kiểm tra.
