import "./styles.css";
import { FlipbookEngine } from "./core/FlipbookEngine";
import { enablePdfZoom } from "./pdfZoom";
import type { PageDefinition } from "./types";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const makePage = (
  title: string,
  section: string,
  theme: string,
  body: string,
  extra = ""
): PageDefinition => ({
  title,
  section,
  render: () => {
    const page = document.createElement("div");
    page.className = `magazine-page ${theme}`;
    page.dataset.folio = title;
    page.innerHTML = `<p class="eyebrow">${section}</p><h2>${title}</h2><div class="rule"></div><p>${body}</p>${extra}`;
    return page;
  }
});

const pages: PageDefinition[] = [
  {
    title: "The Shape of Ideas",
    section: "Paperfold Journal · Issue 01",
    render: () => {
      const page = document.createElement("div");
      page.className = "magazine-page cover";
      page.dataset.folio = "01";
      page.innerHTML = `<p class="eyebrow">Paperfold Journal · Issue 01</p><h1>The shape<br>of ideas</h1><div class="rule"></div><p>A tactile, responsive publishing experiment built from live HTML.</p><div class="hero-block"></div>`;
      return page;
    }
  },
  makePage("Inside the fold", "Contents", "grid", "A study in interaction, geometry and digital craft.", `<div class="stat-grid"><div class="stat"><strong>01</strong>Motion</div><div class="stat"><strong>02</strong>Light</div><div class="stat"><strong>03</strong>Form</div><div class="stat"><strong>04</strong>Systems</div></div>`),
  makePage("A physical illusion", "Essay", "sun", "A digital page does not need to bend like paper to feel tactile. A precise crease, a reflected surface and responsive light are enough to persuade the eye."),
  makePage("Geometry first", "Engineering", "dark", "The crease is the perpendicular bisector between the grabbed corner and the pointer. Every visible layer follows from that one construction.", `<p class="quote">One line controls the entire fold.</p>`),
  makePage("Masks in motion", "Rendering", "blue", "An oversized clipping surface rotates around the crease while the page face is reflected beneath it. The diagonal of the page guarantees complete coverage."),
  makePage("Light sells depth", "Visual design", "", "Multiple narrow gradients make a straight fold read as curved paper. Their width and opacity respond continuously to progress and angle.", `<div class="stat-grid"><div class="stat"><strong>42%</strong>crease</div><div class="stat"><strong>18px</strong>edge</div></div>`),
  makePage("Release has intent", "Interaction", "grid", "Distance alone makes a reader feel mechanical. Combining progress with directional velocity allows both deliberate slow turns and tiny confident flicks."),
  makePage("Return to rest", "Interaction", "sun", "Pull a page inward, then return it to the edge. The engine recognizes the return and restores every layer without changing the page index."),
  makePage("A small live window", "Performance", "dark", "Only the current pages and their near neighbors need rich DOM trees. The rest can remain lightweight definitions until the reader approaches them.", `<p class="quote">Six pages, not six hundred.</p>`),
  makePage("One page or two", "Responsive", "blue", "The logical publication survives a layout change. Wide containers receive a spread; compact containers receive a single page with larger touch targets."),
  makePage("Readable by design", "Accessibility", "", "Live text, native controls, keyboard navigation and polite announcements preserve the document's meaning beyond its visual effect."),
  makePage("Zoom without losing place", "Navigation", "grid", "Fit scale and user zoom are separate. That distinction lets the container resize without unexpectedly resetting the reader's chosen view."),
  makePage("Quiet machinery", "Architecture", "sun", "The state machine owns intent. Geometry owns truth. Rendering merely projects that state into layers that the browser can composite efficiently."),
  makePage("Designed to extend", "API", "dark", "Pages can be images, HTML, components or later PDF surfaces. The fold engine only needs a page element with known dimensions."),
  makePage("Measure the feeling", "Testing", "blue", "Unit tests protect the mathematics. Browser gestures and visual snapshots protect the experience. Both are necessary for a convincing reader."),
  {
    title: "Continue the story",
    section: "Back cover",
    render: () => {
      const page = document.createElement("div");
      page.className = "magazine-page cover";
      page.dataset.folio = "16";
      page.innerHTML = `<p class="eyebrow">Paperfold Engine</p><p class="quote">A page should respond before it turns.</p><div class="rule"></div><p>Drag any outer edge or corner to begin again.</p>`;
      return page;
    }
  }
];

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing application root");

