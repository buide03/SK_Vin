# Báo cáo triển khai demo, giai đoạn 0–6

Mọi kết quả bên dưới là kiểm tra kỹ thuật với dữ liệu giả. Nội dung, câu trả lời hỗ trợ và chỉ báo chưa được người phụ trách duyệt. Không triển khai giai đoạn 7.

| Giai đoạn | Chức năng chạy được | Kiểm tra | Bước kế tiếp / giới hạn |
|---|---|---|---|
| 0 | Đọc nguồn Word; lưu SHA-256/bản trích; sáu nhóm, mỗi nhóm ba câu hỏi khám phá, hai làm rõ, hai hành động nháp; khóa dependency; hai migration | Test danh mục, cấu hình live/sai bị chặn; typecheck/build | Người phụ trách duyệt nội dung và bộ chỉ báo cốt lõi |
| 1 | UI tiếng Việt thích ứng; phiên demo có cookie server; đồng thuận; PostgreSQL nhúng có lưu bền; seed nghiệp vụ và bốn hồ sơ giả | Seed chạy hai lần; test trước đồng thuận, quyền học sinh/tư vấn/admin, RLS | Cấu hình SSO và PostgreSQL server thật chưa được xác nhận |
| 2 | Đề xuất riêng với observation; sửa/xác nhận; nhiều nhóm; lịch sử current=false; snapshot coverage và phiên bản | Test chưa xác nhận không vào hồ sơ, thay thế không đếm trùng, hai lần ghi đồng thời chỉ một thành công | Các chỉ báo thực tế và dữ liệu chưa được thẩm định |
| 3 | Một bộ điều phối; mock adapter; schema đầu ra; nguồn thuộc danh mục; kết thúc/bỏ qua; giới hạn lượt và timeout | 30 ca (5 mỗi nhóm), nguồn giả/đầu ra sai/timeout bị rollback, injection không đổi quyền; browser đi tới xác nhận | Cập nhật: LiveModelAdapter đã chạy thật bằng Ollama local/Qwen3 4B; mock vẫn dùng kiểm thử. Chưa có đánh giá chất lượng hội thoại bởi con người |
| 4 | Tự chọn mục tiêu, một hành động, tần suất/cách theo dõi/dự phòng; liên kết observation và chiến lược; sửa/từ chối có lịch sử; check-in | Test hành trình chọn và phản hồi, phiên bản/lịch sử sửa và xóa toàn bộ; browser ghi nhận một phần | Nội dung chiến lược draft; không gửi nhắc lịch ra ngoài |
| 5 | SQL mẫu số/tử số, incomplete, coverage, chồng lấp, kế hoạch/phản hồi; suppression toàn bảng; hồ sơ được phân công, ghi chú người tư vấn, nháp quản trị | Fixture đáp án 10/20, bản cũ không tăng số; từ chối vai trò và chéo tổ chức; ghi chú cần consent/phân công | Chưa có nguồn số được mời/tham gia nên null; không export; chưa có giao diện so sánh hai kỳ; các ô nhỏ không được hiển thị |
| 6 | Nhánh hỗ trợ trước cá nhân hóa; thông tin người hỗ trợ thiếu được nói rõ; yêu cầu hỗ trợ chỉ local; rút/xóa cả snapshots/history/notes/commands; quyền mỗi API | Unit/integration, lỗi DB, RLS write, Origin, xóa, browser đầy đủ; build và typecheck | Detector từ khóa có thể bỏ sót; chưa có review con người, DB vận hành thật, kiểm toán bảo mật hoặc xác nhận lâm sàng |

Các lệnh kiểm tra nằm trong README. Test hội thoại có đáp án kỹ thuật phục vụ mock, không thay thế đánh giá của người hiểu bối cảnh học sinh. Không tự nâng các nội dung seed thành approved. Xem REVIEW_REQUIRED.md để biết những việc cần người phụ trách duyệt và phần live chưa được xác nhận.

Các lỗi tìm thấy và đã sửa: thiếu thư mục cha khi mở DB lưu bền; Origin bị Next chuẩn hóa localhost trong khi trình duyệt dùng 127.0.0.1; seed top-level await khi chạy CJS; cấu hình TypeScript mới bỏ baseUrl; khai báo CSS; đầu ra thiếu nguồn và sửa quan sát bị đếm trùng được chặn bằng schema/index.
