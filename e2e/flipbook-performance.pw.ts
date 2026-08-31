import { expect, test } from "@playwright/test";

type TurnMetric = {
  duration: number;
  synchronousSetup: number;
  frameCount: number;
  maxFrame: number;
  p95Frame: number;
  longFrames: number;
  maxMountedPages: number;
};

test.describe("mobile performance profile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("@performance repeated mobile turns stay within the frame budget", async ({
    page,
    context,
    browserName
  }, testInfo) => {
    if (browserName === "chromium") {
      const client = await context.newCDPSession(page);
      await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    }

    await page.goto("/");
    await expect.poll(() => page.evaluate(() => (window as any).paperfold.snapshot)).toMatchObject({
      currentPage: 0,
      displayMode: "single",
      phase: "idle"
    });

    const profile = await page.evaluate(async () => {
      const engine = (window as any).paperfold;
      const percentile = (values: number[], amount: number) => {
        const ordered = [...values].sort((a, b) => a - b);
        return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * amount))] ?? 0;
      };

      const measureTurn = () => new Promise<TurnMetric>((resolve) => {
        const frameIntervals: number[] = [];
        const started = performance.now();
        let previous = started;
        let sawMotion = false;
        let maxMountedPages = 0;
        let synchronousSetup = 0;

        const sample = (now: number) => {
          frameIntervals.push(now - previous);
          previous = now;
          maxMountedPages = Math.max(
            maxMountedPages,
            document.querySelectorAll(".flipbook-page").length
          );
          const phase = engine.snapshot.phase;
          if (phase !== "idle") sawMotion = true;
          if (sawMotion && phase === "idle") {
            resolve({
              duration: performance.now() - started,
              synchronousSetup,
              frameCount: frameIntervals.length,
              maxFrame: Math.max(...frameIntervals),
              p95Frame: percentile(frameIntervals, 0.95),
              longFrames: frameIntervals.filter((value) => value > 34).length,
              maxMountedPages
            });
            return;
          }
          requestAnimationFrame(sample);
        };

        requestAnimationFrame(sample);
        const setupStarted = performance.now();
        engine.next();
        synchronousSetup = performance.now() - setupStarted;
      });

      const coldTurn = await measureTurn();
      const turns: TurnMetric[] = [];
      for (let index = 0; index < 8; index += 1) turns.push(await measureTurn());

      return {
        coldTurn,
        turns,
        cacheSize: engine.pageCache.size as number,
        finalPage: engine.snapshot.currentPage as number,
        domPages: document.querySelectorAll(".flipbook-page").length
      };
    });

    const summary = {
      browser: browserName,
      cpuThrottle: browserName === "chromium" ? 4 : 1,
      coldTurn: profile.coldTurn,
      turns: profile.turns.length,
      averageDuration: profile.turns.reduce((sum, turn) => sum + turn.duration, 0) / profile.turns.length,
      worstP95Frame: Math.max(...profile.turns.map((turn) => turn.p95Frame)),
      worstFrame: Math.max(...profile.turns.map((turn) => turn.maxFrame)),
      totalLongFrames: profile.turns.reduce((sum, turn) => sum + turn.longFrames, 0),
      maxMountedPages: Math.max(...profile.turns.map((turn) => turn.maxMountedPages)),
      cacheSize: profile.cacheSize,
      finalPage: profile.finalPage,
      domPages: profile.domPages
    };

    console.log(`[mobile-profile] ${JSON.stringify(summary)}`);
    await testInfo.attach(`mobile-profile-${browserName}.json`, {
      body: Buffer.from(JSON.stringify({ summary, coldTurn: profile.coldTurn, turns: profile.turns }, null, 2)),
      contentType: "application/json"
    });

    expect(summary.finalPage).toBe(9);
    expect(summary.maxMountedPages).toBeLessThanOrEqual(3);
    expect(summary.cacheSize).toBeLessThanOrEqual(10);
    expect(summary.domPages).toBe(1);
    expect(summary.coldTurn.maxFrame).toBeLessThan(200);
    expect(summary.worstP95Frame).toBeLessThan(42);
    expect(summary.worstFrame).toBeLessThan(90);
  });
});
