const { test, expect } = require("@playwright/test");

async function openForm(page, parkId = "NAT-001", type = "UPDATE") {
  await page.goto("./");
  await page.evaluate(({ parkId, type }) => window.AtlasContribution.open(parkId, type), { parkId, type });
  await expect(page.locator("#contributionDrawer")).toBeVisible();
}

async function fillValid(page) {
  const form = page.locator("#contributionForm");
  await form.locator("[name='Proposed_Status']").selectOption("DESIGNATED");
  await form.locator("[name='Recognition_Level']").selectOption("NATIONAL");
  await form.locator("[name='Recognition_Name']").fill("国家绿色工业园区");
  await form.locator("[name='Status_Year']").fill("2026");
  await form.locator("[name='Publisher']").fill("工业和信息化部");
  await form.locator("[name='Source_Title']").fill("绿色制造名单公告");
  await form.locator("[name='Publication_Date']").fill("2026-08-22");
  await form.locator("[name='Source_URL']").fill("https://www.miit.gov.cn/example.pdf");
  await form.locator("[name='Evidence_Text']").fill("附件名单明确列出该园区。 ");
}

test("67园区可打开表单且Park_ID自动填充", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#profileSelect option")).toHaveCount(67);
  const ids = await page.locator("#profileSelect option").evaluateAll(options => options.map(option => option.value));
  expect(ids).toHaveLength(67);
  for (const id of ids) {
    await page.evaluate(parkId => window.AtlasContribution.open(parkId, "UPDATE"), id);
    await expect(page.locator("#contributionPark")).toHaveValue(id);
    await page.locator("[data-close-drawer]").click();
  }
  await page.evaluate(() => window.AtlasContribution.open("NAT-001", "UPDATE"));
  await expect(page.locator("#selectedParkId")).toContainText("NAT-001");
  await page.locator("#contributionPark").selectOption("OUT_OF_CATALOG");
  await expect(page.locator("#otherParkWrap")).toBeVisible();
  await expect(page.locator("#selectedParkId")).toContainText("进入人工复核");
});

test("DESIGNATED缺少来源和非法URL均不能生成预览", async ({ page }) => {
  await openForm(page);
  const form = page.locator("#contributionForm");
  await form.locator("[name='Proposed_Status']").selectOption("DESIGNATED");
  await form.locator("[name='Recognition_Name']").fill("国家绿色工业园区");
  await form.locator("[name='Status_Year']").fill("2026");
  await form.locator("[name='Publication_Date']").fill("2026");
  await form.locator("[name='Evidence_Text']").fill("正式名单中列出该园区");
  await form.getByRole("button", { name: "生成提交预览" }).click();
  await expect(page.locator("#formErrors")).toContainText("正式认定必须具备");
  await expect(page.locator("#submissionPreview")).toBeHidden();
  await form.locator("[name='Publisher']").fill("工业和信息化部");
  await form.locator("[name='Source_Title']").fill("名单");
  await form.locator("[name='Source_URL']").fill("javascript:alert(1)");
  await form.getByRole("button", { name: "生成提交预览" }).click();
  await expect(page.locator("#formErrors")).toContainText("http:// 或 https://");
});

test("Submission_ID唯一且Issue URL包含完整结构字段", async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.locator("#contributionForm").getByRole("button", { name: "生成提交预览" }).click();
  await expect(page.locator("#submissionPreview")).toBeVisible();
  const ids = await page.evaluate(() => [
    window.AtlasContributionTestAPI.generateSubmissionId("NAT-001"),
    window.AtlasContributionTestAPI.generateSubmissionId("NAT-001"),
  ]);
  expect(ids[0]).not.toBe(ids[1]);
  expect(ids[0]).toMatch(/^C55P-\d{8}-NAT001-[A-F0-9]{4}$/);
  const href = await page.locator("#confirmSubmission").getAttribute("href");
  const issue = new URL(href);
  expect(issue.origin + issue.pathname).toBe("https://github.com/Erwintao21/zero-carbon-park-atlas/issues/new");
  const body = issue.searchParams.get("body");
  for (const field of ["Park_ID:", "Park_Name:", "Submission_Type:", "Proposed_Status:", "Recognition_Level:", "Source_URL:", "Evidence_Text:", "Supersedes_Evidence_ID:", "Corrects_Record_ID:", "Submission_ID:", "Review_Status:"]) {
    expect(body).toContain(field);
  }
  expect(body).not.toContain("Contributor_Contact");
});

test("用户输入不能注入HTML或JS", async ({ page }) => {
  await openForm(page);
  await fillValid(page);
  await page.locator("#contributionForm [name='Recognition_Name']").fill('<img src=x onerror="window.__injected=1">');
  await page.locator("#contributionForm").getByRole("button", { name: "生成提交预览" }).click();
  await expect(page.locator("#previewFields img")).toHaveCount(0);
  await expect(page.locator("#previewFields")).toContainText("<img src=x");
  expect(await page.evaluate(() => window.__injected || 0)).toBe(0);
});

test("历史优先级、建设名单文案和原模块保持正常", async ({ page }) => {
  await page.goto("./");
  const current = await page.evaluate(() => window.AtlasContributionTestAPI.computeCurrentStatus([
    { Recognition_Status: "SELECTED_FOR_CONSTRUCTION", Year: "2026", Evidence_Level: "E4_OFFICIAL_PRIMARY", Reviewed_Status: "ACCEPTED" },
    { Recognition_Status: "DESIGNATED", Year: "2024", Evidence_Level: "E3_OFFICIAL_SECONDARY", Reviewed_Status: "ACCEPTED" },
    { Recognition_Status: "DESIGNATED", Year: "2027", Evidence_Level: "E1_MEDIA", Reviewed_Status: "ACCEPTED" },
  ]));
  expect(current.Recognition_Status).toBe("DESIGNATED");
  expect(current.Year).toBe("2024");
  await expect(page.locator("#c55")).toContainText("建设名单园区");
  await expect(page.locator("#c55")).not.toContainText("已建成零碳园区");
  await expect(page.locator("#mapCount")).toContainText("67 个园区");
  await expect(page.locator("#indicatorMatrix details.indicator")).toHaveCount(42);
});

test("390px移动端Drawer正常且无横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openForm(page, "GD-001", "CORRECTION");
  await expect(page.locator("#contributionPark")).toHaveValue("GD-001");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBeFalsy();
});
