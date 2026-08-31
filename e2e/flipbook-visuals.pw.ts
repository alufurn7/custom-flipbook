import { expect, test, type Page } from "@playwright/test";

type Snapshot = {
  currentPage: number;
  displayMode: "single" | "spread";
  phase: string;
};

declare global {
  interface Window {
    paperfold: { snapshot: Snapshot };
  }
}

const engineSnapshot = (page: Page) => page.evaluate(() => window.paperfold.snapshot);

const expectVisual = async (page: Page, name: string) => {
  await expect(page.locator(".flipbook-viewport")).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
    scale: "css",
    maxDiffPixelRatio: 0.005
  });
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => engineSnapshot(page)).toMatchObject({ currentPage: 0, phase: "idle" });
});

test("@visual desktop cover", async ({ page }) => {
  await expect.poll(() => engineSnapshot(page)).toMatchObject({ displayMode: "spread" });
  await expectVisual(page, "desktop-cover.png");
});

test("@visual interior spread", async ({ page }) => {
  await page.getByRole("button", { name: "Next page" }).click();
  await expect.poll(() => engineSnapshot(page)).toMatchObject({ currentPage: 1, phase: "idle" });
  await expectVisual(page, "desktop-interior-spread.png");
});

test("@visual held bottom-corner fold", async ({ page }) => {
  const box = await page.locator(".flipbook-book").boundingBox();
  if (!box) throw new Error("Flipbook was not laid out");
  const pageWidth = box.width / 2;
  const start = { x: box.x + box.width - 3, y: box.y + box.height - 3 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - pageWidth * 0.72, start.y - box.height * 0.28, { steps: 8 });
  await expect.poll(() => engineSnapshot(page)).toMatchObject({ currentPage: 0, phase: "dragging" });
  await expectVisual(page, "desktop-held-corner-fold.png");
  await page.mouse.up();
});

test.describe("mobile visuals", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("@visual single-page cover", async ({ page }) => {
    await expect.poll(() => engineSnapshot(page)).toMatchObject({ displayMode: "single" });
    await expectVisual(page, "mobile-cover.png");
  });
});
