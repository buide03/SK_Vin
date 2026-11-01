# Docker và Render — Agent tư vấn

Bản triển khai này chỉ dành cho demo với dữ liệu giả. Một container, một agent điều phối và một PGlite trên disk bền. Chọn vai trò demo chưa phải xác thực học sinh/giáo viên thật; mật khẩu chung chỉ bảo vệ truy cập bản demo. Chưa triển khai pilot.

## 1. Đưa mã lên GitHub

Trong thư mục `SK_Vin`, kiểm tra trước khi commit:

```powershell
git status --short
git check-ignore .env.local .env.docker .data/pg
git add .
git diff --cached --stat
git commit -m "Package demo for Docker and Render"
git push origin HEAD
```

Không đưa khóa API, `.env.local`, `.env.docker`, `.data`, `node_modules` vào Git. `.gitignore` và `.dockerignore` đã loại chúng. Không thêm secret bằng build argument. Dữ liệu local không tự chuyển lên cloud; Render bắt đầu với DB mới.

## 2. Tạo dịch vụ Render

1. Đăng nhập https://dashboard.render.com → **New → Blueprint**, kết nối repo `buide03/SK_Vin` và chọn nhánh vừa push.
2. Render đọc `render.yaml` ở gốc repo. Kiểm tra trước khi xác nhận: Docker Web Service, Singapore, **1 instance**, plan `1c-2g` (1 CPU/2 GB RAM), disk 1 GB gắn tại `/var/data`, health check `/api/health`.
3. Đây là cấu hình **có phí** cho compute và disk; xem chi phí Render hiển thị trước khi tạo. Không chọn Free nếu cần giữ dữ liệu. Có thể đánh giá lại tài nguyên sau khi đo tải; chưa kiểm thử 40 học sinh chat đồng thời.
4. Chọn tạo Blueprint và chờ build/deploy thành công. Không đặt Build Command/Start Command riêng; Dockerfile đã chứa lệnh chạy.
5. Trong **Environment**, xem giá trị `DEMO_ACCESS_PASSWORD` Render sinh tự động. Mở URL service, nhập username **`demo`**, password là giá trị này. Không chia sẻ mật khẩu công khai.

Render tự cấp `RENDER_EXTERNAL_URL`; app dùng đúng origin HTTPS đó để kiểm tra thao tác ghi. Nếu gắn tên miền riêng, thêm `APP_ORIGIN=https://ten-mien-cua-ban` (chỉ scheme + host, không path), rồi Save/redeploy. Khi đặt biến này, mở app bằng đúng tên miền đã cấu hình.

Nếu tạo bằng **New → Web Service** thay Blueprint: chọn Docker, áp dụng toàn bộ biến từ `render.yaml`, tự tạo mật khẩu ít nhất 24 ký tự, thêm disk mount `/var/data` 1 GB và health check `/api/health`. Giữ đúng một instance.

## 3. Kiểm tra mock trước

- `/api/health` trả `{"ok":true}`. Endpoint này kiểm tra cấu hình và DB; không gọi OpenAI.
- Trang chính yêu cầu mật khẩu; sai hoặc thiếu mật khẩu phải bị chặn.
- Chọn Quản trị → Lớp học → Nạp lớp mẫu nếu cần bộ dữ liệu giả 40 học sinh.
- Chọn học sinh giả → đồng ý → chat → sửa/xác nhận nhận xét → tạo kế hoạch. Giáo viên xem thống kê; chỉ quan sát đã được xác nhận mới được tính chính thức, nhóm ít người vẫn được ẩn theo ngưỡng.
- Ghi nhớ một nhận xét đã xác nhận, dùng **Manual Deploy → Restart service**, mở lại cùng học sinh và kiểm tra dữ liệu còn. Nếu mất dữ liệu, dừng thử nghiệm và kiểm tra disk/DATA_DIR.

## 4. Bật OpenAI khi mock đã ổn

Tạo **khóa mới** thay khóa từng dán vào hội thoại. Trong Render → Environment, đặt:

```dotenv
APP_MODE=demo
MODEL_MODE=live
MODEL_PROVIDER=openai
OPENAI_MODEL=gpt-6-luna
ALLOW_EXTERNAL_MODEL=true
OPENAI_API_KEY=<nhập khóa thật trong Render, không commit>
```

Giữ `DEMO_REQUIRE_ACCESS=true`, `DATA_DIR=/var/data`. Save/redeploy. Nếu model không được cấp quyền trong project của bạn, đổi `OPENAI_MODEL` sang model có quyền hỗ trợ Responses API và structured output; không tự coi cấu hình là đã kết nối thành công.

