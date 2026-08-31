import { FlipbookEngine, type PageDefinition } from "paperfold-flipbook";
import "paperfold-flipbook/styles.css";

const pages: PageDefinition[] = Array.from({ length: 8 }, (_, index) => ({
  title: `Page ${index + 1}`,
  section: index < 2 ? "Opening" : "Article",
  render: () => {
    const page = document.createElement("article");
    page.className = "magazine-page";
    page.dataset.folio = String(index + 1);
    page.innerHTML = `<p class="eyebrow">Paperfold</p><h2>Page ${index + 1}</h2>`;
    return page;
  }
}));

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app mount point");

const engine = new FlipbookEngine(root, { pages });
window.addEventListener("pagehide", () => engine.destroy(), { once: true });
