import { referenceSources } from "./knowledge";
export const groupIds = ["G01", "G02", "G03", "G04", "G05", "G06"] as const;
export const groups = [
  [
    "G01",
    "Lệ thuộc hoặc sử dụng AI có tính cưỡng bức",
    "việc dừng sử dụng AI",
    "Dành một khoảng nghỉ tự chọn",
    "Tự quyết định một việc nhỏ",
  ],
  [
    "G02",
    "Cô lập xã hội và cảm giác cô đơn",
    "kết nối với người thật",
    "Tham gia một hoạt động em thích",
    "Trò chuyện với một người em tin",
  ],
  [
    "G03",
    "Lo âu hoặc trầm cảm đi kèm việc tìm lời khuyên sức khỏe từ AI",
    "việc hỏi AI về sức khỏe",
    "Ghi lại câu hỏi để hỏi người hỗ trợ",
    "Kiểm chứng thông tin với người có chuyên môn",
  ],
  [
    "G04",
    "Củng cố niềm tin sai lệch hoặc diễn giải bất thường",
    "việc kiểm chứng câu trả lời của AI",
    "Cùng người tin cậy xem lại căn cứ",
    "Tạm dừng đọc nội dung khiến em bất an",
  ],
  [
    "G05",
    "Thay thế hỗ trợ của người lớn hoặc chuyên gia",
    "việc tìm người hỗ trợ",
    "Chuẩn bị điều em muốn trao đổi",
    "Chọn một người lớn em tin cậy",
  ],
  [
    "G06",
    "Mờ ranh giới giữa AI và một mối quan hệ có qua có lại",
    "cách em hiểu mối quan hệ với AI",
    "Xem lại thông tin riêng tư trước khi chia sẻ",
    "Dành thời gian cho một kết nối ngoài AI",
  ],
].map(([id, name, topic, a, b]) => ({
  id,
  name,
  version: 1,
  status: "draft",
  source_id: "SRC-DOCX-1",
  core: [id + "-I1"],
  questions: [
    `Trong bảy ngày vừa rồi, em muốn chia sẻ điều gì về ${topic}?`,
    `Có điều gì về ${topic} ảnh hưởng đến sinh hoạt của em không?`,
    `Em cảm thấy thế nào về ${topic}?`,
    "Điều em vừa nói là trải nghiệm của em hay câu chuyện của người khác?",
    "Em muốn sửa hoặc làm rõ điều gì trong phần vừa chia sẻ?",
  ].map((text, i) => ({
    id: `${id}-Q${i + 1}`,
    text,
    purpose: i < 3 ? "explore" : "clarify",
    age_bands: ["THCS", "THPT"],
    expected: "self_report",
    version: 1,
    status: "draft",
  })),
  actions: [a, b],
}));
export const sources = [
  {
    id: "SRC-DOCX-1",
    title: "Phan_nhom.docx do người dùng cung cấp",
    status: "draft",
    limitations:
      "Khung quan sát chưa được kiểm định. Không chứng minh nhân quả; xem docs/source-extract.txt và source-manifest.json.",
  },
  ...referenceSources,
];
export const sourceIds = sources.map((s) => s.id) as [string, ...string[]];