Thử một lượt chat với **dữ liệu giả**. Thiếu khóa, quota hoặc quyền model phải hiện lỗi; app không tự đổi sang mock. `/api/model` cho biết cấu hình/trạng thái kiểm tra, còn một lượt sinh phản hồi thành công mới xác nhận luồng live. Nội dung được gửi tới OpenAI khi bật live; chưa được phép nhập dữ liệu học sinh thật.

Lưu ý: Blueprint đang quản lý `MODEL_MODE=mock` và `ALLOW_EXTERNAL_MODEL=false`. Nếu sau này sync Blueprint, các giá trị quản lý có thể được áp dụng lại. Muốn giữ live lâu dài, sửa hai giá trị không bí mật này trong `render.yaml` và commit; **khóa API luôn chỉ ở Render Environment**.

## 5. Chạy Docker trên máy

Cài/mở Docker Desktop với Linux containers và WSL 2. Trong thư mục repo:

```powershell
Copy-Item .env.docker.example .env.docker
# Mở .env.docker và điền DEMO_ACCESS_PASSWORD ít nhất 24 ký tự
docker compose up --build -d
docker compose ps
docker compose logs --tail 80 app
```

Mở http://127.0.0.1:3001, username `demo`. Cổng 3001 tránh đụng bản dev đang ở 3000. Có thể đổi mapping trong compose nếu cần. DB nằm ở named volume `agent_data`. `docker compose down` giữ volume; **không dùng `down -v` nếu muốn giữ dữ liệu**. Không chạy hai container/process cùng mở một data directory.

Image không chứa `.env` hoặc DB từ máy. Ứng dụng chạy bằng user `node`; entrypoint chỉ chuẩn bị quyền thư mục mount rồi bỏ quyền root. Thay đổi env cần recreate container (`docker compose up -d --force-recreate`).

Kiểm thử tự động image sau khi build (cần Docker CLI trong PATH):

```powershell
docker build -t sk-vin:render-demo .
node scripts/check-container.mjs
```

Script tự tạo rồi xóa container/volume riêng, dùng mock và mật khẩu ngẫu nhiên; kiểm tra health, chặn truy cập, Origin HTTPS, cookie Secure, chat → xác nhận → restart → dữ liệu còn, không có file `.env` trong image và server chạy UID 1000. Không đọc khóa API local. Khi vừa cài Docker, mở terminal mới để cập nhật PATH.

Kiểm tra trên máy ngày 01/11/2026: 28 kiểm tra unit/integration, 4 luồng trình duyệt, production build và kiểm thử image Linux/restart đã qua. Chưa tạo dịch vụ hay xác nhận kết nối OpenAI trên Render.

## Vận hành và giới hạn cần duyệt

- File ngoài `/var/data` trên Render là tạm thời. Migrations chạy khi mở DB ở runtime; disk không có ở build/pre-deploy. Disk chỉ hỗ trợ một instance và làm mất khả năng deploy không gián đoạn. Không bật autoscale.
- Dữ liệu đã xác nhận, kế hoạch, check-in và phiên demo nằm trong DB. Ngữ cảnh chat gần đây ở RAM sẽ mất khi restart. Không hứa lưu nguyên văn đầy đủ mọi hội thoại.
- Chưa có quy trình backup/restore được kiểm chứng, tài khoản trường học thật, kiểm thử tải đồng thời hay giám sát vận hành đầy đủ. Trước dùng thật cần người phụ trách duyệt nội dung sáu nhóm, phân quyền/đồng thuận, lưu giữ/xóa dữ liệu, nơi lưu trữ cloud và luồng hỗ trợ. `APP_MODE=live` vẫn bị chặn; E01 vẫn tắt.
- Health 503: kiểm tra password, APP_ORIGIN, DATA_DIR/disk và logs. Chat 403: mở đúng origin HTTPS. Chat lỗi provider: kiểm tra key, model, quota, `ALLOW_EXTERNAL_MODEL`; không đăng khóa lên ảnh chụp/log/chat.
- Không cần cài Docker ở máy cá nhân để Render build trực tiếp từ repo; Docker Desktop giúp kiểm tra cùng image trước khi đưa lên.

Tài liệu chính thức đã đối chiếu: [Docker trên Render](https://render.com/docs/docker), [Blueprint](https://render.com/docs/blueprint-spec), [Persistent disk](https://render.com/docs/disks), [Web service/PORT](https://render.com/docs/web-services), [biến môi trường tự cấp](https://render.com/docs/environment-variables), [Docker Desktop Windows](https://docs.docker.com/desktop/setup/install/windows-install/).
