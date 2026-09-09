import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy
} from "pdfjs-dist";
import type { PageDefinition } from "./types";

export type PdfDocumentParameters = NonNullable<Parameters<typeof getDocument>[0]>;
export type PdfSource = string | URL | Uint8Array | ArrayBuffer | PdfDocumentParameters;

export interface PdfAdapterOptions {
  /** Split spread PDFs whose first sheet contains back cover (left) and front cover (right). */
  splitSpreads?: boolean;
  workerSrc?: string;
  scale?: number;
  maxPixelRatio?: number;
  titlePrefix?: string;
  section?: string;
  pageClassName?: string;
}

export interface PdfFlipbookSource {
  document: PDFDocumentProxy;
  pages: PageDefinition[];
  pageCount: number;
  destroy(): Promise<void>;
}

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PDF canvas encoding failed")), "image/png");
});

const makeLoadingTask = (source: PdfSource): PDFDocumentLoadingTask => {
  if (source instanceof ArrayBuffer) return getDocument({ data: new Uint8Array(source) });
  if (source instanceof Uint8Array) return getDocument({ data: source });
  if (typeof source === "string" || source instanceof URL) return getDocument({ url: source });
  return getDocument(source);
};

export const createPagesFromPdf = async (
  source: PdfSource,
  options: PdfAdapterOptions = {}
): Promise<PdfFlipbookSource> => {
  if (options.workerSrc) GlobalWorkerOptions.workerSrc = options.workerSrc;
  const loadingTask = makeLoadingTask(source);
  const pdf = await loadingTask.promise;
  const scale = Math.max(0.25, options.scale ?? 1.5);
  const maxPixelRatio = Math.max(1, options.maxPixelRatio ?? 2);
  const objectUrls = new Set<string>();
  let destroyed = false;
  let activeRenders = 0;
  const waiting: Array<() => void> = [];
  const acquireRender = async () => {
    if (activeRenders >= 2) await new Promise<void>((resolve) => waiting.push(resolve));
    else activeRenders += 1;
  };
  const releaseRender = () => {
    const next = waiting.shift();
    if (next) next();
    else activeRenders -= 1;
  };

  const pageCount = options.splitSpreads ? pdf.numPages * 2 : pdf.numPages;
  const pages: PageDefinition[] = Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = options.splitSpreads
      ? (index === 0 || index === pageCount - 1 ? 1 : Math.floor((index + 1) / 2) + 1)
      : index + 1;
    const rightHalf = options.splitSpreads && (index === 0 || (index < pageCount - 1 && index % 2 === 0));
    let imageUrl: string | null = null;
    let readyImage: HTMLImageElement | null = null;
    let renderPromise: Promise<string> | null = null;
    let generation = 0;

    const renderImage = (): Promise<string> => {
      if (imageUrl) return Promise.resolve(imageUrl);
      if (renderPromise) return renderPromise;
      const version = generation;
      renderPromise = (async () => {
        await acquireRender();
        try {
        if (destroyed || version !== generation) throw new Error("PDF render cancelled");
        const page = await pdf.getPage(pageNumber);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
        let viewport = page.getViewport({ scale: scale * pixelRatio });
        const pixels = viewport.width * viewport.height / (options.splitSpreads ? 2 : 1);
        // Keep high-DPI pages sharp without allocating enormous mobile canvases.
        if (pixels > 8_000_000) {
          const cappedScale = scale * pixelRatio * Math.sqrt(8_000_000 / pixels);
          viewport = page.getViewport({ scale: cappedScale >= 1 ? Math.floor(cappedScale) : cappedScale });
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width / (options.splitSpreads ? 2 : 1));
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport,
          transform: rightHalf ? [1, 0, 0, 1, -viewport.width / 2, 0] : undefined
        }).promise;
        const blob = await canvasToBlob(canvas);
        canvas.width = canvas.height = 0;
        if (destroyed || version !== generation) throw new Error("PDF render cancelled");
        imageUrl = URL.createObjectURL(blob);
        objectUrls.add(imageUrl);
        page.cleanup();
        return imageUrl;
        } finally { releaseRender(); }
      })().catch((error) => {
        if (version === generation) renderPromise = null;
        throw error;
      });
      return renderPromise;
    };

    const createPage = (): HTMLElement => {
      const figure = document.createElement("figure");
      figure.className = ["paperfold-pdf-page", "flipbook-page-content", options.pageClassName].filter(Boolean).join(" ");
      const cachedImage = readyImage;
      figure.setAttribute("aria-busy", cachedImage ? "false" : "true");
      const image = cachedImage ? cachedImage.cloneNode() as HTMLImageElement : document.createElement("img");
      image.alt = `${options.titlePrefix ?? "PDF"} page ${index + 1}`;
      image.draggable = false;
      // Cached clones share the decoded resource and paint in the same frame.
      image.decoding = cachedImage ? "sync" : "async";
      figure.append(image);
      if (cachedImage) return figure;
      const version = generation;
      const showImage = async (url: string) => {
        image.src = url;
        if (image.decode) await image.decode();
        if (destroyed || version !== generation) return;
        readyImage = image;
        figure.setAttribute("aria-busy", "false");
      };
      void (imageUrl ? Promise.resolve(imageUrl) : renderImage()).then(showImage).catch(() => {
        figure.classList.add("is-error");
        figure.setAttribute("aria-busy", "false");
        figure.append(appendError("Unable to render this PDF page."));
      });
      return figure;
    };

    return {
      title: `${options.titlePrefix ?? "PDF"} page ${index + 1}`,
      section: options.section ?? "PDF",
      render: createPage,
      clone: () => createPage(),
      dispose: () => {
        generation += 1;
        readyImage = null;
        if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
          objectUrls.delete(imageUrl);
        }
        imageUrl = null;
        renderPromise = null;
      }
    };
  });

  return {
    document: pdf,
    pages,
    pageCount,
    async destroy() {
      destroyed = true;
      for (const url of objectUrls) URL.revokeObjectURL(url);
      objectUrls.clear();
      await loadingTask.destroy();
    }
  };
};

const appendError = (message: string): HTMLElement => {
  const error = document.createElement("p");
  error.className = "paperfold-pdf-error";
  error.setAttribute("role", "alert");
  error.textContent = message;
  return error;
};
