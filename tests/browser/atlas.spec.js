const { test, expect } = require("@playwright/test");

test("GitHub Pages子路径、动态统计、地图和筛选正常", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#heroStats")).toContainText("67");
  await expect(page.locator("#heroStats")).toContainText("10");
  await expect(page.locator("#heroStats")).toContainText("57");
  await expect(page.locator("#heroStats")).toContainText("42");
  await expect(page.locator("#mapCount")).toContainText("67 个园区");
  await page.getByRole("button", {name:"正式认定"}).click();
  await expect(page.locator("#mapCount")).toContainText("10 个园区");
  await page.getByRole("button", {name:"建设名单"}).click();
  await expect(page.locator("#mapCount")).toContainText("57 个园区");
  await page.locator(".marker").first().click();
  await expect(page.locator("#mapDetail")).toContainText("建设名单");
  await expect(page.locator("#mapDetail a[href^='https://']")).toBeVisible();
  await expect(page.locator("#mapDetail")).not.toContainText("已建成");
  await expect(page.locator("#mapDetail")).not.toContainText("已达标");
  await expect(page.locator("#profileContent")).not.toContainText("已建成零碳园区");
  await expect(page.locator("#profileContent")).not.toContainText("已达标零碳园区");
});

test("园区画像、42项矩阵和证据可展开", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#profileContent")).toContainText("基本信息");
  await expect(page.locator("#indicatorMatrix details.indicator")).toHaveCount(42);
  const c42=page.locator("details[data-indicator-id='C42']");
  await c42.locator("summary").click();
  await expect(c42).toContainText("再生水实际利用量");
  await expect(page.locator("#evidenceTable tr").first()).toBeVisible();
  await expect(page.locator("#transparency .fixed-boundary")).toContainText("不代表园区绿色低碳发展水平");
});

test("390px移动端无横向溢出", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("./");
  await expect(page.locator("#mapCount")).toContainText("67 个园区");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
  expect(overflow).toBeFalsy();
});
