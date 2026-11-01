import "./style.css";
export const metadata = {
  title: "Agent tư vấn · Demo hỗ trợ sử dụng AI",
  description: "Demo giả lập, không chẩn đoán",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
