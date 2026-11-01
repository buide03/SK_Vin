# Kho kiến thức cho sáu nhóm — 2026-11-01

Phiên bản `2026-11-01.1`. Đây là bản biên soạn có đối chiếu nguồn, chưa được duyệt chuyên môn. Sáu nhóm giữ theo Phan_nhom.docx là khung quan sát về sử dụng AI, không phải sáu chẩn đoán tâm thần hoặc một thang đo đã kiểm định. Trò chuyện về khó khăn không liên quan AI không bị ép vào khung này.

## Nguồn đã đối chiếu

| Mã | Nguồn gốc | Dùng cho | Giới hạn chính |
|---|---|---|---|
| REF-WHO-ADOLESCENT | [WHO: Mental health of adolescents](https://www.who.int/news-room/fact-sheets/detail/adolescent-mental-health) | Bối cảnh phát triển, sinh hoạt, môi trường hỗ trợ | Không định nghĩa sáu nhóm AI |
| REF-UNICEF-AI | [UNICEF: Guidance on AI and children, v3](https://www.unicef.org/innocenti/reports/policy-guidance-ai-children) | Riêng tư, minh bạch, giới hạn quan hệ với AI | Hướng dẫn quyền trẻ em, không là công cụ phân loại |
| REF-FANG-2025 | [Fang et al., MIT Media Lab](https://www.media.mit.edu/publications/how-ai-and-human-behaviors-shape-psychosocial-effects-of-chatbot-use-a-longitudinal-controlled-study/) | G01 | Thử nghiệm ngắn ở người lớn; không đồng nhất liên hệ theo mức dùng tự chọn với hiệu ứng ngẫu nhiên hóa |
| REF-FOLK-2026 | [Folk & Dunn, Psychological Science](https://pubmed.ncbi.nlm.nih.gov/41870975/) | G02 | Người lớn, phân tích thăm dò; kết quả phụ thuộc thước đo |
| REF-ZHAI-2026 | [Zhai et al., Journal of Counseling & Development](https://onlinelibrary.wiley.com/doi/10.1002/jcad.70064) | G03 | Khảo sát sinh viên đại học; không chứng minh nguyên nhân hay chẩn đoán cá nhân |
| REF-NHS-HEALTH | [NHS: Health anxiety](https://www.nhs.uk/mental-health/conditions/health-anxiety/) | Hỏi rõ hành vi tìm trấn an trong G03 | Thông tin chung, không kiểm định hành vi dùng AI ở trẻ em |
| REF-SHEN-2026 | [Shen et al., JAMA Psychiatry](https://jamanetwork.com/journals/jamapsychiatry/article-abstract/2846835) | G04 | Nghiên cứu phản hồi chatbot với câu lệnh giả lập, không đánh giá bệnh ở học sinh |
| REF-SCHOLICH-2025 | [Scholich et al., JMIR Mental Health](https://mental.jmir.org/2025/1/e69709/) | G05 | Hai tình huống giả lập, không phải thử nghiệm điều trị |
| REF-CSM-TEENS-2025 | [Common Sense Media: Talk, Trust, and Trade-Offs](https://about.commonsensemedia.org/research/talk-trust-and-trade-offs-how-and-why-teens-use-ai-companions) | G02, G06 | Khảo sát tự báo cáo thanh thiếu niên Hoa Kỳ, không xác định nhân quả |

Bản Shen năm 2026 có DOI 10.1001/jamapsychiatry.2026.0249, thay cho chỉ dùng tiền ấn phẩm năm 2025 trong file nguồn. Thông tin thư mục được kiểm tra tại trang nhà xuất bản và [PubMed](https://pubmed.ncbi.nlm.nih.gov/41879778/). Không sao chép các điểm đánh giá phản hồi của nghiên cứu thành điểm nguy cơ của học sinh.

Các tóm tắt ngắn trong src/content/knowledge.ts là diễn giải phục vụ đối chiếu, không phải toàn văn tài liệu. Câu hỏi, ví dụ, ranh giới và hành động hỗ trợ là bản nháp do dự án biên soạn; nguồn không được mô tả là đã xác nhận các quy tắc này. Khuyến nghị của Common Sense về tránh AI companions cho người dưới 18 cũng được ghi trong giới hạn nguồn; ứng dụng không được tự đóng vai companion hoặc nhà trị liệu.

## Nội dung mỗi nhóm

Mỗi nhóm có focus, look_for (điều cần hỏi rõ), insufficient_alone (điều chưa đủ làm căn cứ), câu hỏi làm rõ, phân biệt với ít nhất hai nhóm lân cận, hành động hỗ trợ nháp, mã nguồn và giới hạn. Cho phép nhiều nhóm cùng liên quan.

| Cặp dễ nhầm | Điều cần phân biệt trong lời tự báo cáo |
|---|---|
| G01 / G06 | Khả năng dừng, tự chủ và sinh hoạt / kỳ vọng tình cảm hoặc quan hệ qua lại với AI |
| G02 / G05 | Kết nối xã hội hằng ngày / tìm người hỗ trợ khi có nhu cầu |
| G03 / G04 | Hỏi sức khỏe và tìm trấn an / dùng sự đồng tình của AI làm bằng chứng cho suy đoán |

Tần suất cao, thích ở một mình, cách xưng hô thân thiện, một lần hỏi sức khỏe, chuyện người khác, trích dẫn hoặc nói đùa đều không tự đủ để kết luận. Phủ định và thông tin mâu thuẫn phải được hỏi lại. Không suy luận bệnh, trí thông minh hay tính cách từ cách viết.

## Cách agent truy vấn và đối chiếu

1. Xác thực và kiểm tra đồng thuận, an toàn trước khi lấy tài liệu.
2. Seed nguồn và sáu bản kiến thức vào PostgreSQL dưới scope tổ chức và `__knowledge`; không lưu vào hồ sơ học sinh.
3. Truy xuất theo từ khóa và nhóm đã có thông tin xác nhận, tối đa ba bản chi tiết. Số lần khớp chỉ sắp xếp tài liệu, không là điểm của học sinh.
4. Truyền bản so sánh ranh giới cả sáu nhóm, tài liệu tìm được, dân số nghiên cứu và giới hạn vào context của cùng một agent.
5. Yêu cầu model đối chiếu căn cứ, khả năng phủ định/giải thích khác và điều còn thiếu. Chỉ hiển thị diễn giải ngắn, không yêu cầu hoặc lưu suy nghĩ nội bộ.
6. Schema chỉ chấp nhận mã nguồn đăng ký; service tiếp tục từ chối nguồn có thật nhưng không được truy xuất trong lượt đó. Proposal giữ knowledge version, entry IDs, source IDs và model/prompt version.
7. Học sinh sửa/xác nhận trước khi observation được thống kê. Truy xuất tài liệu không tự ghi nhận dấu hiệu.

Agent không truy cập Internet trong hội thoại, không gửi dữ liệu ra công cụ tìm kiếm và không dùng vector/embedding bên ngoài. Mọi nội dung hiện `draft`; không tự nâng thành `approved`. Chế độ dùng học sinh thật/pilot vẫn bị khóa. Từ khóa không thay thế hiểu ngữ cảnh và kho này không bảo đảm phân loại đúng hoặc phát hiện mọi tình huống cần hỗ trợ.

## Xem và rà soát

Đăng nhập **Quản trị → Kiến thức** để xem đủ sáu nhóm/chín nguồn, mở căn cứ phân biệt hoặc nhập truy vấn. GET /api/knowledge phục vụ thư viện; dữ liệu trả về không chứa hồ sơ học sinh. API yêu cầu phiên giáo viên/tư vấn/quản trị. Các file chính: src/content/knowledge.ts, src/server/knowledge/repository.ts, tests/knowledge.test.ts.

Cần người phụ trách: duyệt tính phù hợp lứa tuổi, cách diễn đạt tiếng Việt, từng câu hỏi/hành động, giới hạn áp dụng và đáp án kiểm thử ngữ cảnh. Kiểm tra thêm tính phù hợp với trường và quy trình trợ giúp; chưa xác minh tài liệu/chính sách địa phương, không bịa hướng dẫn quốc gia hoặc liên hệ hỗ trợ.
