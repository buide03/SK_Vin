import { z } from "zod";
import { groupIds, sourceIds } from "../../content/catalog";
export const statuses = [
  "not_asked",
  "skipped",
  "needs_clarification",
  "reported_absent",
  "reported_present",
] as const;
export const observationSchema = z
  .object({
    group_id: z.enum(groupIds),
    status: z.enum(statuses),
    summary: z.string().min(1).max(600),
    frequency: z.string().max(100).nullable().default(null),
    reported_impact: z.string().max(300).nullable().default(null),
  })
  .strict();
export const outputSchema = z
  .object({
    reply: z.string().min(1).max(2000),
    proposed_observations: z.array(observationSchema).max(6),
    missing_information: z.array(z.string().max(300)).max(10),
    suggested_actions: z.array(z.string().max(300)).max(2),
    source_ids: z.array(z.enum(sourceIds)).min(1),
    support_route: z.enum(["none", "human"]),
  })
  .strict();
export type ModelOutput = z.infer<typeof outputSchema>;
export type ModelContext = {
  recent_messages?: { role: "user" | "assistant"; content: string }[];
  knowledge?: unknown;
  stage: string;
  confirmed_observations: {
    group_id: string;
    status: string;
    summary: string;
  }[];
};
export interface ModelAdapter {
  generate(
    text: string,
    group: string,
    signal?: AbortSignal,
    context?: ModelContext,
  ): Promise<unknown>;
}
export class MockModelAdapter implements ModelAdapter {
  async generate(
    text: string,
    group: string,
    _signal?: AbortSignal,
    context?: ModelContext,
  ): Promise<ModelOutput> {
    if (
      context &&
      !/\bAI\b|chatbot|chatgpt/i.test(text) &&
      !context.confirmed_observations.length &&
      !/bỏ qua|^không có[.!\s]*$/i.test(text)
    )
      return {
        reply:
          "Mình đang lắng nghe. Điều gì trong chuyện này khiến em bận tâm nhất?",
        proposed_observations: [],
        missing_information: [
          "Chưa có căn cứ liên quan sáu nhóm trong tài liệu nguồn.",
        ],
        suggested_actions: [],
        source_ids: ["SRC-DOCX-1"],
        support_route: "none",
      };
    const ambiguous =
      /bạn em|người khác|ví dụ|trích|nói đùa|không rõ|chắc|hôm trước|nhưng|không phải|thật ra/i.test(
        text,
      );
    const status = /bỏ qua/i.test(text)
      ? "skipped"
      : ambiguous
        ? "needs_clarification"
        : /^không có[.!\s]*$/i.test(text)
          ? "reported_absent"
          : "needs_clarification";
    const matched = context
      ? [
          ["G01", /khó dừng|ngủ muộn|vẫn.*trò chuyện|dùng.*nhiều/i],
          ["G02", /cô đơn|ít gặp|tránh.*bạn|thay.*bạn bè/i],
          ["G03", /sức khỏe|triệu chứng|lo lắng.*AI/i],
          ["G04", /niềm tin|kiểm chứng|AI.*đồng tình/i],
          ["G05", /không.*người lớn|chỉ.*AI|thay.*tư vấn/i],
          ["G06", /riêng tư|gắn bó|mối quan hệ/i],
        ]
          .filter(([, pattern]) => (pattern as RegExp).test(text))
          .map(([id]) => String(id))
      : [];
    const proposalGroups = matched.length ? matched : [group];
    const knowledge = context?.knowledge as
      { entries?: { group_id: string; source_ids: string[] }[] } | undefined;
    const usedSources =
      knowledge?.entries
        ?.filter((e) => proposalGroups.includes(e.group_id))
        .flatMap((e) => e.source_ids) ?? [];
    return {
      reply:
        status === "needs_clarification"
          ? "Mình chưa kết luận điều gì. Em có thể làm rõ trải nghiệm của chính em, hoặc sửa và xác nhận bản tóm tắt bên dưới."
          : "Em có thể xem, sửa hoặc bỏ qua bản tóm tắt trước khi lưu.",
      proposed_observations: proposalGroups.map((id) => ({
        group_id: id as (typeof groupIds)[number],
        status,
        summary: text.slice(0, 600),
        frequency: null,
        reported_impact: null,
      })),
      missing_information:
        status === "needs_clarification"
          ? ["Cần học sinh tự xác nhận trạng thái và diễn giải"]
          : [],
      suggested_actions:
        status === "needs_clarification"
          ? []
          : ["Chọn một việc nhỏ em muốn thử trong tuần này"],
      source_ids: Array.from(new Set(["SRC-DOCX-1", ...usedSources])),
      support_route: "none",
    };
  }
}
