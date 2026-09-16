import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { BookItem } from "./books";

GlobalWorkerOptions.workerSrc = workerSrc;

const DB_NAME = "alufurn_flipbook_cache";
const STORE_NAME = "cover_thumbnails";

// IndexedDB helper for high-performance offline/instant caching of rendered thumbnails
const openDb = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const getCachedThumbnail = async (id: string): Promise<string | null> => {
  try {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const setCachedThumbnail = async (id: string, dataUrl: string): Promise<void> => {
  try {
    const db = await openDb();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(dataUrl, id);
  } catch {
    // Ignore cache write errors
  }
};

/**
 * Generates a crisp cover thumbnail directly from page 1 of the PDF.
 * If splitSpreads is true, extracts the right half of sheet 1 (the front cover).
 */
export const generateCoverThumbnail = async (
  book: BookItem,
  targetWidth = 480
): Promise<string> => {
  // 1. Check IndexedDB cache first
  const cached = await getCachedThumbnail(book.id);
  if (cached) return cached;

  // 2. Render from PDF page 1
  const fullPdfUrl = book.pdfUrl.startsWith("http") || book.pdfUrl.startsWith("/")
    ? book.pdfUrl
    : `${import.meta.env.BASE_URL}${encodeURIComponent(book.pdfUrl)}`;

  const loadingTask = getDocument({
    url: fullPdfUrl,
    cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/",
    cMapPacked: true
  });

  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  // Unscaled viewport to compute aspect ratio
  const rawViewport = page.getViewport({ scale: 1 });
  const isSplit = Boolean(book.splitSpreads);
  const singlePageWidth = isSplit ? rawViewport.width / 2 : rawViewport.width;
  const scale = targetWidth / singlePageWidth;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: scale * dpr });

  const canvas = document.createElement("canvas");
  const finalCanvasWidth = Math.ceil(viewport.width / (isSplit ? 2 : 1));
  const finalCanvasHeight = Math.ceil(viewport.height);

  canvas.width = finalCanvasWidth;
  canvas.height = finalCanvasHeight;

  await page.render({
    canvas,
    viewport,
    transform: isSplit ? [1, 0, 0, 1, -viewport.width / 2, 0] : undefined
  }).promise;

  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
  canvas.width = 0;
  canvas.height = 0;
  page.cleanup();

  void setCachedThumbnail(book.id, dataUrl);
  return dataUrl;
};
