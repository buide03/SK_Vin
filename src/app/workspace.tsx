"use client";
import KnowledgeLibrary from "./knowledge-library";
import { useEffect, useRef, useState } from "react";
import { groups, groupLabel } from "../content/catalog";
import {
  Proposal,
  Plan,
  ProfessionalForm,
  PlanEditor,
} from "./profile-components";
type Row = {
  id: string;
  kind: string;
  version: number;
  data: Record<string, any>;
};
const statuses: Record<string, string> = {
  reported_present: "Có trải nghiệm",
  reported_absent: "Không có",
  needs_clarification: "Chưa rõ",
  skipped: "Bỏ qua",
  selected: "Đang thực hiện",
  declined: "Đã từ chối",
  done: "Đã làm",
  partly: "Một phần",
  not_yet: "Chưa làm",
  skip: "Bỏ qua",
};
const roster = Array.from({ length: 40 }, (_, i) => ({
  id: `demo-class40-${String(i + 1).padStart(2, "0")}`,
  code: `HS${String(i + 1).padStart(2, "0")}`,
}));
export default function Workspace() {
  const [data, setData] = useState<any>(null),
    [model, setModel] = useState<any>(null),
    [view, setView] = useState("Trò chuyện"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [messages, setMessages] = useState<{ role: string; content: string }[]>([]),
    [reply, setReply] = useState(""),
    [report, setReport] = useState<any>(null),
    [classData, setClassData] = useState<any>(null),
    [target, setTarget] = useState("demo-class40-01");
  const bottom = useRef<HTMLDivElement>(null),
    rows: Row[] = data?.rows ?? [],
    role = data?.who.role,
    student = role === "student",
    external = model?.mode === "live" && model?.provider === "openai",
    consent = rows.some(
      (x) =>
        x.kind === "consent" &&
        x.data.active &&
        x.data.teacher_groups_allowed &&
        (!external || x.data.external_model_allowed),
    ),
    version = rows.find((x) => x.kind === "revision")?.version ?? 0,
    proposals = rows.filter((x) => x.kind === "proposal"),
    observations = rows.filter(
      (x) => x.kind === "observation" && x.data.current,
    ),
    plans = rows.filter((x) => x.kind === "plan"),
    session = rows.find(
      (x) =>
        x.kind === "session" &&
        !["close", "support_needed"].includes(x.data.state),
    );
  const tabs = student
    ? [
        ["◌", "Trò chuyện", "Trò chuyện"],
        ["✓", "Nhận xét", "Hồ sơ của tôi"],
        ["↗", "Kế hoạch", "Kế hoạch & tiến triển"],
      ]
    : role === "admin"
      ? [
          ["▦", "Lớp học", "Lớp học"],
          ["⌕", "Kiến thức", "Kiến thức"],
          ["⚙", "Cấu hình", "Người phụ trách"],
        ]
      : role === "counselor"
        ? [
            ["▦", "Lớp học", "Lớp học"],
            ["✓", "Hồ sơ", "Người phụ trách"],
            ["↗", "Thống kê", "Báo cáo"],
          ]
        : role === "teacher"
          ? [
              ["▦", "Lớp học", "Lớp học"],
              ["↗", "Thống kê", "Báo cáo"],
            ]
          : [];
  async function load(selected?: string) {
    const r = await fetch(
      "/api/app" + (selected ? "?student=" + selected : ""),
    );
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
    setModel(d.model);
    if (d.who.role !== "student") {
      const c = await fetch("/api/classroom");
      if (c.ok) setClassData(await c.json());
    }
  }
  useEffect(() => {
    void load().catch(() => {});
    void fetch("/api/model")
      .then((r) => r.json())
      .then(setModel)
      .catch(() => {});
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, busy]);
  async function login(id: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw Error("Không thể mở tài khoản demo.");
      setData(null);
      setMessages([]);
      setReply("");
      setText("");
      setReport(null);
      setClassData(null);
      setTarget("demo-class40-01");
      setView(roster.some((x) => x.id === id) ? "Trò chuyện" : "Lớp học");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể đăng nhập.");
    } finally {
      setBusy(false);
    }
  }
  async function act(op: string, payload: unknown = {}) {
    setBusy(true);
    setError("");
    if (
      op === "message" &&
      payload &&
      typeof payload === "object" &&
      "text" in payload
    )
      setMessages((items) => [
        ...items,
        { role: "user", content: String(payload.text) },
      ]);
    try {
      const r = await fetch("/api/app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op,
          key: crypto.randomUUID(),
          version:
            op === "review"
              ? rows.filter((x) => x.kind === "review_note").length
              : op === "draft_content"
                ? rows.filter((x) => x.kind === "content_draft").length
                : version,
          payload,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (d.reply) {
        setReply(d.reply);
        if (op === "message")
          setMessages((items) => [
            ...items,
            { role: "assistant", content: d.reply },
          ]);
      }
      if (d.deleted) {
        setMessages([]);
        setReply("");
      }
      await load(role === "counselor" ? target : undefined);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác chưa hoàn tất.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function send(value = text) {
    if (
      session &&
      (await act("message", {
        session_id: session.id,
        sequence: session.data.sequence,
        text: value,
        group: "G01",
      }))
    )
      setText("");
  }
  async function getReport(
    start = classData?.period?.period_start,
    end = classData?.period?.period_end,
  ) {
    setBusy(true);
    try {
      setError("");
      // Role switching can render navigation before classroom metadata arrives.
      if (!start || !end) {
        const response = await fetch("/api/classroom");
        const classroom = await response.json();
        if (!response.ok) throw Error(classroom.error ?? "Chưa tải được kỳ thống kê.");
        start = classroom.period?.period_start;
        end = classroom.period?.period_end;
      }
      if (!start || !end) throw Error("Chưa có kỳ thống kê hợp lệ.");
      const r = await fetch(`/api/app?report=1&start=${start}&end=${end}`);
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setReport(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa tải được thống kê.");
    } finally {
      setBusy(false);
    }
  }
  async function seed() {
    setBusy(true);
    try {
      const r = await fetch("/api/classroom", { method: "POST" });
      if (!r.ok) throw Error("Không thể nạp lớp mẫu.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể nạp lớp mẫu.");
    } finally {
      setBusy(false);
    }
  }
  const code = roster.find((x) => x.id === data?.who.id)?.code;
  const title = !data
    ? "Một nơi để được lắng nghe."
    : view === "Trò chuyện"
      ? "Hôm nay em cảm thấy thế nào?"
      : view === "Hồ sơ của tôi"
        ? "Cùng nhìn lại điều em chia sẻ"
        : view === "Kế hoạch & tiến triển"
          ? "Một bước nhỏ mỗi ngày"
          : view === "Lớp học"
            ? "Tổng quan lớp học"
            : view === "Báo cáo"
              ? "Thống kê theo nhóm"
              : role === "admin"
                ? "Cấu hình"
                : "Hồ sơ được phân công";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">◌</span>Agent tư vấn
        </a>
        <span className="workspace-label">LỚP MẪU · 40 HỌC SINH</span>
        <nav>
          {tabs.map(([icon, label, key]) => (
            <button
              key={key}
              className={view === key ? "nav-item active" : "nav-item"}
              aria-label={key}
              onClick={() => {
                setView(key);
                if (key === "Báo cáo") void getReport();
              }}
            >
              <span>{icon}</span>
              {label}
              {key === "Hồ sơ của tôi" && proposals.length > 0 && (
                <b className="badge">{proposals.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <details>
            <summary>Quyền riêng tư</summary>
            <p>
              AI không chẩn đoán. Chỉ thông tin em xác nhận được lưu vào hồ sơ.
              Người tư vấn được phân công có thể xem. Em được bỏ qua hoặc xóa dữ
              liệu.
              Giáo viên xem mã HS và các nhóm em đã xác nhận sau khi em đồng ý chia sẻ.
            </p>
          </details>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <span className="breadcrumb">
            {student ? "Không gian của em" : data ? "Quản lý lớp" : "Chào mừng"}
          </span>
          <div className="topbar-actions">
            <span
              className={
                "connection " +
                (model?.mode === "mock" || model?.ready ? "online" : "")
              }
            >
              <i />
              {model?.mode === "mock"
                ? "Mock"
                : model?.provider === "openai"
                  ? "OpenAI"
                  : model
                    ? "Ollama"
                    : "Đang kiểm tra"}
            </span>
            <label className="sr-only" htmlFor="identity">
              Tài khoản demo
            </label>
            <select
              id="identity"
              value={data?.who.id ?? ""}
              onChange={(e) => void login(e.target.value)}
              disabled={busy}
            >
              <option value="" disabled>
                Chọn tài khoản demo
              </option>
              <optgroup label="Người phụ trách">
                <option value="demo-teacher">Giáo viên</option>
                <option value="demo-counselor">Người tư vấn</option>
                <option value="demo-admin">Quản trị</option>
              </optgroup>
              <optgroup label="40 học sinh giả lập">
                {roster.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.code} · Học sinh
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </header>
        <div className="page-heading">
          <div>
            <p className="eyebrow">{student ? code : "AGENT TƯ VẤN"}</p>
            <h1>{view === "Kiến thức" ? "Kiến thức đối chiếu" : title}</h1>
          </div>
          {student && <span className="pill">Em luôn có quyền bỏ qua</span>}
        </div>
        {error && (
          <div role="alert" className="alert">
            {error}
          </div>
        )}
        {!data && (
          <section className="welcome-card">
            <div className="welcome-icon">◌</div>
            <h2>Trò chuyện. Nhìn lại. Chọn bước tiếp theo.</h2>
            <p>Chọn một vai trò để khám phá bản demo.</p>
            <div className="welcome-actions">
              <button
                onClick={() => void login("demo-class40-02")}
                disabled={busy}
              >
                Thử vai học sinh →
              </button>
              <button
                className="secondary"
                onClick={() => void login("demo-teacher")}
                disabled={busy}
              >
                Xem lớp học
              </button>
            </div>
          </section>
        )}
        {student && !consent && (
          <section className="panel consent-card">
            <span className="section-icon">✓</span>
            <h2>Trước khi bắt đầu</h2>
            <p>Chỉ dùng dữ liệu giả. Em xem và xác nhận trước khi lưu.</p>
            <p>Giáo viên sẽ xem mã HS và tên các nhóm em xác nhận có trải nghiệm. Em có thể bỏ qua hoặc rút đồng thuận và xóa dữ liệu.</p>
            {external && (
              <p className="notice">
                Tin nhắn, phần hội thoại gần đây và tóm tắt cần thiết sẽ được gửi tới OpenAI để tạo câu
                trả lời.
              </p>
            )}
            <details>
              <summary>AI và dữ liệu của em</summary>
              <p>
                AI không thay thế người hỗ trợ và không chẩn đoán. Nội dung chat
                chỉ giữ trong phiên; thông tin xác nhận lưu trên máy chủ. Người
                tư vấn được phân công có thể xem hồ sơ; giáo viên xem tên nhóm đã xác nhận của mã HS. Em có thể sửa, bỏ qua,
                rút đồng thuận và xóa. Chưa cấu hình đầu mối hỗ trợ thật; ứng
                dụng không tự liên hệ ai.
              </p>
            </details>
            <button
              aria-label="Đồng ý tham gia demo"
              disabled={busy}
              onClick={() => void act("consent", { accepted: true })}
            >
              Đồng ý và tiếp tục →
            </button>
          </section>
        )}
        {student && consent && view === "Trò chuyện" && (
          <div className="student-workspace">
            <section className="panel chat-panel">
              <div className="chat-heading">
                <div>
                  <span className="agent-avatar">◌</span>
                  <div>
                    <strong>Mình đang lắng nghe</strong>
                    <small>
                      {busy
                        ? "Đang trả lời…"
                        : "Em có thể chia sẻ theo cách của mình"}
                    </small>
                  </div>
                </div>
                {session && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => void send("kết thúc")}
                  >
                    Kết thúc
                  </button>
                )}
              </div>
              <div className="chat-scroll">
                <div className="chat-message assistant">
                  <span className="message-role">Agent tư vấn</span>
                  <p>
                    {messages.length
                      ? "Mình cùng tìm hiểu từng chút một nhé."
                      : reply ||
                        "Có điều gì gần đây khiến em bận tâm hoặc muốn chia sẻ không?"}
                  </p>
                </div>
                {messages.map((m, i) => (
                  <div className={"chat-message " + m.role} key={i}>
                    <span className="message-role">
                      {m.role === "user" ? "Em" : "Agent tư vấn"}
                    </span>
                    <p>{m.content}</p>
                  </div>
                ))}
                {busy && (
                  <div className="typing" role="status">
                    Đang xử lý <span>•••</span>
                  </div>
                )}
                <div ref={bottom} />
              </div>
              {!session ? (
                <div className="chat-start">
                  <button
                    aria-label="Bắt đầu phiên mới"
                    disabled={busy}
                    onClick={() => void act("session")}
                  >
                    Bắt đầu trò chuyện →
                  </button>
                </div>
              ) : (
                <form
                  className="composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <label className="sr-only" htmlFor="message">
                    Chia sẻ của em
                  </label>
                  <textarea
                    id="message"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={2000}
                    rows={2}
                    placeholder="Viết điều em muốn chia sẻ…"
                  />
                  <div className="composer-bottom">
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => void send("em muốn bỏ qua")}
                    >
                      Bỏ qua câu hỏi
                    </button>
                    <button
                      aria-label="Gửi chia sẻ →"
                      disabled={busy || !text.trim()}
                    >
                      Gửi ↑
                    </button>
                  </div>
                </form>
              )}
            </section>
            <div className="under-chat">
              <span>
                {external
                  ? "Xử lý qua OpenAI · dữ liệu giả"
                  : "Em xác nhận trước khi lưu hồ sơ"}
              </span>
              {proposals.length > 0 && (
                <button
                  className="text-button"
                  onClick={() => setView("Hồ sơ của tôi")}
                >
                  Xem {proposals.length} nhận xét →
                </button>
              )}
            </div>
          </div>
        )}
        {student && consent && view === "Hồ sơ của tôi" && (
          <section className="panel">
            <div className="section-heading">
              <h2>Chờ em xác nhận</h2>
              <span className="count">{proposals.length}</span>
            </div>
            {proposals.length === 0 ? (
              <Empty text="Chưa có nhận xét mới." />
            ) : (
              proposals.map((r) => (
                <Proposal
                  key={r.id}
                  row={r}
                  busy={busy}
                  confirm={(p) => act("confirm", p)}
                />
              ))
            )}
            <h2 className="section-divider">Đã lưu</h2>
            {observations.length === 0 ? (
              <Empty text="Thông tin em xác nhận sẽ xuất hiện ở đây." />
            ) : (
              observations.map((r) => (
                <article className="record" key={r.id}>
                  <span className="pill">{statuses[r.data.status]}</span>
                  <p>{r.data.summary}</p>
                  {r.data.frequency && <p>Tần suất: {r.data.frequency}</p>}
                  {r.data.reported_impact && <p>Ảnh hưởng em xác nhận: {r.data.reported_impact}</p>}
                  <small>
                    {groupLabel(r.data.group_id)}{" "}
                    · {r.data.period_end}
                  </small>
                </article>
              ))
            )}
          </section>
        )}
        {student && consent && view === "Kế hoạch & tiến triển" && (
          <div className="plan-layout">
            <section className="panel">
              <h2>Chọn một việc em muốn thử</h2>
              <Plan
                busy={busy}
                choose={(p) => act("plan", p)}
                available={Array.from(
                  new Set(observations.map((x) => x.data.group_id)),
                )}
              />
            </section>
            <section className="panel">
              <h2>Kế hoạch của em</h2>
              {plans.length === 0 ? (
                <Empty text="Một hành động nhỏ là đủ để bắt đầu." />
              ) : (
                plans.map((r) => (
                  <article className="record" key={r.id}>
                    <span className="pill">{statuses[r.data.status]}</span>
                    <h3>{r.data.goal}</h3>
                    <p>{r.data.action}</p>
                    <small>
                      {r.data.frequency} · Xem lại{" "}
                      {new Date(r.data.review_at).toLocaleDateString("vi-VN")}
                    </small>
                    <PlanEditor
                      row={r}
                      busy={busy}
                      submit={(p) => act("edit_plan", p)}
                    />
                    {r.data.status === "selected" && (
                      <div className="checkins">
                        {[
                          ["done", "Đã làm"],
                          ["partly", "Một phần"],
                          ["not_yet", "Chưa làm"],
                          ["skip", "Bỏ qua"],
                        ].map(([outcome, label]) => (
                          <button
                            className="secondary"
                            key={outcome}
                            disabled={busy}
                            onClick={() =>
                              void act("checkin", {
                                plan_id: r.id,
                                outcome,
                                note: "",
                              })
                            }
                          >
                            {label}
                          </button>
                        ))}
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() =>
                            void act("edit_plan", {
                              plan_id: r.id,
                              status: "declined",
                              goal: r.data.goal,
                              frequency: r.data.frequency,
                              tracking: r.data.tracking,
                              fallback: r.data.fallback,
                            })
                          }
                        >
                          Dừng kế hoạch
                        </button>
                      </div>
                    )}
                    {rows
                      .filter(
                        (x) => x.kind === "checkin" && x.data.plan_id === r.id,
                      )
                      .map((c) => (
                        <p className="checkin-result" key={c.id}>
                          Tự ghi nhận: {statuses[c.data.outcome]}
                        </p>
                      ))}
                  </article>
                ))
              )}
            </section>
          </div>
        )}
        {data && view === "Lớp học" && classData && (
          <>
            <div className="stats-grid">
              {[
                ["40", "Sĩ số mẫu"],
                [classData.counts.consented, "Đã đồng thuận"],
                [classData.counts.confirmed, "Có thông tin xác nhận"],
                [classData.counts.responded, "Đã phản hồi kế hoạch"],
              ].map(([value, label]) => (
                <section className="stat-card" key={label}>
                  <span>{label}</span>
                  <strong>{value ?? "—"}</strong>
                  <small>
                    {value === null ? "Ẩn ô nhỏ" : "Dữ liệu giả lập"}
                  </small>
                </section>
              ))}
            </div>
            <div className="class-layout">
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Lớp mẫu · 40 học sinh</h2>
                    <p className="muted">Mỗi mã là một hồ sơ giả độc lập.</p>
                  </div>
                  {role === "admin" && (
                    <button disabled={busy} onClick={() => void seed()}>
                      Nạp lớp mẫu
                    </button>
                  )}
                </div>
                {role === "teacher" && classData.student_groups && (
                  <section className="confirmed-groups-panel">
                    <div className="section-heading">
                      <h3>Nhóm học sinh đã xác nhận</h3>
                      <button className="text-button" disabled={busy} onClick={() => {
                        setBusy(true); setError("");
                        void load().catch((e) => setError(e instanceof Error ? e.message : "Chưa cập nhật được lớp.")).finally(() => setBusy(false));
                      }}>Cập nhật nhóm</button>
                    </div>
                    <p className="muted">Chỉ hiển thị sau khi học sinh đồng ý chia sẻ và xác nhận có trải nghiệm. Đây là nhóm quan sát, không phải chẩn đoán.</p>
                    <div className="student-group-scroll"><table className="student-group-table">
                      <thead><tr><th>Mã HS</th><th>Nhóm đã xác nhận</th></tr></thead>
                      <tbody>{classData.student_groups.map((s: any) => (
                        <tr key={s.code} data-student-code={s.code}>
                          <th scope="row">{s.code}</th>
                          <td>{s.groups.length ? s.groups.map((g: any) => (
                            <div key={g.id} className="confirmed-group-item">
                              <strong>{g.id} · {g.name}</strong>
                              <small>Xác nhận {new Date(g.confirmed_at).toLocaleDateString("vi-VN")}</small>
                            </div>
                          )) : <span className="muted">{s.reviewed ? "Đã xác nhận; chưa ghi nhận nhóm có trải nghiệm" : "Chưa có nhóm được chia sẻ và xác nhận"}</span>}</td>
                        </tr>
                      ))}</tbody>
                    </table></div>
                  </section>
                )}
                {role !== "teacher" && <div className="roster-grid">
                  {classData.roster.map((s: any) => (
                    <div className="student-tile" key={s.id}>
                      <span>{s.code.slice(2)}</span>
                      <strong>{s.code}</strong>
                    </div>
                  ))}
                </div>}
              </section>
              <section className="panel quick-panel">
                <h2>Công việc của lớp</h2>
                <div className="quick-item">
                  <span>↗</span>
                  <div>
                    <strong>
                      {classData.counts.plans ?? "—"} học sinh có kế hoạch
                    </strong>
                    <small>Hành động do học sinh tự chọn</small>
                  </div>
                </div>
                <div className="quick-item">
                  <span>✓</span>
                  <div>
                    <strong>
                      {classData.counts.responded ?? "—"} học sinh đã phản hồi
                    </strong>
                    <small>Không phản hồi không phải thất bại</small>
                  </div>
                </div>
                {role !== "admin" && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setView("Báo cáo");
                      void getReport();
                    }}
                  >
                    Mở thống kê →
                  </button>
                )}
                <small className="privacy-note">
                  Giáo viên xem nhóm đã được đồng ý chia sẻ và xác nhận; không xem nội dung trò chuyện hoặc ghi chú tư vấn.
                </small>
                {role === "counselor" && (
                  <button
                    className="text-button"
                    onClick={() => setView("Người phụ trách")}
                  >
                    Xem hồ sơ được phân công →
                  </button>
                )}
              </section>
            </div>
          </>
        )}
        {data && view === "Báo cáo" && (
          <section className="panel">
            <div className="section-heading">
              <h2>Thông tin đã xác nhận</h2>
              <span className="pill">Lớp mẫu · 40 học sinh</span>
            </div>
            <form
              className="report-filters"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void getReport(String(f.get("start")), String(f.get("end")));
              }}
            >
              <label>
                Từ ngày
                <input
                  name="start"
                  type="date"
                  required
                  defaultValue={classData?.period?.period_start}
                />
              </label>
              <label>
                Đến ngày
                <input
                  name="end"
                  type="date"
                  required
                  defaultValue={classData?.period?.period_end}
                />
              </label>
              <button disabled={busy}>Xem</button>
            </form>
            {report?.suppressed ? (
              <div className="empty-state">
                <span>◌</span>
                <h3>Chưa đủ dữ liệu để hiển thị</h3>
                <p>Các ô nhỏ được ẩn để bảo vệ riêng tư.</p>
              </div>
            ) : report?.rows ? (
              <div className="group-bars">
                {groups.map((g) => {
                  const r = report.rows.find((x: any) => x.g === g.id);
                  return (
                    <div key={g.id} className="group-bar" title={g.name}>
                      <div>
                        <strong>{groupLabel(g.id)}</strong>
                        <span>
                          {r
                            ? `${r.numerator}/${r.denominator}`
                            : "Chưa có dữ liệu"}
                        </span>
                      </div>
                      <div className="bar-track">
                        <i
                          style={{
                            width: r
                              ? `${(100 * r.numerator) / r.denominator}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                <details>
                  <summary>Cách đọc số liệu</summary>
                  <p>{report.definition}</p>
                  <p>
                    Nhiều nhóm có thể chồng lấp. Đây là thông tin tự báo cáo,
                    không phải chẩn đoán.
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Nhóm nguồn</th>
                        <th>Hiện diện</th>
                        <th>Mẫu số</th>
                        <th>Chưa đủ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r: any) => (
                        <tr key={r.g}>
                          <td>{groupLabel(r.g)}</td>
                          <td>{r.numerator}</td>
                          <td>{r.denominator}</td>
                          <td>{r.incomplete}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </div>
            ) : (
              <Empty text="Chọn kỳ để xem thống kê." />
            )}
          </section>
        )}
        {data && view === "Người phụ trách" && role === "admin" && (
          <div className="settings-layout">
            <section className="panel">
              <div className="section-heading">
                <h2>Kết nối AI</h2>
                <span className="pill">
                  {model?.mode === "mock"
                    ? "Đang chạy mock"
                    : model?.ready
                      ? "Đã có cấu hình"
                      : "Chưa kết nối"}
                </span>
              </div>
              <dl className="config-list">
                <div>
                  <dt>Nhà cung cấp</dt>
                  <dd>{model?.provider === "openai" ? "OpenAI" : "Ollama"}</dd>
                </div>
                <div>
                  <dt>Chế độ</dt>
                  <dd>
                    {model?.mode === "mock"
                      ? "Mock — không gọi API"
                      : "LLM thật"}
                  </dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{model?.model ?? "Chưa bật"}</dd>
                </div>
              </dl>
              <p className="notice">
                Thêm khóa vào <code>.env.local</code>, sau đó bật{" "}
                <code>MODEL_MODE=live</code>. Không nhập khóa trên giao diện.
              </p>
              <button
                className="secondary"
                onClick={() =>
                  void fetch("/api/model")
                    .then((r) => r.json())
                    .then(setModel)
                }
              >
                Kiểm tra cấu hình
              </button>
              {model?.error && <p className="muted">{model.error}</p>}
            </section>
            <section className="panel">
              <h2>Nội dung nháp</h2>
              <ProfessionalForm
                kind="draft_content"
                busy={busy}
                submit={(p) => act("draft_content", p)}
              />
              <details>
                <summary>Danh mục 6 nhóm</summary>
                {groups.map((g) => (
                  <article key={g.id}>
                    <h3>
                      {g.id} · {g.name}
                    </h3>
                    {g.questions.map((q) => (
                      <p key={q.id}>{q.text}</p>
                    ))}
                  </article>
                ))}
              </details>
              {rows
                .filter((x) => x.kind === "content_draft")
                .map((x) => (
                  <p key={x.id}>
                    {groupLabel(x.data.group)}: {x.data.text}
                  </p>
                ))}
            </section>
          </div>
        )}
        {data && view === "Người phụ trách" && role === "counselor" && (
          <section className="panel">
            <label>
              Học sinh được phân công
              <select
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  void load(e.target.value).catch((e) => setError(e.message));
                }}
              >
                {classData?.assigned.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.code}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">
              Thông tin tự báo cáo, không phải kết luận chuyên môn.
            </p>
            {observations.length === 0 ? (
              <Empty text="Chưa có thông tin xác nhận." />
            ) : (
              observations.map((x) => (
                <article className="record" key={x.id}>
                  <span className="pill">{statuses[x.data.status]}</span>
                  <p>{x.data.summary}</p>
                  <small>
                    {x.data.period_start} → {x.data.period_end}
                  </small>
                </article>
              ))
            )}
            <ProfessionalForm
              kind="review"
              busy={busy}
              submit={(p) => act("review", { ...(p as object), target })}
            />
            {rows
              .filter((x) => x.kind === "review_note")
              .map((x) => (
                <article key={x.id}>{x.data.text}</article>
              ))}
          </section>
        )}
        {data && view === "Kiến thức" && <KnowledgeLibrary />}
        {student && consent && (
          <footer className="student-footer">
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void act("support", { requested: true })}
            >
              Em muốn tìm người hỗ trợ
            </button>
            <button
              className="text-button"
              aria-label="Rút đồng thuận và xóa dữ liệu"
              onClick={() => void act("withdraw")}
            >
              Rút đồng thuận
            </button>
          </footer>
        )}
        <footer className="app-footer">
          Nội dung chưa được duyệt
        </footer>
      </main>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="empty-inline">{text}</p>;
}
