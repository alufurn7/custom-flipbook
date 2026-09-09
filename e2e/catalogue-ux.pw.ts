import { test, expect } from "@playwright/test";

test("catalogue renders and remains usable through typing, menus, resize and rapid navigation", async ({ page }) => {
  test.setTimeout(45000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByLabel("Page number")).toHaveValue("1 / 36", { timeout: 20000 });
  await expect.poll(() => page.locator(".flipbook-base-layer img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect(page.locator(".flipbook-toc")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Table of contents", exact: true }).click();
  await expect(page.getByPlaceholder("Search pages")).toBeFocused();
  await page.getByPlaceholder("Search pages").fill("Catalogue");
  await page.keyboard.press("End");
  await expect(page.getByLabel("Page number")).toHaveValue("1 / 36");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Table of contents", exact: true })).toBeFocused();
  await page.getByLabel("More controls").click();
  await page.getByRole("button", { name: "Turn forward" }).click();
  await expect(page.locator(".flipbook-more")).not.toHaveAttribute("open", "");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => (window as any).paperfold.snapshot)).toMatchObject({ phase: "idle", displayMode: "single" });
  await page.waitForTimeout(700);
  await expect(page.locator(".flipbook-folded-clip")).toHaveCount(0);
  await page.getByRole("button", { name: "Turn forward" }).click();
  await page.getByRole("button", { name: "Turn forward" }).click();
  await expect.poll(() => page.evaluate(() => (window as any).paperfold.snapshot.phase)).toBe("idle");
  await expect.poll(() => page.locator(".flipbook-base-layer img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await page.locator(".flipbook-book").boundingBox())!.height).toBeLessThan(300);
  expect(errors).toEqual([]);
});

test("catalogue loading failure offers retry", async ({ page }) => {
  await page.route("**/ALUFURN%20Catalogue.pdf", route => route.abort());
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible({ timeout: 15000 });
});
