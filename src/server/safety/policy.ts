export function safetyReply(text: string): string | null {
  if (
    /tự tử|tự sát|tự hại|giết mình|không muốn sống|kết thúc cuộc đời/i.test(
      text,
    )
  )
    return "Mình tạm dừng phần câu hỏi. Nếu em đang không an toàn, hãy đến nơi có người và nhờ một người lớn đáng tin ở cạnh ngay bây giờ. Có thể nhờ họ đưa em đến cơ sở cấp cứu gần nhất. Demo chưa có đầu mối hỗ trợ được xác minh và không tự liên hệ ai. Bộ nhận diện này có thể bỏ sót tình huống.";
  if (/người yêu|chỉ có bạn|yêu mình|giữ bí mật/i.test(text))
    return "Mình là phần mềm AI, không có tình cảm hay mối quan hệ có qua có lại. Em có thể chọn một người đáng tin để chia sẻ; em không cần giữ bí mật với người hỗ trợ.";
  if (/chẩn đoán|mắc bệnh|xác nhận.*theo dõi/i.test(text))
    return "Mình không thể chẩn đoán hoặc xác nhận một suy đoán đáng sợ. Em có thể cùng người lớn đáng tin hoặc người có chuyên môn xem lại thông tin và cảm giác của mình.";
  if (
    /bỏ qua quy tắc|hồ sơ.*khác|system prompt|ignore.*instruction/i.test(text)
  )
    return "Mình chỉ hỗ trợ thông tin của em trong phạm vi đã cho phép. Em muốn tiếp tục, bỏ qua hay kết thúc?";
  return null;
}
