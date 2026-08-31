// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfState = vi.hoisted(() => {
  const cleanup = vi.fn();
  const destroy = vi.fn(async () => undefined);
  const render = vi.fn(() => ({ promise: Promise.resolve() }));
  const getPage = vi.fn(async () => ({
    getViewport: ({ scale }: { scale: number }) => ({ width: 400 * scale, height: 600 * scale }),
    render,
    cleanup
  }));
  const document = { numPages: 2, getPage };
  const getDocument = vi.fn(() => ({ promise: Promise.resolve(document), destroy }));
  return { cleanup, destroy, render, getPage, document, getDocument };
});

vi.mock("pdfjs-dist", () => ({
  getDocument: pdfState.getDocument,
  GlobalWorkerOptions: { workerSrc: "" }
}));

import { createPagesFromPdf } from "../src/pdf";

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 3 });
  HTMLCanvasElement.prototype.toBlob = function toBlob(callback) {
    callback(new Blob(["page"], { type: "image/png" }));
  };
  URL.createObjectURL = vi.fn(() => "blob:paperfold-page");
  URL.revokeObjectURL = vi.fn();
});

describe("PDF page adapter", () => {
  it("renders once and supplies the resulting image to every mounted clone", async () => {
    const publication = await createPagesFromPdf(new Uint8Array([1, 2, 3]), {
      scale: 1.5,
      maxPixelRatio: 2,
      titlePrefix: "Catalogue"
    });
    const cached = publication.pages[0].render();
    const mounted = publication.pages[0].clone?.(cached);

    await vi.waitFor(() => expect(mounted?.querySelector("img")?.src).toContain("blob:paperfold-page"));
    expect(pdfState.getPage).toHaveBeenCalledTimes(1);
    expect(pdfState.render).toHaveBeenCalledTimes(1);
    expect(publication.pages[0].title).toBe("Catalogue page 1");
    expect(cached.getAttribute("aria-busy")).toBe("false");
  });

  it("releases image URLs and the PDF document", async () => {
    const publication = await createPagesFromPdf("/publication.pdf");
    const cached = publication.pages[0].render();
    await vi.waitFor(() => expect(cached.getAttribute("aria-busy")).toBe("false"));

    publication.pages[0].dispose?.(cached);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:paperfold-page");
    await publication.destroy();
    expect(pdfState.destroy).toHaveBeenCalledOnce();
  });
});
