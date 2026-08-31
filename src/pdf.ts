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

  const pages: PageDefinition[] = Array.from({ length: pdf.numPages }, (_, index) => {
    const pageNumber = index + 1;
    let imageUrl: string | null = null;
    let renderPromise: Promise<string> | null = null;

    const renderImage = (): Promise<string> => {
      if (imageUrl) return Promise.resolve(imageUrl);
      if (renderPromise) return renderPromise;
      renderPromise = (async () => {
        const page = await pdf.getPage(pageNumber);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
        const viewport = page.getViewport({ scale: scale * pixelRatio });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport }).promise;
        const blob = await canvasToBlob(canvas);
        imageUrl = URL.createObjectURL(blob);
        objectUrls.add(imageUrl);
        page.cleanup();
        return imageUrl;
      })().catch((error) => {
        renderPromise = null;
        throw error;
      });
      return renderPromise;
    };

    const createPage = (): HTMLElement => {
      const figure = document.createElement("figure");
      figure.className = ["paperfold-pdf-page", options.pageClassName].filter(Boolean).join(" ");
      figure.setAttribute("aria-busy", imageUrl ? "false" : "true");
      const image = document.createElement("img");
      image.alt = `${options.titlePrefix ?? "PDF"} page ${pageNumber}`;
      image.draggable = false;
      figure.append(image);
      const showImage = (url: string) => {
        image.src = url;
        figure.setAttribute("aria-busy", "false");
      };
      if (imageUrl) showImage(imageUrl);
      else void renderImage().then(showImage).catch(() => {
        figure.classList.add("is-error");
        figure.setAttribute("aria-busy", "false");
        figure.append(appendError("Unable to render this PDF page."));
      });
      return figure;
    };

    return {
      title: `${options.titlePrefix ?? "PDF"} page ${pageNumber}`,
      section: options.section ?? "PDF",
      render: createPage,
      clone: () => createPage(),
      dispose: () => {
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
    pageCount: pdf.numPages,
    async destroy() {
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
