import { expect, test } from "@playwright/test";

const snapshot = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as any).paperfold.snapshot);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => snapshot(page)).toMatchObject({ currentPage: 0, phase: "idle" });
});

test("keyboard navigation, labels, live status, and focus remain available", async ({ page }) => {
  const reader = page.getByRole("region", { name: "Interactive flipbook" });
  await expect(reader).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous page" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next page" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Page number" })).toHaveValue("1 / 16");

  await reader.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => snapshot(page)).toMatchObject({ currentPage: 1, phase: "idle" });
  await expect(page.locator(".flipbook-live")).toHaveText("Pages 2 and 3 of 16");

  await page.keyboard.press("Home");
  await expect.poll(() => snapshot(page)).toMatchObject({ currentPage: 0 });
  await page.keyboard.press("End");
  await expect.poll(() => snapshot(page)).toMatchObject({ currentPage: 15 });

  const next = page.getByRole("button", { name: "Next page" });
  await next.focus();
  await expect(next).toHaveCSS("outline-style", "solid");
  await expect(next).toHaveCSS("outline-width", "3px");
});

test("reduced motion completes a programmatic turn without a long transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect.poll(() => snapshot(page)).toMatchObject({ currentPage: 0, phase: "idle" });
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  const transitionDuration = await page.evaluate(() => new Promise<number>((resolve) => {
    const engine = (window as any).paperfold;
    const started = performance.now();
    const unsubscribe = engine.onChange((state: { currentPage: number; phase: string }) => {
      if (state.currentPage === 1 && state.phase === "idle") {
        unsubscribe();
        resolve(performance.now() - started);
      }
    });
    (document.querySelector('[aria-label="Next page"]') as HTMLButtonElement).click();
  }));
  expect(transitionDuration).toBeLessThan(225);
});
