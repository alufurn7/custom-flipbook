import "./styles.css";
import { FlipbookEngine } from "./core/FlipbookEngine";
import { enablePdfZoom } from "./pdfZoom";
import { LIBRARY_CONFIG, getBookById, type BookItem } from "./books";
import { LibraryView } from "./libraryView";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing application root #app");

let currentDispose: (() => void) | null = null;

function renderCurrentRoute(): void {
  if (currentDispose) {
    currentDispose();
    currentDispose = null;
  }

  const params = new URLSearchParams(location.search);
  const bookId = params.get("book");

  if (bookId) {
    const book = getBookById(bookId);
    if (book) {
      void startBook(book);
      return;
    }
  }

  showLibrary();
}

function navigateToBook(bookId: string): void {
  const url = new URL(location.href);
  url.searchParams.set("book", bookId);
  url.searchParams.delete("page");
  history.pushState({ bookId }, "", url.toString());
  renderCurrentRoute();
}

function navigateToLibrary(): void {
  const url = new URL(location.href);
  url.searchParams.delete("book");
  url.searchParams.delete("page");
  history.pushState({}, "", url.pathname + (url.search ? url.search : ""));
  renderCurrentRoute();
}

function showLibrary(): void {
  document.title = "ALUFURN · Publications & Catalogues Library";
  const libraryView = new LibraryView(app!, {
    onSelectBook: (bookId) => navigateToBook(bookId)
  });
  libraryView.render();
}

async function startBook(book: BookItem): Promise<void> {
  const root = app!;
  root.className = "";
  root.innerHTML = `
    <div class="catalogue-loading" role="status" aria-busy="true">
      <div class="catalogue-loading-spinner"></div>
      <p class="catalogue-loading-title">Opening ${book.title}…</p>
      <p class="catalogue-loading-sub">Preparing high-definition interactive pages</p>
      <button type="button" class="catalogue-loading-back-btn">← Return to Library</button>
    </div>
  `;

  const backBtn = root.querySelector(".catalogue-loading-back-btn");
  backBtn?.addEventListener("click", () => navigateToLibrary());

  try {
    const fullPdfUrl = book.pdfUrl.startsWith("http") || book.pdfUrl.startsWith("/")
      ? book.pdfUrl
      : `${import.meta.env.BASE_URL}${encodeURIComponent(book.pdfUrl)}`;

    const { createPagesFromPdf } = await import("./pdf");
    const catalogue = await createPagesFromPdf(fullPdfUrl, {
      workerSrc,
      splitSpreads: book.splitSpreads ?? true,
      titlePrefix: book.title,
      section: "Catalogue",
      scale: 3,
      maxPixelRatio: 2
    });

    const firstPage = await catalogue.document.getPage(1);
    const dimensions = firstPage.getViewport({ scale: 1 });
    firstPage.cleanup();

    root.innerHTML = "";

    const initialPageParam = Number.parseInt(new URLSearchParams(location.search).get("page") ?? "1", 10);
    const initialPage = Math.max(0, (Number.isFinite(initialPageParam) ? initialPageParam : 1) - 1);

    const singlePageWidth = (book.splitSpreads ?? true) ? dimensions.width / 2 : dimensions.width;
    const computedHeight = singlePageWidth > 0 ? 720 * dimensions.height / singlePageWidth : 1016;

    const engine = new FlipbookEngine(root, {
      pages: catalogue.pages,
      initialPage,
      pageWidth: 720,
      pageHeight: computedHeight,
      turnDuration: 600,
      autoplayInterval: 3000,
      spreadBreakpoint: 760,
      preloadRadius: 3,
      maxCachedPages: 10,
      curvature: "multi-band",
      soundSrc: `${import.meta.env.BASE_URL}pageflipFX.mp3`,
      logoSrc: `${import.meta.env.BASE_URL}${LIBRARY_CONFIG.logoSrc}`,
      onBackToLibrary: () => navigateToLibrary(),
      websiteUrl: LIBRARY_CONFIG.websiteUrl,
      websiteLabel: LIBRARY_CONFIG.websiteLabel
    });

    Object.assign(window, { paperfold: engine });
    const disposeZoom = enablePdfZoom(root, engine, catalogue.document);

    document.title = `${book.title} · ALUFURN Digital Flipbook`;

    currentDispose = () => {
      disposeZoom();
      engine.destroy();
      void catalogue.destroy();
    };
  } catch (error) {
    console.error("Book loading failed", error);
    root.innerHTML = `
      <div class="catalogue-error" role="alert">
        <h2>Unable to load catalogue</h2>
        <p>There was an error loading the document. Please check your connection and try again.</p>
        <div class="catalogue-error-actions">
          <button type="button" class="btn-retry">Try again</button>
          <button type="button" class="btn-back">← Back to Library</button>
        </div>
      </div>
    `;
    root.querySelector(".btn-retry")?.addEventListener("click", () => void startBook(book));
    root.querySelector(".btn-back")?.addEventListener("click", () => navigateToLibrary());
  }
}

window.addEventListener("popstate", () => {
  renderCurrentRoute();
});

renderCurrentRoute();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (currentDispose) currentDispose();
  });
}