async function startBook() {
  const root = app!;
  root.textContent = "Loading ALUFURN Catalogue…";
  root.classList.add("catalogue-loading");
  root.setAttribute("role", "status");
  root.setAttribute("aria-busy", "true");
  const demo = new URLSearchParams(location.search).get("demo") === "1";
  const catalogue = demo ? null : await (await import("./pdf")).createPagesFromPdf(`${import.meta.env.BASE_URL}ALUFURN%20Catalogue.pdf`, {
    workerSrc,
    splitSpreads: true,
    titlePrefix: "ALUFURN Catalogue",
    section: "Catalogue",
    scale: 3,
    maxPixelRatio: 2
  });
  const firstPage = catalogue ? await catalogue.document.getPage(1) : null;
  const dimensions = firstPage?.getViewport({ scale: 1 });
  root.classList.remove("catalogue-loading");
  root.removeAttribute("role");
  const engine = new FlipbookEngine(root, {
  pages: catalogue?.pages ?? pages,
  initialPage: Math.max(0, (Number.parseInt(new URLSearchParams(location.search).get("page") ?? "1", 10) || 1) - 1),
  pageWidth: 720,
  pageHeight: dimensions ? 720 * dimensions.height / (dimensions.width / 2) : 1016,
  turnDuration: 600,
  autoplayInterval: 3000,
  spreadBreakpoint: 760,
  preloadRadius: 3,
  maxCachedPages: 10,
  curvature: "multi-band"
});

Object.assign(window, { paperfold: engine });
  const disposeZoom = catalogue ? enablePdfZoom(root, engine, catalogue.document) : () => {};
  root.removeAttribute("aria-busy");
  document.title = demo ? "Paperfold Flipbook Engine" : "ALUFURN Catalogue";
  if (!demo) {
    const toolbar = root.querySelector(".flipbook-controls")!;
    const more = toolbar.querySelector(".flipbook-more");
    const icon = (path: string) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
    const notice = document.createElement("div");
    notice.className = "catalogue-notice";
    notice.setAttribute("role", "status");
    root.querySelector(".flipbook-viewport")!.append(notice);
    let noticeTimer: ReturnType<typeof setTimeout>;
    const notify = (message: string) => {
      clearTimeout(noticeTimer);
      notice.textContent = message;
      notice.classList.add("is-visible");
      noticeTimer = setTimeout(() => notice.classList.remove("is-visible"), 4500);
    };
    const share = document.createElement("button");
    share.type = "button";
    share.className = "flipbook-button catalogue-share";
    share.title = "Share this page";
    share.setAttribute("aria-label", "Share this page");
    share.innerHTML = icon("M12 16V3m-4 4 4-4 4 4M5 12v8h14v-8");
    share.addEventListener("click", async () => {
      const url = new URL(location.href);
      url.searchParams.set("page", String(engine.snapshot.currentPage + 1));
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      try {
        if (navigator.share && !local) await navigator.share({ title: "ALUFURN Catalogue", url: url.href });
        else {
          await navigator.clipboard.writeText(url.href);
          notify(local ? "Link copied — this preview link works only on this computer." : "Link to this page copied");
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        window.prompt("Copy this catalogue page link:", url.href);
      }
    });
    const download = document.createElement("a");
    download.className = "flipbook-button catalogue-download";
    download.href = `${import.meta.env.BASE_URL}ALUFURN%20Catalogue.pdf`;
    download.download = "ALUFURN Catalogue.pdf";
    download.title = "Download PDF";
    download.setAttribute("aria-label", "Download PDF");
    download.innerHTML = icon("M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5");
    toolbar.insertBefore(share, more);
    toolbar.insertBefore(download, more);
    if (import.meta.hot) import.meta.hot.dispose(() => clearTimeout(noticeTimer));
  }
  if (import.meta.hot) import.meta.hot.dispose(() => {
    disposeZoom();
    engine.destroy();
    if (catalogue) void catalogue.destroy();
  });
}

void startBook().catch((error) => {
  console.error("Catalogue loading failed", error);
  app.removeAttribute("aria-busy");
  app.textContent = "Unable to load ALUFURN Catalogue. ";
  const retry = document.createElement("button");
  retry.textContent = "Try again";
  retry.addEventListener("click", () => location.reload());
  app.append(retry);
  app.setAttribute("role", "alert");
});
