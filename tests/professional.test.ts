import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { makeDb } from "../src/server/db";
import { Service, demoIdentities } from "../src/server/service";
import { professionalWrite } from "../src/server/professional";
test("admin content stays draft; counselor notes require assignment and consent, then erase with profile", async () => {
  const db = await makeDb();
  try {
    const c = demoIdentities[2],
      admin = demoIdentities[4],
      s = new Service(db);
    const request = {
      op: "draft_content",
      key: randomUUID(),
      version: 0,
      payload: { group: "G01", text: "Bản nháp trung tính" },
    };
    await assert.rejects(professionalWrite(db, c, request));
    const draft = await professionalWrite(db, admin, request);
    assert.deepEqual(await professionalWrite(db, admin, request), draft);
    assert.equal(
      (
        await db.query<{ data: { status: string } }>(
          "SELECT data FROM records WHERE kind='content_draft'",
        )
      ).rows[0].data.status,
      "draft",
    );
    const review = {
      op: "review",
      key: randomUUID(),
      version: 0,
      payload: {
        target: "demo-student-a",
        text: "Ghi nhận của con người, không chẩn đoán",
      },
    };
    await assert.rejects(professionalWrite(db, c, review));
    await s.execute(demoIdentities[0], {
      op: "consent",
      key: randomUUID(),
      version: 0,
      payload: { accepted: true },
    });
    await professionalWrite(db, c, review);
    await assert.rejects(
      professionalWrite(db, c, {
        ...review,
        key: randomUUID(),
        payload: { ...review.payload, target: "demo-student-b" },
      }),
    );
    await s.execute(demoIdentities[0], {
      op: "delete",
      key: randomUUID(),
      version: 1,
      payload: {},
    });
    assert.equal(
      (await db.query("SELECT * FROM records WHERE kind='review_note'")).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("SELECT * FROM records WHERE kind='content_draft'")).rows
        .length,
      1,
    );
  } finally {
    await db.close();
  }
});
