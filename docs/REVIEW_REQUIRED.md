# Điều kiện cần người phụ trách duyệt — live và pilot bị khóa

- Xác nhận lứa tuổi, tổ chức triển khai, đồng thuận người giám hộ, phiên bản thông báo và chính sách pháp lý thực tế.
- Duyệt từng nhóm, chỉ báo cốt lõi, 30 câu hỏi, 12 hành động nháp; thẩm định nguồn và giới hạn bằng chứng. Không có tài liệu nào tự được nâng thành approved.
- Duyệt phản hồi hỗ trợ an toàn và đầu mối trợ giúp được xác minh. Không điền số điện thoại hoặc tên người hỗ trợ giả.
- Duyệt kết quả hội thoại, thêm ca phương ngữ và ngữ cảnh địa phương; mock chỉ có quy tắc đơn giản, có thể bỏ sót tình huống nguy cấp. Không mô tả kết quả test là hiệu quả lâm sàng.
- Cung cấp và tích hợp IdP/SSO trường với Better Auth; thay phân công cố định demo bằng memberships và counselor_assignments có quản trị. Kiểm thử DB thật với non-owner, pool, RLS và failover.
- Đã có các bảng partition theo thực thể mục 7, ghi chú tư vấn, yêu cầu hỗ trợ local, snapshot và sửa/từ chối kế hoạch có lịch sử. Cần rà soát JSONB/constraints cho triển khai thật, quy trình content approval và bộ chỉ báo cốt lõi thực tế.
- Chọn nhà cung cấp và rà soát hợp đồng, lưu giữ dữ liệu, địa điểm lưu, quyền truy cập, bí mật, egress allowlist và ngân sách. LiveModelAdapter đã tích hợp Ollama local với model Qwen3 4B; đã có adapter OpenAI Responses API nhưng chưa có key/chưa xác nhận kết nối thật. Xem OPENAI_AND_CLASSROOM.md.
- Hoàn thiện TTL đề xuất, phiên và audit; mã hóa khi lưu, TLS, backup, xóa dữ liệu trong backup, quy trình sự cố và khôi phục. Demo chưa bảo đảm các điều kiện vận hành này.
- Rà soát privacy của thống kê theo toàn bộ truy vấn, ô bổ sung, export và cohort nhỏ. Hiện demo chỉ cung cấp báo cáo cơ bản có suppression.
- Người dùng phải yêu cầu riêng giai đoạn 7. Chưa triển khai pilot, chưa tạo tài khoản thật, chưa gửi thông tin học sinh ra ngoài.

Kho kiến thức chín nguồn đã kiểm tra trang gốc nhưng cả sáu bản hướng dẫn đối chiếu, câu hỏi và hành động vẫn draft. Cần người phụ trách duyệt chuyên môn; không đồng nhất “kiểm tra nguồn” với “phân loại đã được kiểm định”.
