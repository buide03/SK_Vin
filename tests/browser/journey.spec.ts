import { test, expect } from "@playwright/test";
test("admin knowledge search shows six groups, references and differentiating criteria", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#identity").selectOption("demo-admin");
  await page.getByRole("button", { name: "Kiến thức", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kho kiến thức 6 nhóm" }),
  ).toBeVisible();
  await expect(page.locator(".knowledge-entry")).toHaveCount(6);
  await page.getByLabel("Tra cứu tài liệu").fill("khó dừng ngủ muộn");
  await page.getByRole("button", { name: "Tra cứu", exact: true }).click();
  await expect(page.locator(".knowledge-entry")).toHaveCount(1);
  await page.locator(".knowledge-entry summary").click();
  await expect(
    page.getByText("Chưa đủ để kết luận", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1365, height: 960 });
  await page.screenshot({
    path: "test-results/knowledge-desktop.png",
    fullPage: true,
  });
});
test("mobile layout stays within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/demo-mobile.png",
    fullPage: true,
  });
});
test("student full journey, privacy withdrawal, role protection", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#identity").selectOption("demo-class40-02");
  await expect(
    page.getByRole("heading", { name: "Hôm nay em cảm thấy thế nào?" }),
  ).toBeVisible();
  const remove = page.getByRole("button", {
    name: "Rút đồng thuận và xóa dữ liệu",
  });
  if (await remove.isVisible()) await remove.click();
  await page.getByRole("button", { name: "Đồng ý tham gia demo" }).click();
  await page.getByRole("button", { name: "Bắt đầu phiên mới" }).click();
  await page.locator("#message").fill("Em dùng AI và muốn thử khoảng nghỉ");
  await page.getByRole("button", { name: "Gửi chia sẻ →" }).click();
  await expect(page.locator("#message")).toHaveValue("");
  await page
    .getByRole("button", { name: "Hồ sơ của tôi", exact: true })
    .click();
  await page.getByLabel("Em sửa bản tóm tắt").fill("Bản sửa được em xác nhận");
  await page.getByLabel("Tần suất em tự mô tả").fill("5 tối trong tuần");
  await page.getByLabel("Ảnh hưởng em tự mô tả").fill("Buồn ngủ vào buổi sáng");
  await page
    .getByLabel("Trạng thái do em xác nhận")
    .selectOption("reported_present");
  await page
    .getByRole("button", { name: "Xác nhận lưu thông tin này" })
    .click();
  await expect(
    page.getByText("Bản sửa được em xác nhận", { exact: true }),
  ).toBeVisible();
  const saved = (await (await page.request.get("/api/app")).json()).rows.find((r: any) => r.kind === "observation" && r.data.current);
  expect(saved.data.frequency).toBe("5 tối trong tuần");
  expect(saved.data.reported_impact).toBe("Buồn ngủ vào buổi sáng");
  await page.locator("#identity").selectOption("demo-teacher");
  await expect(page.locator('[data-student-code="HS02"]')).toContainText("G01");
  await expect(page.locator('[data-student-code="HS02"]')).not.toContainText("Bản sửa được em xác nhận");
  await page.locator("#identity").selectOption("demo-class40-02");
  await page
    .getByRole("button", { name: "Kế hoạch & tiến triển", exact: true })
    .click();
  await page.getByLabel("Mục tiêu em muốn chọn").fill("Chọn khoảng nghỉ");
  await page.getByLabel("Tần suất em tự chọn").fill("Hai lần");
  await page.getByLabel("Cách ghi nhận").fill("Ghi chú");
  await page.getByLabel("Phương án khi khó thực hiện").fill("Thử ngắn hơn");
  await page.getByRole("button", { name: "Chọn kế hoạch này" }).click();
  await page.getByRole("button", { name: "Một phần", exact: true }).click();
  await expect(page.getByText("Tự ghi nhận: Một phần")).toBeVisible();
  const denied = await page.request.get("/api/app?student=demo-student-a");
  expect(denied.status()).toBe(403);
  await page
    .getByRole("button", { name: "Rút đồng thuận và xóa dữ liệu" })
    .click();
  await expect(
    page.getByRole("button", { name: "Đồng ý tham gia demo" }),
  ).toBeVisible();
});
test("class of 40: admin sample data, teacher aggregates and no personal profiles", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#identity").selectOption("demo-admin");
  await page.getByRole("button", { name: "Nạp lớp mẫu" }).click();
  await expect(page.locator(".student-tile")).toHaveCount(40);
  await page.locator("#identity").selectOption("demo-teacher");
  await expect(
    page.getByRole("heading", { name: "Tổng quan lớp học" }),
  ).toBeVisible();
  await expect(page.locator("[data-student-code]")).toHaveCount(40);
  await expect(page.locator('[data-student-code="HS01"]')).toContainText("G01");
  await expect(page.locator('[data-student-code="HS01"]')).not.toContainText("G02");
  await expect(page.locator('[data-student-code="HS11"]')).toContainText("G02");
  await expect(
    page.getByRole("button", { name: "Hồ sơ của tôi", exact: true }),
  ).toHaveCount(0);
  const forbidden = await page.request.get("/api/app?student=demo-student-a");
  const data = await forbidden.json();
  expect(data.rows).toEqual([]);
  await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
  await expect(page.locator(".group-bar")).toHaveCount(6);
  await expect(page.getByText("20/40", { exact: true })).toHaveCount(2);
  await page.setViewportSize({ width: 1365, height: 960 });
  await page.screenshot({
    path: "test-results/teacher-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Lớp học", exact: true }).click();
  await page.screenshot({
    path: "test-results/classroom-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/classroom-mobile.png",
    fullPage: true,
  });
});
