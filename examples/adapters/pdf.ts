import { FlipbookEngine } from "paperfold-flipbook";
import { createPagesFromPdf } from "paperfold-flipbook/pdf";
import "paperfold-flipbook/styles.css";

const mount = document.querySelector<HTMLElement>("#app");
if (!mount) throw new Error("Missing #app mount point");

const publication = await createPagesFromPdf("/publication.pdf", {
  workerSrc: new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString(),
  titlePrefix: "Publication",
  scale: 1.5,
  maxPixelRatio: 2
});

const engine = new FlipbookEngine(mount, {
  pages: publication.pages,
  maxCachedPages: 10
});

window.addEventListener("pagehide", () => {
  engine.destroy();
  void publication.destroy();
}, { once: true });
