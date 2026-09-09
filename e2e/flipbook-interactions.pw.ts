import { expect, test, type Page } from "@playwright/test";

type EngineSnapshot = {
  currentPage: number;
  displayMode: "single" | "spread";
  phase: string;
  zoom: number;
};

declare global {
  interface Window {
    paperfold: { snapshot: EngineSnapshot };
  }
}

type BookBox = { x: number; y: number; width: number; height: number };

const snapshot = (page: Page) => page.evaluate(() => window.paperfold.snapshot);

const getBookBox = async (page: Page): Promise<BookBox> => {
  const box = await page.locator(".flipbook-book").boundingBox();
  if (!box) throw new Error("Flipbook was not laid out");
  return box;
};

const waitForIdlePage = async (page: Page, currentPage: number) => {
  await expect.poll(() => snapshot(page)).toMatchObject({ phase: "idle", currentPage });
};

const drag = async (
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  steps = 4
) => {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps });
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => snapshot(page)).toMatchObject({ currentPage: 0, phase: "idle" });
});

test("bottom-corner drag stays live and commits only after release", async ({ page }) => {
  const box = await getBookBox(page);
  const pageWidth = box.width / 2;
  const start = { x: box.x + box.width - 3, y: box.y + box.height - 3 };
  const end = { x: start.x - pageWidth * 0.82, y: start.y - box.height * 0.24 };

  await drag(page, start, end, 8);

  await expect.poll(() => snapshot(page)).toMatchObject({ currentPage: 0, phase: "dragging" });
  await expect(page.locator(".flipbook-base-layer .flipbook-page")).toHaveAttribute("data-page", "2");
  await expect(page.locator(".flipbook-folded-clip .flipbook-page")).toHaveAttribute("data-page", "1");
  const faceTransforms = await page.locator(".flipbook-reflected-surface, .flipbook-page-back")
    .evaluateAll(elements => elements.map(element => getComputedStyle(element).transform));
  const determinant = (transform: string) => {
    const [a, b, c, d] = transform.match(/-?\d+(?:\.\d+)?/g)?.slice(0, 4).map(Number) ?? [];
    return a * d - b * c;
  };
  // Both layers reflect independently, leaving the visible print unmirrored.
  expect(determinant(faceTransforms[0])).toBeLessThan(0);
  expect(determinant(faceTransforms[1])).toBeLessThan(0);
  await expect(page.locator(".flipbook-shadow-clip")).toHaveCSS("overflow", "hidden");
  // Compare both masks in the same frame while drag smoothing is still active.
  expect(await page.evaluate(() =>
    getComputedStyle(document.querySelector(".flipbook-stationary-clip")!).clipPath ===
    getComputedStyle(document.querySelector(".flipbook-shadow-clip")!).clipPath
  )).toBe(true);
  await expect(page.locator(".flipbook-fold-edge")).toBeVisible();

  const shadowTransform = await page.locator(".flipbook-crease-shadow").evaluate((element) =>
    getComputedStyle(element).transform
  );
  const [a, b] = shadowTransform.match(/-?\d+(?:\.\d+)?/g)?.slice(0, 2).map(Number) ?? [];
  expect(Math.abs(a)).toBeGreaterThan(Math.abs(b));

  const shadowClip = await page.locator(".flipbook-shadow-clip").boundingBox();
  expect(shadowClip).not.toBeNull();
  expect(shadowClip!.x).toBeCloseTo(box.x, 0);
  expect(shadowClip!.y).toBeCloseTo(box.y, 0);
  expect(shadowClip!.width).toBeCloseTo(box.width, 0);
  expect(shadowClip!.height).toBeCloseTo(box.height, 0);

  await page.mouse.up();
  await waitForIdlePage(page, 1);
});

test("middle side-edge drag commits a forward turn", async ({ page }) => {
  const box = await getBookBox(page);
  const pageWidth = box.width / 2;
  const start = { x: box.x + box.width - 3, y: box.y + box.height * 0.5 };
  const end = { x: start.x - pageWidth * 0.82, y: start.y };

  await drag(page, start, end, 8);
  await expect.poll(() => snapshot(page)).toMatchObject({ phase: "dragging", currentPage: 0 });
  await expect(page.locator(".flipbook-crease-shadow")).toBeVisible();
  // The lighting must cover both halves of the crease, not begin midway down it.
  for (const selector of [".flipbook-crease-shadow", ".flipbook-curvature-shader"]) {
    const strip = await page.locator(selector).boundingBox();
    expect(strip!.y).toBeLessThan(box.y);
    expect(strip!.y + strip!.height).toBeGreaterThan(box.y + box.height);
  }
  await page.mouse.up();

  await waitForIdlePage(page, 1);
});

