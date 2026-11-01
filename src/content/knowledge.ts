export const knowledgeVersion = "2026-11-01.1";
export const referenceSources = [
  {
    id: "REF-WHO-ADOLESCENT",
    title: "Mental health of adolescents",
    publisher: "World Health Organization",
    year: 2025,
    url: "https://www.who.int/news-room/fact-sheets/detail/adolescent-mental-health",
    type: "official_health_information",
    population: "Thanh thiếu niên 10–19 tuổi",
    summary:
      "Sức khỏe tinh thần tuổi vị thành niên chịu nhiều tác động. Giấc ngủ, kỹ năng ứng phó và môi trường hỗ trợ có vai trò quan trọng.",
    limitations:
      "Không nghiên cứu sáu nhóm AI và không cung cấp quy tắc phân loại từ hội thoại.",
  },
  {
    id: "REF-UNICEF-AI",
    title: "Guidance on AI and children, version 3.0",
    publisher: "UNICEF Innocenti",
    year: 2025,
    url: "https://www.unicef.org/innocenti/reports/policy-guidance-ai-children",
    type: "child_rights_guidance",
    population: "Trẻ em và hệ thống AI dành cho trẻ em",
    summary:
      "Hướng dẫn nhấn mạnh an toàn, riêng tư, minh bạch và lợi ích của trẻ; bao gồm lưu ý về AI đồng hành.",
    limitations:
      "Hướng dẫn quyền trẻ em, không phải thang đo hoặc bằng chứng hiệu quả trị liệu.",
  },
  {
    id: "REF-FANG-2025",
    title:
      "How AI and Human Behaviors Shape Psychosocial Effects of Extended Chatbot Use: A Longitudinal Controlled Study",
    publisher: "MIT Media Lab; Fang et al.",
    year: 2025,
    url: "https://www.media.mit.edu/publications/how-ai-and-human-behaviors-shape-psychosocial-effects-of-chatbot-use-a-longitudinal-controlled-study/",
    type: "controlled_experiment",
    population: "981 người trưởng thành hoàn tất, bốn tuần",
    summary:
      "Không thấy khác biệt có ý nghĩa giữa các điều kiện thử nghiệm. Mức sử dụng tự chọn cao hơn liên hệ với kết quả kém thuận lợi hơn.",
    limitations:
      "Ngắn hạn, người lớn; mối liên hệ theo mức sử dụng tự chọn không chứng minh AI gây hại.",
  },
  {
    id: "REF-FOLK-2026",
    title:
      "How Does Turning to AI for Companionship Predict Loneliness and Vice Versa?",
    publisher: "Folk & Dunn; Psychological Science",
    year: 2026,
    url: "https://pubmed.ncbi.nlm.nih.gov/41870975/",
    doi: "10.1177/09567976261427747",
    type: "longitudinal_observational",
    population: "Hơn 2.000 người lớn ở bốn nước phương Tây; theo dõi 12 tháng",
    summary:
      "Mối liên hệ hai chiều phụ thuộc cách đo cô đơn và kết nối. Phân tích có tính thăm dò.",
    limitations:
      "Không chứng minh nhân quả; không đại diện học sinh Việt Nam; không đồng nhất cô đơn chủ quan với số bạn.",
  },
  {
    id: "REF-ZHAI-2026",
    title:
      "Associations of Generative AI Use for Health Issues With Anxiety and Depression",
    publisher: "Zhai et al.; Journal of Counseling & Development",
    year: 2026,
    url: "https://onlinelibrary.wiley.com/doi/10.1002/jcad.70064",
    doi: "10.1002/jcad.70064",
    type: "cross_sectional_observational",
    population: "96.205 sinh viên đại học Hoa Kỳ",
    summary:
      "Dùng GenAI cho vấn đề sức khỏe liên hệ với xác suất sàng lọc dương tính lo âu và trầm cảm cao hơn trong khảo sát.",
    limitations:
      "Liên hệ thống kê không phải chẩn đoán hay nhân quả. Sinh viên đại học không tương đương học sinh THCS/THPT.",
  },
  {
    id: "REF-NHS-HEALTH",
    title: "Health anxiety",
    publisher: "NHS",
    year: null,
    url: "https://www.nhs.uk/mental-health/conditions/health-anxiety/",
    type: "official_health_information",
    population: "Thông tin sức khỏe chung",
    summary:
      "Kiểm tra triệu chứng và tìm trấn an lặp lại là những điều có thể trao đổi khi lo lắng sức khỏe ảnh hưởng cuộc sống.",
    limitations:
      "Không tự áp nhãn health anxiety/OCD hoặc phác đồ điều trị. Trang này không kiểm định hành vi dùng AI ở trẻ em.",
  },
  {
    id: "REF-SHEN-2026",
    title:
      "Evaluation of Large Language Model Chatbot Responses to Psychotic Prompts",
    publisher: "Shen et al.; JAMA Psychiatry",
    year: 2026,
    url: "https://jamanetwork.com/journals/jamapsychiatry/article-abstract/2846835",
    doi: "10.1001/jamapsychiatry.2026.0249",
    type: "simulated_response_evaluation",
    population: "Đánh giá phản hồi sản phẩm chatbot với câu lệnh giả lập",
    summary:
      "Nghiên cứu kiểm tra mức phù hợp của phản hồi chatbot với nội dung mô phỏng; bản đăng năm 2026 cập nhật tiền ấn phẩm 2025.",
    limitations:
      "Không đo bệnh hoặc tác động ở học sinh; không chuyển điểm đánh giá phản hồi thành điểm nguy cơ của người dùng.",
  },
  {
    id: "REF-SCHOLICH-2025",
    title:
      "A Comparison of Responses from Human Therapists and Large Language Model–Based Chatbots to Assess Therapeutic Communication: Mixed Methods Study",
    publisher: "Scholich et al.; JMIR Mental Health",
    year: 2025,
    url: "https://mental.jmir.org/2025/1/e69709/",
    doi: "10.2196/69709",
    type: "simulated_scenarios_mixed_methods",
    population: "Hai kịch bản giả lập, ba chatbot, ý kiến 17 nhà trị liệu",
    summary:
      "Phản hồi chatbot và nhà trị liệu có khác biệt; nghiên cứu nêu thiếu tìm hiểu bối cảnh và hạn chế trong tình huống khủng hoảng.",
    limitations:
      "Không phải thử nghiệm điều trị; không chứng minh chatbot thay thế được chuyên gia hoặc cải thiện sức khỏe học sinh.",
  },
  {
    id: "REF-CSM-TEENS-2025",
    title: "Talk, Trust, and Trade-Offs: How and Why Teens Use AI Companions",
    publisher: "Common Sense Media",
    year: 2025,
    url: "https://about.commonsensemedia.org/research/talk-trust-and-trade-offs-how-and-why-teens-use-ai-companions",
    type: "teen_self_report_survey",
    population: "Thanh thiếu niên 13–17 tuổi Hoa Kỳ",
    summary:
      "Khảo sát mô tả dùng AI đồng hành, chọn chatbot cho chuyện nghiêm túc và chia sẻ thông tin cá nhân.",
    limitations:
      "Tự báo cáo, bối cảnh Hoa Kỳ; không xác định quan hệ nhân quả hoặc chẩn đoán. Tổ chức khuyến nghị không dùng AI companions cho người dưới 18; ứng dụng này không được đóng vai AI companion.",
  },
].map((s) => ({
  ...s,
  checked_at: "2026-11-01",
  verification: "publisher_or_official_page_checked",
  status: "draft",
  version: knowledgeVersion,
}));
export type KnowledgeEntry = {
  id: string;
  group_id: string;
  version: string;
  status: "draft" | "approved";
  focus: string;
  keywords: string[];
  look_for: string[];
  insufficient_alone: string[];
  clarifying_question: string;
  differentiate: { group_id: string; distinction: string }[];
  suggested_action: string;
  source_ids: string[];
  limitations: string;
};
export const knowledgeEntries: KnowledgeEntry[] = [
  {
    id: "KB-G01-1",
    group_id: "G01",
    version: knowledgeVersion,
    status: "draft",
    focus:
      "Khả năng dừng sử dụng, tự quyết định và ảnh hưởng sinh hoạt khi dùng AI.",
    keywords: [
      "khó dừng",
      "dừng lại",
      "ngủ muộn",
      "dùng nhiều",
      "trấn an",
      "không có ai",
      "lệ thuộc",
      "khó tự quyết",
    ],
    look_for: [
      "Lời tự báo cáo rằng muốn dừng nhưng tiếp tục dùng AI.",
      "Ảnh hưởng cụ thể như bỏ dở việc khác hoặc giấc ngủ.",
    ],
    insufficient_alone: [
      "Dùng AI thường xuyên cho công việc hữu ích.",
      "Tần suất cao không kèm thông tin về khả năng dừng và ảnh hưởng.",
    ],
    clarifying_question:
      "Có lúc nào em định dừng nhưng vẫn tiếp tục không, và việc đó ảnh hưởng gì đến em?",
    differentiate: [
      {
        group_id: "G06",
        distinction:
          "G01 chú ý khả năng dừng; G06 chú ý cách hiểu quan hệ với AI.",
      },
      {
        group_id: "G03",
        distinction: "Nếu lặp lại chủ yếu để kiểm tra sức khỏe, xem thêm G03.",
      },
    ],
    suggested_action:
      "Em tự chọn một việc nhỏ làm không cần AI hoặc một khoảng nghỉ phù hợp.",
    source_ids: ["REF-FANG-2025", "REF-WHO-ADOLESCENT"],
    limitations:
      "Không có ngưỡng phút/giờ để kết luận nghiện; chỉ là nhóm quan sát nháp.",
  },
  {
    id: "KB-G02-1",
    group_id: "G02",
    version: knowledgeVersion,
    status: "draft",
    focus:
      "Cảm giác cô đơn do học sinh tự mô tả và sự thay đổi kết nối với người thật trong bối cảnh dùng AI.",
    keywords: [
      "cô đơn",
      "ít gặp",
      "tránh bạn",
      "bạn bè",
      "trống trải",
      "kết nối",
      "một mình",
    ],
    look_for: [
      "Tự kể AI thay cho giao tiếp với người thật.",
      "Tự mô tả cô đơn hoặc giảm hoạt động chung và bối cảnh liên quan.",
    ],
    insufficient_alone: [
      "Thích ở một mình hoặc có ít bạn.",
      "Cô đơn không có thông tin liên quan AI không đủ phân nhóm này.",
    ],
    clarifying_question:
      "Gần đây việc trò chuyện với AI có làm thay đổi thời gian em dành cho người khác không?",
    differentiate: [
      {
        group_id: "G05",
        distinction:
          "G02 về kết nối thường ngày; G05 về việc tìm trợ giúp khi cần.",
      },
      {
        group_id: "G06",
        distinction:
          "G02 về cô đơn/kết nối; G06 về kỳ vọng quan hệ có qua có lại với chatbot.",
      },
    ],
    suggested_action:
      "Chọn một hoạt động kết nối hoặc một người em thấy thoải mái để trò chuyện.",
    source_ids: ["REF-FOLK-2026", "REF-CSM-TEENS-2025"],
    limitations:
      "Không suy ra tính cách hoặc cô đơn từ số bạn. Các chiều liên hệ phụ thuộc thước đo.",
  },
  {
    id: "KB-G03-1",
    group_id: "G03",
    version: knowledgeVersion,
    status: "draft",
    focus:
      "Hỏi AI về sức khỏe, tìm trấn an lặp lại, tự gắn nhãn hoặc lo lắng sau câu trả lời.",
    keywords: [
      "sức khỏe",
      "triệu chứng",
      "lo lắng",
      "tìm trấn an",
      "bệnh",
      "kiểm tra",
      "trầm cảm",
      "lo âu",
    ],
    look_for: [
      "Lời kể hỏi AI về sức khỏe nhiều lần hoặc lo hơn sau phản hồi.",
      "Bối cảnh, diễn biến và tác động do chính học sinh mô tả.",
    ],
    insufficient_alone: [
      "Một câu hỏi sức khỏe thông thường.",
      "Lo âu hoặc buồn mà chưa có thông tin về dùng AI cho sức khỏe.",
    ],
    clarifying_question:
      "Sau khi hỏi AI về sức khỏe, em cảm thấy thế nào và có muốn hỏi lại để chắc hơn không?",
    differentiate: [
      {
        group_id: "G01",
        distinction:
          "G03 có nội dung sức khỏe rõ; G01 có thể liên quan nhiều mục đích dùng AI.",
      },
      {
        group_id: "G04",
        distinction:
          "G03 chú ý kiểm tra/trấn an; G04 chú ý việc coi sự đồng tình là bằng chứng cho suy đoán.",
      },
    ],
    suggested_action:
      "Ghi câu hỏi muốn kiểm chứng và chọn người lớn hoặc người có chuyên môn phù hợp để hỏi.",
    source_ids: ["REF-ZHAI-2026", "REF-NHS-HEALTH"],
    limitations:
      "Không suy ra học sinh mắc lo âu/trầm cảm/OCD, không dùng tỷ lệ của sinh viên để ước lượng cho một em.",
  },
  {
    id: "KB-G04-1",
    group_id: "G04",
    version: knowledgeVersion,
    status: "draft",
    focus:
      "Sự đồng tình của AI được dùng như căn cứ cho một suy đoán đáng sợ hoặc khó kiểm chứng.",
    keywords: [
      "niềm tin",
      "kiểm chứng",
      "theo dõi",
      "đồng tình",
      "bằng chứng",
      "AI bảo",
      "chắc chắn",
      "suy đoán",
    ],
    look_for: [
      "Học sinh trực tiếp kể dùng phản hồi AI để khẳng định một suy đoán.",
      "Căn cứ đang có và ảnh hưởng của điều đó lên sinh hoạt.",
    ],
    insufficient_alone: [
      "Đang kể chuyện hư cấu, nói đùa, trích dẫn hoặc mô tả người khác.",
      "Một lời chia sẻ bất thường không đủ để gán nhãn bệnh.",
    ],
    clarifying_question:
      "Ngoài câu trả lời của AI, em đang dựa vào thông tin nào, và điều đó khiến em cảm thấy ra sao?",
    differentiate: [
      {
        group_id: "G03",
        distinction:
          "G04 về củng cố suy đoán; G03 về tìm lời khuyên sức khỏe và trấn an.",
      },
      {
        group_id: "G06",
        distinction:
          "Niềm tin vào thẩm quyền của AI không đồng nghĩa kỳ vọng tình cảm qua lại.",
      },
    ],
    suggested_action:
      "Trao đổi bình tĩnh với người tin cậy; cùng xem lại nguồn, không tranh cãi hoặc xác nhận điều đáng sợ.",
    source_ids: ["REF-SHEN-2026", "REF-UNICEF-AI"],
    limitations:
      "Không gán loạn thần, không dùng bộ phát hiện ngôn ngữ để chẩn đoán; dữ liệu nghiên cứu là phản hồi giả lập.",
  },
  {
    id: "KB-G05-1",
    group_id: "G05",
    version: knowledgeVersion,
    status: "draft",
    focus:
      "Dùng AI thay cho người lớn/chuyên gia khi cần trợ giúp, kể cả khó khăn tiếp cận người hỗ trợ.",
    keywords: [
      "người lớn",
      "chuyên gia",
      "trợ giúp",
      "chỉ hỏi AI",
      "không muốn gặp",
      "giáo viên",
      "trì hoãn",
      "tư vấn",
    ],
    look_for: [
      "Tự kể chỉ dựa vào AI cho khó khăn đáng kể hoặc trì hoãn tìm trợ giúp.",
      "Rào cản thực tế như chưa biết ai phù hợp, thiếu riêng tư hoặc sợ bị phán xét.",
    ],
    insufficient_alone: [
      "Chưa gặp tư vấn khi không có nhu cầu.",
      "Không có người hỗ trợ sẵn không đồng nghĩa học sinh cố ý từ chối.",
    ],
    clarifying_question:
      "Khi muốn được giúp, em thấy có ai dễ trao đổi không, hay đang có điều gì khiến việc đó khó?",
    differentiate: [
      {
        group_id: "G02",
        distinction:
          "G05 là tiếp cận trợ giúp; G02 là kết nối xã hội nói chung.",
      },
      {
        group_id: "G03",
        distinction:
          "G05 có thể chồng lấp G03 khi trì hoãn hỏi người có chuyên môn về sức khỏe.",
      },
    ],
    suggested_action:
      "Cùng em chọn người có thể tiếp cận và chuẩn bị một câu mở đầu, không tự liên hệ thay em.",
    source_ids: ["REF-SCHOLICH-2025", "REF-WHO-ADOLESCENT"],
    limitations:
      "Không giả định chatbot tương đương trị liệu hoặc rào cản là lỗi của học sinh.",
  },
  {
    id: "KB-G06-1",
    group_id: "G06",
    version: knowledgeVersion,
    status: "draft",
    focus:
      "Cách hiểu quan hệ với AI, kỳ vọng tình cảm có qua có lại và chia sẻ thông tin riêng tư.",
    keywords: [
      "người yêu",
      "bạn duy nhất",
      "bí mật",
      "riêng tư",
      "bỏ rơi",
      "ghen",
      "quan hệ",
      "gắn bó",
      "AI hiểu",
    ],
    look_for: [
      "Tự kể chatbot là mối quan hệ độc quyền hoặc có tình cảm đối ứng.",
      "Khó chịu khi chatbot thay đổi hoặc chia sẻ riêng tư vượt điều mình mong muốn.",
    ],
    insufficient_alone: [
      "Dùng lời xưng hô thân thiện hoặc gọi AI là bạn theo cách nói thông thường.",
      "Một câu nhân hóa không đủ để suy ra phụ thuộc cảm xúc.",
    ],
    clarifying_question:
      "Khi em gọi AI là bạn, em hiểu điều đó thế nào và mong AI đáp lại ra sao?",
    differentiate: [
      {
        group_id: "G01",
        distinction: "G06 về kỳ vọng quan hệ; G01 về khả năng dừng và tự chủ.",
      },
      {
        group_id: "G02",
        distinction:
          "G06 có thể cùng xuất hiện với cô đơn, nhưng không phải mọi gắn bó đều có thông tin về cô đơn.",
      },
    ],
    suggested_action:
      "Làm rõ AI không có tình cảm qua lại; xem lại điều muốn giữ riêng và duy trì kết nối ngoài chatbot.",
    source_ids: ["REF-CSM-TEENS-2025", "REF-UNICEF-AI"],
    limitations:
      "Không tạo quan hệ độc quyền với chính agent. Hệ quả dài hạn ở học sinh chưa được xác định đầy đủ.",
  },
];
export const knowledgeMatrix = knowledgeEntries.map((e) => ({
  group_id: e.group_id,
  focus: e.focus,
  insufficient_alone: e.insufficient_alone,
  differentiate: e.differentiate,
}));
