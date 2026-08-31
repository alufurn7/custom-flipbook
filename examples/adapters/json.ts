import { FlipbookEngine } from "paperfold-flipbook";
import { createPagesFromJson, type JsonFlipbookDocument } from "paperfold-flipbook/json";
import "paperfold-flipbook/styles.css";

const publication: JsonFlipbookDocument = {
  title: "Product Notes",
  pages: [
    {
      title: "Welcome",
      section: "Opening",
      blocks: [
        { type: "heading", level: 1, text: "Product Notes" },
        { type: "paragraph", text: "Structured content rendered without unsafe HTML." },
        { type: "divider" },
        { type: "quote", text: "Content stays portable.", attribution: "Paperfold" }
      ]
    }
  ]
};

const mount = document.querySelector<HTMLElement>("#app");
if (!mount) throw new Error("Missing #app mount point");
new FlipbookEngine(mount, { pages: createPagesFromJson(publication) });
