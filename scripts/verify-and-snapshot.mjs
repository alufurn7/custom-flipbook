import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

async function run() {
  console.log("Launching browser...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });

  const page = await context.newPage();

  console.log("Navigating to http://127.0.0.1:5173/ ...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });

  // 1. Verify header elements
  const logo = await page.$(".library-header-logo");
  console.log("Logo present:", !!logo);

  const websiteLink = await page.$(".library-website-link");
  const websiteHref = await websiteLink?.getAttribute("href");
  console.log("Website backlink href:", websiteHref);

  // 2. Wait for cover thumbnail to finish rendering from PDF page 1
  console.log("Waiting for book cover thumbnail...");
  await page.waitForSelector(".book-cover-image:not(.is-loading)", { timeout: 30000 });
  const coverSrc = await page.$eval(".book-cover-image", (img) => img.src);
  console.log("Cover image src prefix:", coverSrc.substring(0, 50));

  // Save the rendered cover thumbnail to public/thumbnails/alufurn-catalogue.jpg if it's a dataURL
  if (coverSrc.startsWith("data:image/")) {
    const base64Data = coverSrc.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    fs.mkdirSync("public/thumbnails", { recursive: true });
    fs.writeFileSync("public/thumbnails/alufurn-catalogue.jpg", buffer);
    console.log("Saved static thumbnail to public/thumbnails/alufurn-catalogue.jpg! Size:", buffer.length);
  }

  // 3. Desktop screenshot
  fs.mkdirSync("outputs", { recursive: true });
  await page.screenshot({ path: "outputs/library-desktop.png", fullPage: true });
  console.log("Captured outputs/library-desktop.png");

  // 4. Mobile screenshot
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "outputs/library-mobile.png" });
  console.log("Captured outputs/library-mobile.png");

  // 5. Test opening flipbook reader
  console.log("Clicking 'Open Interactive Flipbook'...");
  await page.click(".btn-read-book");
  await page.waitForURL(/book=alufurn-catalogue/);
  console.log("Navigated to book URL:", page.url());

  // Wait for flipbook engine to mount and render page
  await page.waitForSelector(".flipbook-viewport", { timeout: 20000 });
  console.log("Flipbook reader mounted successfully!");

  await page.waitForTimeout(3000);
  const backBtn = await page.$(".flipbook-back-btn");
  console.log("Reader '← Library' button present:", !!backBtn);

  await page.screenshot({ path: "outputs/reader-view.png" });
  console.log("Captured outputs/reader-view.png");

  // 6. Test returning to library
  console.log("Clicking '← Library' button...");
  await backBtn.click();
  await page.waitForSelector(".library-hero");
  console.log("Returned to Library Home Page! Current URL:", page.url());

  await browser.close();
  console.log("Verification completed successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