test("multi-band curvature follows the live crease", async ({ page }) => {
  const box = await getBookBox(page);
  const pageWidth = box.width / 2;
  const start = { x: box.x + box.width - 3, y: box.y + box.height - 3 };
  const end = { x: start.x - pageWidth * 0.68, y: start.y - box.height * 0.2 };

  await drag(page, start, end, 8);
  const shader = page.locator(".flipbook-curvature-shader");
  await expect(shader).toBeVisible();
  const style = await shader.getAttribute("style");
  expect(style).toContain("rotate(");
  expect(Number(style?.match(/width:\s*([\d.]+)px/)?.[1])).toBeGreaterThan(32);
  await page.mouse.up();
  await waitForIdlePage(page, 1);
});

test("near-complete middle drag centers its crease without early commit", async ({ page }) => {
  const box = await getBookBox(page);
  const start = { x: box.x + box.width - 3, y: box.y + box.height * 0.5 };
  const end = { x: box.x, y: start.y };

  await drag(page, start, end, 10);
  await expect.poll(() => snapshot(page)).toMatchObject({ phase: "dragging", currentPage: 0 });
  await expect.poll(async () => {
    const transform = await page.locator(".flipbook-crease-shadow").getAttribute("style");
    return Number(transform?.match(/translate\(([-\d.]+)px/)?.[1]);
  }).toBeCloseTo(box.width / 2, 0);

  await page.mouse.up();
  await waitForIdlePage(page, 1);
});

test("near-complete corner drag centers its crease like a middle-edge drag", async ({ page }) => {
  const box = await getBookBox(page);
  const start = { x: box.x + box.width - 3, y: box.y + 3 };
  const end = { x: box.x, y: start.y };

  await drag(page, start, end, 10);
  await expect.poll(() => snapshot(page)).toMatchObject({ phase: "dragging", currentPage: 0 });
  await expect.poll(async () => {
    const transform = await page.locator(".flipbook-crease-shadow").getAttribute("style");
    return Number(transform?.match(/translate\(([-\d.]+)px/)?.[1]);
  }).toBeCloseTo(box.width / 2, 0);

  await page.mouse.up();
  await waitForIdlePage(page, 1);
});

test("extreme corner drag remains bound to the spine", async ({ page }) => {
  const box = await getBookBox(page);
  const start = { x: box.x + box.width - 3, y: box.y + box.height - 3 };
  await drag(page, start, { x: box.x - box.width, y: box.y - box.height }, 10);

  const folded = page.locator(".flipbook-folded-clip .flipbook-page");
  const transform = await page.locator(".flipbook-reflected-surface").getAttribute("style");
  expect(transform).not.toContain("NaN");
  await expect(folded).toBeVisible();

  const foldMask = await page.locator(".flipbook-folded-clip").evaluate(element => getComputedStyle(element).clipPath);
  expect(foldMask).not.toBe("polygon(0px 0px, 0px 0px, 0px 0px)");
  await page.mouse.up();
  await waitForIdlePage(page, 1);
});

test("short fast flick commits without crossing halfway", async ({ page }) => {
  const box = await getBookBox(page);
  const start = { x: box.x + box.width - 3, y: box.y + box.height * 0.5 };

  await drag(page, start, { x: start.x - 120, y: start.y }, 1);
  await page.mouse.up();

  await waitForIdlePage(page, 1);
});

test("release outside the book keeps a weighted landing", async ({ page }) => {
  const box = await getBookBox(page);
  const start = { x: box.x + box.width - 3, y: box.y + box.height * 0.5 };
  await drag(page, start, { x: box.x - 80, y: start.y }, 6);
  await page.mouse.up();
  const releasedAt = Date.now();
  await waitForIdlePage(page, 1);
  expect(Date.now() - releasedAt).toBeGreaterThanOrEqual(550);
});

test("mid-page release eases back instead of snapping shut", async ({ page }) => {
  const box = await getBookBox(page);
  const pageWidth = box.width / 2;
  const start = { x: box.x + box.width - 3, y: box.y + box.height * 0.5 };
  await drag(page, start, { x: start.x - pageWidth * 0.38, y: start.y }, 8);
  await page.waitForTimeout(250);
  await page.mouse.up();

  await expect.poll(() => snapshot(page)).toMatchObject({ phase: "cancelling", currentPage: 0 });
  await page.waitForTimeout(250);
  await expect.poll(() => snapshot(page)).toMatchObject({ phase: "cancelling", currentPage: 0 });
  await expect(page.locator(".flipbook-folded-clip")).toBeVisible();
  await waitForIdlePage(page, 0);
});

test("single-page release reaches the spine before the idle page replaces the fold", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => snapshot(page)).toMatchObject({ displayMode: "single" });
  const box = await getBookBox(page);
  const start = { x: box.x + box.width - 3, y: box.y + box.height / 2 };
  await drag(page, start, { x: start.x - box.width * 0.7, y: start.y }, 8);
  await page.waitForTimeout(250);
  await page.mouse.up();
  const landing = await page.evaluate(async () => {
    let lastCrease = Infinity;
    let firstCrease = 0;
    let earlyCrease = 0;
    let lastShade = 1;
    const started = performance.now();
    while (window.paperfold.snapshot.phase !== "idle") {
      const shadow = document.querySelector<HTMLElement>(".flipbook-crease-shadow");
      const match = shadow?.style.transform.match(/translate\(([-\d.]+)px/);
      if (match) {
        lastCrease = Number(match[1]);
        if (!firstCrease) firstCrease = lastCrease;
        if (performance.now() - started < 200) earlyCrease = lastCrease;
        const back = document.querySelector(".flipbook-page-back");
        if (back) lastShade = Number(getComputedStyle(back, "::after").opacity);
      }
      await new Promise(requestAnimationFrame);
    }
    return { lastCrease, firstCrease, earlyCrease, lastShade };
  });
  expect(landing.lastCrease).toBeLessThan(2);
  // At 200ms of a 600ms ease-out release, roughly half the travel remains.
  expect(landing.earlyCrease).toBeGreaterThan(landing.firstCrease * 0.4);
  expect(landing.earlyCrease).toBeLessThan(landing.firstCrease * 0.7);
  expect(landing.lastShade).toBeLessThan(0.01);
  await waitForIdlePage(page, 1);
});

test("interior spread meets seamlessly at the spine", async ({ page }) => {
  await page.getByRole("button", { name: "Next page" }).click();
  await waitForIdlePage(page, 1);
  const left = page.locator(".flipbook-page-left");
  const right = page.locator(".flipbook-page-right");
  const [leftBox, rightBox] = await Promise.all([left.boundingBox(), right.boundingBox()]);
  expect(leftBox!.x + leftBox!.width).toBeCloseTo(rightBox!.x, 0);
  await expect(left).toHaveCSS("border-right-width", "0px");
  await expect(right).toHaveCSS("border-left-width", "0px");
});

test("partial drag returned to its origin cancels cleanly", async ({ page }) => {
  const box = await getBookBox(page);
  const pageWidth = box.width / 2;
  const start = { x: box.x + box.width - 3, y: box.y + 3 };

  await drag(page, start, { x: start.x - pageWidth * 0.46, y: start.y + box.height * 0.18 }, 8);
  await expect.poll(() => snapshot(page)).toMatchObject({ phase: "dragging", currentPage: 0 });
  await page.mouse.move(start.x, start.y, { steps: 8 });
  await page.mouse.up();

  await waitForIdlePage(page, 0);
  await expect(page.locator(".flipbook-overlay-layer")).toBeEmpty();
  await expect(page.locator(".flipbook-base-layer .flipbook-page")).toHaveAttribute("data-page", "0");
});

test("left edge performs the symmetric previous turn", async ({ page }) => {
  const firstBox = await getBookBox(page);
  const firstPageWidth = firstBox.width / 2;
  const forwardStart = { x: firstBox.x + firstBox.width - 3, y: firstBox.y + firstBox.height * 0.5 };
  await drag(page, forwardStart, { x: forwardStart.x - firstPageWidth * 0.82, y: forwardStart.y }, 8);
  await page.mouse.up();
  await waitForIdlePage(page, 1);

  const box = await getBookBox(page);
  const pageWidth = box.width / 2;
  const start = { x: box.x + 3, y: box.y + box.height * 0.5 };
  await drag(page, start, { x: start.x + pageWidth * 0.82, y: start.y }, 8);
  await page.mouse.up();

  await waitForIdlePage(page, 0);
});

test("distant navigation keeps the configured page cache bounded", async ({ page }) => {
  await page.getByLabel("More controls").click();
  await page.getByRole("button", { name: "Last page" }).click();
  await waitForIdlePage(page, 15);
  expect(await page.evaluate(() => (window.paperfold as any).pageCache.size)).toBeLessThanOrEqual(10);

  await page.getByRole("button", { name: "First page" }).click();
  await waitForIdlePage(page, 0);
  expect(await page.evaluate(() => (window.paperfold as any).pageCache.size)).toBeLessThanOrEqual(10);
});

test.describe("mobile single-page mode", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the destination page underneath a touch-sized edge drag", async ({ page }) => {
    await expect.poll(() => snapshot(page)).toMatchObject({ displayMode: "single", currentPage: 0 });
    const box = await getBookBox(page);
    const start = { x: box.x + box.width - 3, y: box.y + box.height * 0.5 };

    await drag(page, start, { x: start.x - box.width * 0.65, y: start.y }, 8);
    await expect(page.locator(".flipbook-base-layer .flipbook-page")).toHaveAttribute("data-page", "1");
    await page.mouse.up();

    await waitForIdlePage(page, 1);
  });
});
