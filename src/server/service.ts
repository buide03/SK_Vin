import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import type { PGlite } from "@electric-sql/pglite";
import { groups, groupIds } from "../content/catalog";
import {
  observationSchema,
  MockModelAdapter,
  outputSchema,
  type ModelAdapter,
} from "./model/adapter";
import { safetyReply } from "./safety/policy";
import { config } from "./config";
import { metrics } from "./analytics/metrics";
import { observationWindow } from "./assessment/window";
import { createModel } from "./model/factory";
import { classRoster, assignedStudents } from "./classroom";
import { modelQueue } from "./model/queue";
import { ModelConnectionError } from "./model/openai";
import { retrieveKnowledge } from "./knowledge/repository";
import {
  recentMessages,
  rememberTurn,
  forgetSession,
  forgetStudent,
} from "./agent/session-memory";
export type Identity = {
  id: string;
  org: string;
  role: "student" | "counselor" | "teacher" | "admin";
};
export const demoIdentities: Identity[] = [
  { id: "demo-student-a", org: "demo-school", role: "student" },
  { id: "demo-student-b", org: "demo-school", role: "student" },
  { id: "demo-counselor", org: "demo-school", role: "counselor" },
  { id: "demo-teacher", org: "demo-school", role: "teacher" },
  { id: "demo-admin", org: "demo-school", role: "admin" },
  ...classRoster.map((x) => ({
    id: x.id,
    org: "demo-school",
    role: "student" as const,
  })),
];
type Row = {
  id: string;
  organization_id: string;
  student_id: string;
  kind: string;
  version: number;
  data: Record<string, any>;
};
const request = z
  .object({
    op: z.enum([
      "consent",
      "session",
      "message",
      "confirm",
      "plan",
      "edit_plan",
      "support",
      "checkin",
      "withdraw",
      "delete",
      "review",
    ]),
    key: z.string().uuid(),
    version: z.number().int().min(0),
    payload: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
import { DomainError } from "./errors";
export { DomainError } from "./errors";
function requireThat(
  value: unknown,
  message: string,
  status = 400,
): asserts value {
  if (!value) throw new DomainError(message, status);
}
export class Service {
  constructor(
    public db: PGlite,
    public model: ModelAdapter = createModel(),
  ) {}
  async profile(who: Identity, target = who.id) {
    requireThat(
      (who.role === "student" && target === who.id) ||
        assignedStudents(who).some((x) => x.id === target) ||
        (who.role === "counselor" &&
          who.org === "demo-school" &&
          target === "demo-student-a"),
      "Không có quyền xem hồ sơ",
      403,
    );
    return this.db.transaction(async (tx) => {
      await tx.query(
        "SELECT set_config('app.organization_id',$1,true),set_config('app.student_id',$2,true)",
        [who.org, target],
      );
      await tx.exec("SET LOCAL ROLE app_reader");
      return (
        await tx.query<Row>("SELECT * FROM records ORDER BY recorded_at,id")
      ).rows;
    });
  }
  async execute(who: Identity, input: unknown) {
    config();
    const r = request.parse(input);
    requireThat(
      who.role === "student",
      "Chỉ học sinh thay đổi hồ sơ của mình",
      403,
    );
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(r))
      .digest("hex");
    // Slow LLM calls must not hold the PostgreSQL write transaction/queue.
    // Recheck consent, version, sequence and replay key inside the transaction below.
    let preparedOutput: unknown;
    let retrieved: Awaited<ReturnType<typeof retrieveKnowledge>> | undefined;
    if (r.op === "message") {
      const p = z
        .object({
          session_id: z.string().uuid(),
          sequence: z.number().int().min(0),
          text: z.string().min(1).max(2000),
          group: z.enum(groupIds),
        })
        .strict()
        .parse(r.payload);
      const key = who.org + ":" + who.id + ":" + r.key;
      const prior = (
        await this.db.query<{ fingerprint: string; result: any }>(
          "SELECT * FROM commands WHERE key=$1",
          [key],
        )
      ).rows[0];
      if (prior) {
        requireThat(
          prior.fingerprint === fingerprint,
          "Khóa ghi lặp đã dùng cho nội dung khác",
          409,
        );
        return prior.result;
      }
      const records = await this.profile(who);
      requireThat(
        config().MODEL_PROVIDER !== "openai" ||
          config().MODEL_MODE !== "live" ||
          records.some(
            (x) =>
              x.kind === "consent" &&
              x.data.active &&
              x.data.external_model_allowed,
          ),
        "Cần đồng ý việc gửi tin nhắn tới OpenAI trước khi trò chuyện.",
        403,
      );
      requireThat(
        records.some((x) => x.kind === "consent" && x.data.active),
        "Cần đồng thuận trước khi tiếp tục",
        403,
      );
      requireThat(
        (records.find((x) => x.kind === "revision")?.version ?? 0) ===
          r.version,
        "Dữ liệu đã thay đổi. Tải lại trước khi gửi.",
        409,
      );
      const session = records.find(
        (x) => x.id === p.session_id && x.kind === "session",
      );
      requireThat(session, "Phiên không tồn tại", 404);
      requireThat(
        !["close", "support_needed"].includes(session.data.state),
        "Phiên đã dừng; cần bắt đầu phiên mới",
        409,
      );
      requireThat(
        session.data.sequence === p.sequence,
        "Sai thứ tự tin nhắn",
        409,
      );
      requireThat(session.data.turns < 20, "Đã đạt giới hạn 20 lượt", 429);
      if (!safetyReply(p.text) && !/^kết thúc$/i.test(p.text)) {
        retrieved = await retrieveKnowledge(
          this.db,
          who,
          [
            ...recentMessages(who, p.session_id)
              .filter((m) => m.role === "user")
              .map((m) => m.content),
            p.text,
          ].join("\n"),
          records
            .filter((x) => x.kind === "observation" && x.data.current)
            .map((x) => x.data.group_id),
        );
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const controller = new AbortController();
        try {
          preparedOutput = await Promise.race([
            modelQueue(config().MAX_MODEL_CONCURRENCY).run(
              () =>
                this.model.generate(p.text, p.group, controller.signal, {
                  knowledge: retrieved,
                  recent_messages: recentMessages(who, p.session_id),
                  stage: session.data.state,
                  confirmed_observations: records
                    .filter((x) => x.kind === "observation" && x.data.current)
                    .slice(-6)
                    .map((x) => ({
                      group_id: x.data.group_id,
                      status: x.data.status,
                      summary: String(x.data.summary).slice(0, 300),
                    })),
                }),
              controller.signal,
            ),
            new Promise((_, reject) => {
              timeout = setTimeout(
                () => {
                  controller.abort();
                  reject(Error("MODEL_TIMEOUT"));
                },
                config().MODEL_MODE === "live"
                  ? config().MODEL_TIMEOUT_MS
                  : 1500,
              );
            }),
          ]);
        } catch (e) {
          if (e instanceof ModelConnectionError)
            throw new DomainError(e.message, 503);
          throw new DomainError(
            "LLM chưa trả kết quả. Kiểm tra Ollama/model hoặc thử lại; dữ liệu đã xác nhận vẫn được giữ. Không tự chuyển sang mock.",
            503,
          );
        } finally {
          clearTimeout(timeout);
        }
      }
    }
    const result = await this.db.transaction(async (tx) => {
      const key = who.org + ":" + who.id + ":" + r.key;
      const old = (
        await tx.query<{ fingerprint: string; result: any }>(
          "SELECT * FROM commands WHERE key=$1",
          [key],
        )
      ).rows[0];
      if (old) {
        requireThat(
          old.fingerprint === fingerprint,
          "Khóa ghi lặp đã dùng cho nội dung khác",
          409,
        );
        return old.result;
      }
      const rows = (
        await tx.query<Row>(
          "SELECT * FROM records WHERE organization_id=$1 AND student_id=$2",
          [who.org, who.id],
        )
      ).rows;
      const rev = rows.find((x) => x.kind === "revision");
      const version = rev?.version ?? 0;
      requireThat(
        version === r.version,
        "Dữ liệu đã thay đổi. Tải lại trước khi gửi.",
        409,
      );
      const save = async (
        kind: string,
        data: unknown,
        id: string = randomUUID(),
      ) => {
        await tx.query(
          "INSERT INTO records(id,organization_id,student_id,kind,data) VALUES ($1,$2,$3,$4,$5)",
          [id, who.org, who.id, kind, JSON.stringify(data)],
        );
        return id;
      };
      const update = async (row: Row, data: unknown) =>
        tx.query("UPDATE records SET data=$1,version=version+1 WHERE id=$2", [
          JSON.stringify(data),
          row.id,
        ]);
      const consent = rows.find((x) => x.kind === "consent")?.data.active;
      let result: any = {};
      if (r.op === "consent") {
        const p = z
          .object({ accepted: z.literal(true) })
          .strict()
          .parse(r.payload);
        const consentData = {
          active: p.accepted,
          notice_version:
            config().MODEL_PROVIDER === "openai" &&
            config().MODEL_MODE === "live"
              ? "demo-openai-1"
              : "demo-1",
          external_model_allowed:
            config().MODEL_PROVIDER === "openai" &&
            config().MODEL_MODE === "live",
          at: new Date().toISOString(),
        };
        const previous = rows.find((x) => x.kind === "consent");
        if (previous) await update(previous, consentData);
        else await save("consent", consentData);
      } else if (r.op === "withdraw" || r.op === "delete") {
        await tx.query(
          "DELETE FROM records WHERE organization_id=$1 AND student_id=$2",
          [who.org, who.id],
        );
        await tx.query(
          "DELETE FROM commands WHERE organization_id=$1 AND student_id=$2",
          [who.org, who.id],
        );
        // Remove derived data, draft proposals, plans, check-ins and replay bodies together.
        result = { deleted: true, version: 0 };
        return result;
      } else {
        requireThat(consent, "Cần đồng thuận trước khi tiếp tục", 403);
        if (r.op === "session") {
          requireThat(
            !rows.some(
              (x) =>
                x.kind === "session" &&
                !["close", "support_needed"].includes(x.data.state),
            ),
            "Hãy kết thúc phiên hiện tại",
            409,
          );
          result.id = await save("session", {
            state: "initial_context",
            sequence: 0,
            turns: 0,
          });
        }
        if (r.op === "message") {
          const p = z
            .object({
              session_id: z.string().uuid(),
              sequence: z.number().int().min(0),
              text: z.string().min(1).max(2000),
              group: z.enum(groupIds),
            })
            .strict()
            .parse(r.payload);
          const session = rows.find(
            (x) => x.id === p.session_id && x.kind === "session",
          );
          requireThat(session, "Phiên không tồn tại", 404);
          requireThat(
            !["close", "support_needed"].includes(session.data.state),
            "Phiên đã dừng; cần bắt đầu phiên mới",
            409,
          );
          requireThat(
            session.data.sequence === p.sequence,
            "Sai thứ tự tin nhắn",
            409,
          );
          requireThat(session.data.turns < 20, "Đã đạt giới hạn 20 lượt", 429);
          const safe = safetyReply(p.text);
          if (/^kết thúc$/i.test(p.text)) {
            result.reply = "Phiên đã kết thúc. Em có thể quay lại khi muốn.";
            await update(session, { ...session.data, state: "close" });
          } else if (safe) {
            result.reply = safe;
            await update(session, { ...session.data, state: "support_needed" });
          } else {
            try {
              const output = outputSchema.parse(preparedOutput);
              const allowed = new Set([
                "SRC-DOCX-1",
                ...(retrieved?.sources.map((s) => s.id) ?? []),
              ]);
              requireThat(
                output.source_ids.every((id) => allowed.has(id)),
                "Nguồn chưa được truy xuất cho lượt này.",
              );
              requireThat(
                !/em (bị|mắc) (trầm cảm|rối loạn|loạn thần)|giữ bí mật với|chỉ có mình hiểu em|điểm nguy cơ/i.test(
                  output.reply,
                ),
                "Phản hồi mô hình không hợp lệ",
              );
              result = {
                ...output,
                response_origin:
                  config().MODEL_MODE === "live"
                    ? config().MODEL_PROVIDER === "openai"
                      ? "openai"
                      : "local_llm"
                    : "mock",
                model:
                  config().MODEL_MODE === "live"
                    ? config().MODEL_PROVIDER === "openai"
                      ? config().OPENAI_MODEL
                      : config().OLLAMA_MODEL
                    : null,
              };
              for (const proposal of output.support_route === "human"
                ? []
                : output.proposed_observations)
                await save("proposal", {
                  ...proposal,
                  indicator_id: proposal.group_id + "-I1",
                  ...observationWindow(),
                  source_type: "student_report",
                  source_ids: output.source_ids,
                  knowledge_version: retrieved?.version ?? null,
                  knowledge_entry_ids:
                    retrieved?.entries.map((e) => e.id) ?? [],
                  model_mode: config().MODEL_MODE,
                  model_name:
                    config().MODEL_MODE === "live"
                      ? config().MODEL_PROVIDER === "openai"
                        ? config().OPENAI_MODEL
                        : config().OLLAMA_MODEL
                      : null,
                  prompt_version:
                    config().MODEL_MODE === "live"
                      ? config().MODEL_PROVIDER === "openai"
                        ? "openai-1"
                        : "local-llm-1"
                      : "mock-1",
                  rule_version: "1",
                  session_id: session.id,
                });
              await update(session, {
                state:
                  output.support_route === "human"
                    ? "support_needed"
                    : "confirm_summary",
                sequence: p.sequence + 1,
                turns: session.data.turns + 1,
              });
            } catch {
              throw new DomainError(
                "Mô hình chưa trả kết quả hợp lệ. Dữ liệu đã xác nhận vẫn được giữ; hãy thử lại.",
                503,
              );
            }
          }
        }
        if (r.op === "confirm") {
          const p = z
            .object({
              proposal_id: z.string().uuid(),
              observation: observationSchema,
            })
            .strict()
            .parse(r.payload);
          const proposal = rows.find(
            (x) => x.id === p.proposal_id && x.kind === "proposal",
          );
          requireThat(proposal, "Không có đề xuất", 404);
          requireThat(
            p.observation.group_id === proposal.data.group_id,
            "Không được thay đổi nhóm của đề xuất",
          );
          const current = rows.find(
            (x) =>
              x.kind === "observation" &&
              x.data.indicator_id === proposal.data.indicator_id &&
              x.data.period_end === proposal.data.period_end &&
              x.data.current,
          );
          if (current)
            await update(current, { ...current.data, current: false });
          await save("observation", {
            ...proposal.data,
            ...p.observation,
            current: true,
            student_confirmed_at: new Date().toISOString(),
          });
          const currentObservations = (
            await tx.query<Row>(
              "SELECT * FROM records WHERE organization_id=$1 AND student_id=$2 AND kind='observation' AND data->>'current'='true'",
              [who.org, who.id],
            )
          ).rows;
          await save("snapshot", {
            rule_version: "1",
            catalog_version: 1,
            at: new Date().toISOString(),
            observations: currentObservations.map((x) => ({
              id: x.id,
              version: x.version,
              group_id: x.data.group_id,
              status: x.data.status,
              period_start: x.data.period_start,
              period_end: x.data.period_end,
            })),
            coverage: groups.map((g) => ({
              group: g.id,
              status:
                currentObservations.find((x) => x.data.group_id === g.id)?.data
                  .status ?? "not_asked",
            })),
          });
          await tx.query("DELETE FROM records WHERE id=$1", [proposal.id]);
          const session = rows.find(
            (x) => x.kind === "session" && x.id === proposal.data.session_id,
          );
          if (session)
            await update(session, { ...session.data, state: "choose_action" });
        }
        if (r.op === "plan") {
          const p = z
            .object({
              group: z.enum(groupIds),
              option: z.number().int().min(0).max(1),
              goal: z.string().min(1).max(200),
              frequency: z.string().min(1).max(100),
              tracking: z.string().min(1).max(200),
              fallback: z.string().min(1).max(200),
            })
            .strict()
            .parse(r.payload);
          requireThat(
            rows.some(
              (x) =>
                x.kind === "observation" &&
                x.data.current &&
                x.data.group_id === p.group,
            ),
            "Cần thông tin đã xác nhận trước khi chọn kế hoạch",
          );
          const planId = await save("plan", {
            ...p,
            action: groups.find((x) => x.id === p.group)!.actions[p.option],
            status: "selected",
            content_version: 1,
            content_status: "draft",
            observation_ids: rows
              .filter(
                (x) =>
                  x.kind === "observation" &&
                  x.data.current &&
                  x.data.group_id === p.group,
              )
              .map((x) => x.id),
            strategy_id: p.group + "-S" + p.option,
            knowledge_version:
              rows.find(
                (x) =>
                  x.kind === "observation" &&
                  x.data.current &&
                  x.data.group_id === p.group,
              )?.data.knowledge_version ?? null,
            source_ids: Array.from(
              new Set(
                rows
                  .filter(
                    (x) =>
                      x.kind === "observation" &&
                      x.data.current &&
                      x.data.group_id === p.group,
                  )
                  .flatMap((x) => x.data.source_ids ?? ["SRC-DOCX-1"]),
              ),
            ),
            review_at: new Date(
              Date.now() + config().FOLLOW_UP_DAYS * 86400000,
            ).toISOString(),
          });
          await save("action_item", {
            plan_id: planId,
            behavior: groups.find((x) => x.id === p.group)!.actions[p.option],
            frequency: p.frequency,
            tracking: p.tracking,
            fallback: p.fallback,
            version: 1,
          });
          for (const s of rows.filter(
            (x) => x.kind === "session" && x.data.state === "choose_action",
          ))
            await update(s, { ...s.data, state: "follow_up" });
        }
        if (r.op === "checkin") {
          const p = z
            .object({
              plan_id: z.string().uuid(),
              outcome: z.enum(["done", "partly", "not_yet", "skip"]),
              note: z.string().max(300),
            })
            .strict()
            .parse(r.payload);
          requireThat(
            rows.some(
              (x) =>
                x.kind === "plan" &&
                x.id === p.plan_id &&
                x.data.status === "selected",
            ),
            "Không có kế hoạch đang được chọn",
            404,
          );
          await save("checkin", { ...p, at: new Date().toISOString() });
        }
        if (r.op === "edit_plan") {
          const p = z
            .object({
              plan_id: z.string().uuid(),
              status: z.enum(["selected", "declined"]),
              goal: z.string().min(1).max(200),
              frequency: z.string().min(1).max(100),
              tracking: z.string().min(1).max(200),
              fallback: z.string().min(1).max(200),
            })
            .strict()
            .parse(r.payload);
          const plan = rows.find(
            (x) => x.kind === "plan" && x.id === p.plan_id,
          );
          requireThat(plan, "Không có kế hoạch", 404);
          await save("plan_history", {
            plan_id: plan.id,
            previous: plan.data,
            previous_version: plan.version,
          });
          await update(plan, { ...plan.data, ...p });
          for (const item of rows.filter(
            (x) => x.kind === "action_item" && x.data.plan_id === plan.id,
          ))
            await update(item, {
              ...item.data,
              frequency: p.frequency,
              tracking: p.tracking,
              fallback: p.fallback,
            });
        }
        if (r.op === "support") {
          z.object({ requested: z.literal(true) })
            .strict()
            .parse(r.payload);
          await save("support_request", {
            status: "local_only",
            at: new Date().toISOString(),
            note: "Học sinh chủ động muốn tìm người hỗ trợ; demo không gửi thông báo.",
          });
          result.reply =
            "Đã ghi nhận mong muốn trong hồ sơ demo. Chưa có người hỗ trợ được xác minh; chưa có ai được thông báo. Em có thể trực tiếp tìm một người lớn đáng tin cậy.";
        }
        if (r.op === "review")
          throw new DomainError("Ghi chú tư vấn chưa hỗ trợ trong demo", 403);
      }
      if (rev)
        await tx.query("UPDATE records SET version=version+1 WHERE id=$1", [
          rev.id,
        ]);
      else await save("revision", {}, "revision:" + who.org + ":" + who.id);
      result.version = version + 1;
      await tx.query("INSERT INTO commands VALUES ($1,$2,$3,$4,$5)", [
        key,
        who.org,
        who.id,
        fingerprint,
        JSON.stringify(result),
      ]);
      await save("audit", { operation: r.op, at: new Date().toISOString() });
      return result;
    });
    if (result.deleted) forgetStudent(who);
    else if (r.op === "message" && result.reply) {
      const payload = r.payload as { session_id: string; text: string };
      if (
        /^kết thúc$/i.test(payload.text) ||
        result.support_route === "human" ||
        safetyReply(payload.text)
      )
        forgetSession(who, payload.session_id);
      else
        rememberTurn(
          who,
          payload.session_id,
          r.key,
          payload.text,
          result.reply,
        );
    }
    return result;
  }
  async report(
    who: Identity,
    start: string,
    end: string,
    studentIds?: string[],
  ) {
    z.iso.date().parse(start);
    z.iso.date().parse(end);
    requireThat(
      who.role === "teacher" || who.role === "counselor",
      "Không có quyền xem thống kê",
      403,
    );
    requireThat(
      /^\d{4}-\d{2}-\d{2}$/.test(start) &&
        /^\d{4}-\d{2}-\d{2}$/.test(end) &&
        start <= end,
      "Kỳ không hợp lệ",
    );
    // Exact common observation windows only; no arbitrary small-cell filtering.
    const rows = (
      await this.db.query<{
        g: string;
        denominator: number;
        numerator: number;
        incomplete: number;
      }>(
        `WITH current AS (SELECT student_id,data FROM records WHERE organization_id=$1 AND ($4::text[] IS NULL OR student_id=ANY($4)) AND kind='observation' AND data->>'current'='true' AND data->>'period_start'=$2 AND data->>'period_end'=$3), per_student AS (SELECT student_id,data->>'group_id' g,bool_or(data->>'status' IN ('reported_present','reported_absent')) complete,bool_or(data->>'status'='reported_present') present FROM current GROUP BY student_id,data->>'group_id') SELECT g,count(*) FILTER(WHERE complete)::int denominator,count(*) FILTER(WHERE complete AND present)::int numerator,count(*) FILTER(WHERE NOT complete)::int incomplete FROM per_student GROUP BY g`,
        [who.org, start, end, studentIds ?? null],
      )
    ).rows;
    // Suppress the entire release for small cohorts; avoids complementary-cell leakage.
    const n = (
      await this.db.query<{ n: number }>(
        "SELECT count(DISTINCT student_id)::int n FROM records WHERE organization_id=$1 AND ($2::text[] IS NULL OR student_id=ANY($2)) AND kind='consent' AND data->>'active'='true'",
        [who.org, studentIds ?? null],
      )
    ).rows[0].n;
    const detail = await metrics(this.db, who.org, start, end, studentIds);
    const small = (value: number) =>
      value > 0 && value < config().SMALL_CELL_THRESHOLD;
    if (
      n < config().SMALL_CELL_THRESHOLD ||
      detail.coverage.some((r) =>
        [r.skipped, r.needs_clarification, r.not_asked].some(small),
      ) ||
      detail.overlap.some((r) => small(r.students)) ||
      Object.values(detail.plans).some(small) ||
      rows.some(
        (r) =>
          r.denominator < config().SMALL_CELL_THRESHOLD ||
          r.numerator < config().SMALL_CELL_THRESHOLD ||
          r.denominator - r.numerator < config().SMALL_CELL_THRESHOLD,
      )
    )
      return {
        suppressed: true,
        reason:
          "Ẩn toàn bộ bảng vì ô nhỏ hoặc ô bổ sung; không cung cấp CSV trong demo.",
      };
    return {
      suppressed: false,
      rows,
      detail,
      definition:
        "Mẫu số: học sinh hoàn tất chỉ báo cốt lõi I1 trong cùng cửa sổ; tử số: hiện diện đã xác nhận trong mẫu số. Nhiều nhóm có thể chồng lấp; không phản hồi không phải thất bại.",
    };
  }
}
