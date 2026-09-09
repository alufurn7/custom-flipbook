import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { FlipbookEngine } from "./core/FlipbookEngine";

/** Sharpen only visible PDF pages; retain the normal images for instant reset. */
export function enablePdfZoom(root: HTMLElement, engine: FlipbookEngine, pdf: PDFDocumentProxy): () => void {
  const originals = new Map<HTMLImageElement, string>();
  const urls = new Set<string>();
  let task: RenderTask | null = null;
  let timer: ReturnType<typeof setTimeout>;
  let generation = 0;
  let signature = "";

  const restore = () => {
    for (const [image, src] of originals) image.src = src;
    originals.clear();
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
  };

  const sharpen = async (version: number, zoom: number) => {
    const sheets = root.querySelectorAll<HTMLElement>(".flipbook-base-layer .flipbook-page");
    for (const sheet of sheets) {
      if (version !== generation) return;
      const image = sheet.querySelector<HTMLImageElement>("img");
      if (!image) continue;
      if (image.decode) await image.decode();
      if (version !== generation) return;
      const index = Number(sheet.dataset.page);
      const last = pdf.numPages * 2 - 1;
      const pageNumber = index === 0 || index === last ? 1 : Math.floor((index + 1) / 2) + 1;
      const rightHalf = index === 0 || (index < last && index % 2 === 0);
      const page = await pdf.getPage(pageNumber);
      if (version !== generation) return;
      const base = page.getViewport({ scale: 1 });
      const desiredScale = image.naturalWidth * zoom / (base.width / 2);
      const maxScale = Math.sqrt(24_000_000 / (base.width * base.height / 2));
      // Whole-number scales also avoid embedded-image resampling artifacts.
      const scale = Math.max(1, Math.floor(Math.min(Math.ceil(desiredScale), maxScale)));
      const viewport = page.getViewport({ scale });
      if (viewport.width / 2 <= image.naturalWidth) continue;
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width / 2);
      canvas.height = Math.ceil(viewport.height);
      try {
        task = page.render({ canvas, viewport, transform: [1, 0, 0, 1, rightHalf ? -viewport.width / 2 : 0, 0] });
        await task.promise;
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob || version !== generation) return;
        const url = URL.createObjectURL(blob);
        urls.add(url);
        const decoded = new Image();
        decoded.src = url;
        await decoded.decode();
        if (version !== generation || !image.isConnected) {
          URL.revokeObjectURL(url);
          urls.delete(url);
          return;
        }
        originals.set(image, image.src);
        image.decoding = "sync";
        image.src = url;
      } finally {
        canvas.width = canvas.height = 0;
      }
    }
  };

  const update = () => {
    const state = engine.snapshot;
    const key = `${state.zoom}:${state.currentPage}:${state.displayMode}`;
    if (key === signature) return;
    signature = key;
    generation += 1;
    clearTimeout(timer);
    task?.cancel();
    task = null;
    restore();
    if (state.zoom <= 1) return;
    const version = generation;
    timer = setTimeout(() => {
      // On failure retain the readable normal-resolution image.
      void sharpen(version, state.zoom).catch(() => {});
    }, 180);
  };
  const unsubscribe = engine.onChange(update);
  update();
  return () => {
    unsubscribe();
    generation += 1;
    clearTimeout(timer);
    task?.cancel();
    restore();
  };
}
