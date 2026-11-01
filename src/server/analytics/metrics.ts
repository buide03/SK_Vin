import type { PGlite } from "@electric-sql/pglite";
export async function metrics(
  db: PGlite,
  org: string,
  start: string,
  end: string,
  studentIds?: string[],
) {
  const cohort = (
    await db.query<{ consented: number; confirmed: number }>(
      `SELECT count(DISTINCT student_id) FILTER(WHERE kind='consent' AND data->>'active'='true')::int consented,count(DISTINCT student_id) FILTER(WHERE kind='observation' AND data->>'current'='true' AND data->>'period_start'=$2 AND data->>'period_end'=$3)::int confirmed FROM records WHERE organization_id=$1 AND ($4::text[] IS NULL OR student_id=ANY($4))`,
      [org, start, end, studentIds ?? null],
    )
  ).rows[0];
  const coverage = (
    await db.query<{
      group_id: string;
      asked: number;
      skipped: number;
      needs_clarification: number;
    }>(
      `SELECT data->>'group_id' group_id,count(DISTINCT student_id)::int asked,count(DISTINCT student_id) FILTER(WHERE data->>'status'='skipped')::int skipped,count(DISTINCT student_id) FILTER(WHERE data->>'status'='needs_clarification')::int needs_clarification FROM records WHERE organization_id=$1 AND ($4::text[] IS NULL OR student_id=ANY($4)) AND kind='observation' AND data->>'current'='true' AND data->>'period_start'=$2 AND data->>'period_end'=$3 GROUP BY data->>'group_id'`,
      [org, start, end, studentIds ?? null],
    )
  ).rows;
  const overlap = (
    await db.query<{ groups: string[]; students: number }>(
      `WITH grouped AS (SELECT student_id,array_agg(DISTINCT data->>'group_id' ORDER BY data->>'group_id') groups FROM records WHERE organization_id=$1 AND ($4::text[] IS NULL OR student_id=ANY($4)) AND kind='observation' AND data->>'current'='true' AND data->>'status'='reported_present' AND data->>'period_start'=$2 AND data->>'period_end'=$3 GROUP BY student_id) SELECT groups,count(*)::int students FROM grouped WHERE cardinality(groups)>1 GROUP BY groups`,
      [org, start, end, studentIds ?? null],
    )
  ).rows;
  const plans = (
    await db.query<{
      selected: number;
      declined: number;
      due: number;
      responded: number;
    }>(
      `SELECT count(*) FILTER(WHERE p.data->>'status'='selected')::int selected,count(*) FILTER(WHERE p.data->>'status'='declined')::int declined,count(*) FILTER(WHERE p.data->>'status'='selected' AND (p.data->>'review_at')::timestamptz<=now())::int due,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM records c WHERE c.organization_id=p.organization_id AND c.student_id=p.student_id AND c.kind='checkin' AND c.data->>'plan_id'=p.id))::int responded FROM records p WHERE p.organization_id=$1 AND ($2::text[] IS NULL OR p.student_id=ANY($2)) AND p.kind='plan'`,
      [org, studentIds ?? null],
    )
  ).rows[0];
  return {
    invited: null,
    participation: null,
    ...cohort,
    coverage: coverage.map((x) => ({
      ...x,
      not_asked: Math.max(0, cohort.consented - x.asked),
    })),
    overlap,
    plans,
    limitations:
      "Số được mời/tham gia chưa có nguồn dữ liệu. Kế hoạch tính toàn bộ thời gian; coverage chỉ gồm thông tin đã xác nhận cùng kỳ. Không phản hồi không phải thất bại; không suy ra tác động tâm lý.",
  };
}
