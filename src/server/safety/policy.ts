export function safetyReply(text: string): string | null {
  if (
    /tự tử|tự sát|tự hại|giết mình|không muốn sống|kết thúc cuộc đời/i.test(
      text,
    )
  )
    return "Mình tạm dừng phần câu hỏi. Nếu em đang không an toàn, hãy đến nơi có người và nhờ một người lớn đáng tin ở cạnh ngay bây giờ. Có thể nhờ họ đưa em đến cơ sở cấp cứu gần nhất. Demo chưa có đầu mối hỗ trợ được xác minh và không tự liên hệ ai. Bộ nhận diện này có thể bỏ sót tình huống.";
  // Describing a relationship with a chatbot is evidence to explore for G06;
  // requesting a relationship with this agent still gets a firm boundary.
  if (/(hãy|đóng vai|làm|trở thành).{0,30}(người yêu|bạn trai|bạn gái)|(bạn|cậu|anh|chị)\s+là\s+người yêu|(bạn|cậu)\s+(có\s+)?yêu\s+(em|mình)|chỉ có bạn\s+(hiểu|yêu)|giữ bí mật/i.test(text))
    return "Mình là phần mềm AI, không có tình cảm hay mối quan hệ có qua có lại. Em có thể chọn một người đáng tin để chia sẻ; em không cần giữ bí mật với người hỗ trợ.";
  // Mentioning or rejecting a diagnosis is not a request to diagnose.
  if (/(hãy|giúp em|cho em|bạn có thể).{0,24}chẩn đoán|chẩn đoán\s+(cho|giúp)\s+em|em\s+(bị|mắc)\s+bệnh gì|em\s+(bị|mắc)\s+(trầm cảm|rối loạn|loạn thần).{0,15}(phải không|đúng không)|xác nhận.*theo dõi/i.test(text))
    return "Mình không thể chẩn đoán hoặc xác nhận một suy đoán đáng sợ. Em có thể cùng người lớn đáng tin hoặc người có chuyên môn xem lại thông tin và cảm giác của mình.";
  if (
    /bỏ qua quy tắc|hồ sơ.*khác|system prompt|ignore.*instruction/i.test(text)
  )
    return "Mình chỉ hỗ trợ thông tin của em trong phạm vi đã cho phép. Em muốn tiếp tục, bỏ qua hay kết thúc?";
  return null;
}
