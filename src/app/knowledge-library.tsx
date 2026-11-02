"use client";
import { useEffect, useState } from "react";
import { groups, groupLabel } from "../content/catalog";
export default function KnowledgeLibrary() {
  const [data, setData] = useState<any>(null),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function search(q = "") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        "/api/knowledge" + (q ? "?q=" + encodeURIComponent(q) : ""),
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa đọc được tài liệu.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void search();
  }, []);
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Kho kiến thức 6 nhóm</h2>
        <span className="pill">Nháp · chờ duyệt chuyên môn</span>
      </div>
      <form
        className="knowledge-search"
        onSubmit={(e) => {
          e.preventDefault();
          void search(query);
        }}
      >
        <label className="sr-only" htmlFor="knowledge-query">
          Tra cứu tài liệu
        </label>
        <input
          id="knowledge-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={400}
          placeholder="Ví dụ: khó dừng, cô đơn, tìm trấn an…"
        />
        <button disabled={busy}>Tra cứu</button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setQuery("");
            void search();
          }}
        >
          Tất cả
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p className="muted">
            {data.entries.length} nhóm đối chiếu · {data.sources.length} nguồn ·
            phiên bản {data.version}. Từ khóa chỉ tìm tài liệu, không phân loại
            học sinh.
          </p>
          <div className="knowledge-grid">
            {data.entries.map((e: any) => (
              <article className="knowledge-entry" key={e.id}>
                <span className="pill">{e.group_id}</span>
                <h3>{groups.find((g) => g.id === e.group_id)?.name}</h3>
                <p>{e.focus}</p>
                <details>
                  <summary>Căn cứ và phân biệt nhóm</summary>
                  <strong>Cần hỏi rõ</strong>
                  <ul>
                    {e.look_for.map((v: string) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                  <strong>Chưa đủ để kết luận</strong>
                  <ul>
                    {e.insufficient_alone.map((v: string) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                  <p>Câu hỏi nháp: {e.clarifying_question}</p>
                  {e.differentiate.map((d: any) => (
                    <p key={d.group_id}>
                      {groupLabel(d.group_id)}: {d.distinction}
                    </p>
                  ))}
                  <p>{e.limitations}</p>
                  <p>Hành động nháp: {e.suggested_action}</p>
                  {e.source_ids.map((id: string) => {
                    const s = data.sources.find((x: any) => x.id === id);
                    return (
                      s && (
                        <p key={id}>
                          <a href={s.url} target="_blank" rel="noreferrer">
                            {s.publisher} · {s.year ?? "không ghi năm"} ↗
                          </a>
                        </p>
                      )
                    );
                  })}
                </details>
              </article>
            ))}
          </div>
          <details>
            <summary>
              Nguồn và giới hạn bằng chứng ({data.sources.length})
            </summary>
            {data.sources.map((s: any) => (
              <article key={s.id}>
                <h3>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title} ↗
                  </a>
                </h3>
                <small>
                  {s.publisher} · {s.type} · {s.population}
                </small>
                <p>{s.summary}</p>
                <p>{s.limitations}</p>
                <small>
                  Kiểm tra nguồn: {s.checked_at} · Trạng thái nội dung:{" "}
                  {s.status}
                </small>
              </article>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
