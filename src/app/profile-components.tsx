"use client";
import { useState } from "react";
import { groups, sources } from "../content/catalog";
type Row = {
  id: string;
  kind: string;
  version: number;
  data: Record<string, any>;
};
export function Proposal({
  row,
  busy,
  confirm,
}: {
  row: Row;
  busy: boolean;
  confirm: (p: unknown) => Promise<boolean>;
}) {
  const [summary, setSummary] = useState(row.data.summary),
    [status, setStatus] = useState(row.data.status),
    [frequency, setFrequency] = useState(String(row.data.frequency ?? "")),
    [impact, setImpact] = useState(String(row.data.reported_impact ?? ""));
  return (
    <article>
      <h3>{row.data.group_id} · {groups.find((g) => g.id === row.data.group_id)?.name} · Chờ xác nhận</h3>
      <label>
        Em sửa bản tóm tắt
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={600}
        />
      </label>
      <label>
        Tần suất em tự mô tả
        <input value={frequency} onChange={(e) => setFrequency(e.target.value)} maxLength={100} placeholder="Chưa có thông tin" />
      </label>
      <label>
        Ảnh hưởng em tự mô tả
        <textarea value={impact} onChange={(e) => setImpact(e.target.value)} maxLength={300} placeholder="Chưa có thông tin" />
      </label>
      <label>
        Trạng thái do em xác nhận
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {[
            ["needs_clarification", "Chưa rõ"],
            ["reported_present", "Em xác nhận có trải nghiệm này"],
            ["reported_absent", "Em xác nhận không có"],
            ["skipped", "Em bỏ qua"],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {Array.isArray(row.data.source_ids) && (
        <details>
          <summary>Tài liệu tham khảo</summary>
          <p>
            Đây là nhận xét nháp dựa trên lời em chia sẻ; tài liệu không quyết
            định em thuộc nhóm nào. Em có thể sửa hoặc không xác nhận.
          </p>
          {row.data.source_ids.map((id: string) => {
            const source = sources.find((s) => s.id === id);
            if (!source) return null;
            return (
              <p key={id}>
                {"url" in source ? (
                  <a href={String(source.url)} target="_blank" rel="noreferrer">
                    {source.title} ↗
                  </a>
                ) : (
                  source.title
                )}
                <small style={{ display: "block" }}>{source.limitations}</small>
              </p>
            );
          })}
        </details>
      )}
      <button
        aria-label="Xác nhận lưu thông tin này"
        disabled={busy || !summary.trim()}
        onClick={() =>
          void confirm({
            proposal_id: row.id,
            observation: {
              group_id: row.data.group_id,
              status,
              summary,
              frequency: frequency.trim() || null,
              reported_impact: impact.trim() || null,
            },
          })
        }
      >
        Lưu xác nhận
      </button>
    </article>
  );
}
export function Plan({
  available,
  busy,
  choose,
}: {
  available: string[];
  busy: boolean;
  choose: (p: unknown) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState(available[0] ?? "");
  if (!available.length)
    return (
      <p className="empty-inline">
        Xác nhận nhận xét trước để chọn kế hoạch phù hợp.
      </p>
    );
  const group = groups.find((g) => g.id === (selected || available[0]));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void choose({
          group: f.get("group"),
          option: Number(f.get("option")),
          goal: f.get("goal"),
          frequency: f.get("frequency"),
          tracking: f.get("tracking"),
          fallback: f.get("fallback"),
        });
      }}
    >
      <label>
        Nội dung đã xác nhận
        <select
          name="group"
          value={selected || available[0]}
          onChange={(e) => setSelected(e.target.value)}
        >
          {available.map((g, i) => (
            <option key={g} value={g}>
              {g} · {groups.find((item) => item.id === g)?.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Việc em muốn thử
        <select name="option">
          {group?.actions.map((a, i) => (
            <option value={i} key={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label>
        Mục tiêu em muốn chọn
        <input
          name="goal"
          required
          maxLength={100}
          defaultValue="Thử một thay đổi nhỏ trong tuần này"
        />
      </label>
      <div className="form-grid">
        {[
          ["frequency", "Tần suất em tự chọn", "Ba lần trong tuần"],
          ["tracking", "Cách ghi nhận", "Tự đánh dấu sau mỗi lần"],
          ["fallback", "Phương án khi khó thực hiện", "Chọn một bước nhỏ hơn"],
        ].map(([name, label, value]) => (
          <label key={name}>
            {label}
            <input name={name} required maxLength={100} defaultValue={value} />
          </label>
        ))}
      </div>
      <button disabled={busy}>Chọn kế hoạch này</button>
    </form>
  );
}

export function ProfessionalForm({
  kind,
  busy,
  submit,
}: {
  kind: string;
  busy: boolean;
  submit: (p: unknown) => Promise<boolean>;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void submit(
          kind === "review"
            ? { target: "demo-student-a", text: f.get("text") }
            : { group: f.get("group"), text: f.get("text") },
        );
      }}
    >
      {kind === "draft_content" && (
        <label>
          Nhóm
          <select name="group">
            {groups.map((g) => (
              <option key={g.id}>{g.id}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        {kind === "review"
          ? "Ghi nhận của con người (dữ liệu giả)"
          : "Bản nháp nội dung mới — chưa được dùng trong live"}
        <textarea name="text" required maxLength={1000} />
      </label>
      <button disabled={busy}>Lưu</button>
    </form>
  );
}

export function PlanEditor({
  row,
  busy,
  submit,
}: {
  row: Row;
  busy: boolean;
  submit: (p: unknown) => Promise<boolean>;
}) {
  return (
    <details>
      <summary>Sửa kế hoạch</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void submit({
            plan_id: row.id,
            status: "selected",
            goal: f.get("goal"),
            frequency: f.get("frequency"),
            tracking: f.get("tracking"),
            fallback: f.get("fallback"),
          });
        }}
      >
        {[
          ["goal", "Mục tiêu mới"],
          ["frequency", "Tần suất mới"],
          ["tracking", "Cách ghi nhận mới"],
          ["fallback", "Phương án dự phòng mới"],
        ].map(([name, label]) => (
          <label key={name}>
            {label}
            <input
              name={name}
              defaultValue={row.data[name]}
              required
              maxLength={100}
            />
          </label>
        ))}
        <button disabled={busy}>Lưu sửa kế hoạch</button>
      </form>
    </details>
  );
}
