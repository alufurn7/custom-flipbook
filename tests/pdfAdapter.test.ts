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
  it("does not retain a render completed after its page was evicted", async () => {
    let complete!: () => void;
    pdfState.render.mockImplementationOnce(() => ({ promise: new Promise<void>(resolve => { complete = resolve; }) }));
    const publication = await createPagesFromPdf("/publication.pdf");
    const cached = publication.pages[0].render();
    await vi.waitFor(() => expect(pdfState.render).toHaveBeenCalledOnce());
    publication.pages[0].dispose?.(cached);
    complete();
    await vi.waitFor(() => expect(cached.getAttribute("aria-busy")).toBe("false"));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    const fresh = publication.pages[0].render();
    await vi.waitFor(() => expect(fresh.querySelector("img")?.src).toContain("blob:paperfold-page"));
    await publication.destroy();
  });

  it("splits front cover, interior spread and back cover in reading order", async () => {
    const publication = await createPagesFromPdf("/publication.pdf", { splitSpreads: true, scale: 1, maxPixelRatio: 1 });
    expect(publication.pageCount).toBe(4);
    for (const definition of publication.pages) {
      const mounted = definition.render();
      await vi.waitFor(() => expect(mounted.getAttribute("aria-busy")).toBe("false"));
    }
    expect(pdfState.getPage.mock.calls.map(call => (call as any)[0])).toEqual([1, 2, 2, 1]);
    expect(pdfState.render.mock.calls.map(call => (call as any)[0].transform?.[4] ?? 0)).toEqual([-200, 0, -200, 0]);
    await publication.destroy();
  });
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
    const readyClone = publication.pages[0].clone?.(cached);
    expect(readyClone?.getAttribute("aria-busy")).toBe("false");
    expect(readyClone?.querySelector("img")?.src).toContain("blob:paperfold-page");
    expect(readyClone?.querySelector("img")?.decoding).toBe("sync");
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
