// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createPagesFromJson } from "../src/json";

describe("JSON page adapter", () => {
  it("renders structured semantic blocks without interpreting HTML", () => {
    const [page] = createPagesFromJson({
      title: "Journal",
      pages: [{
        title: "Opening",
        blocks: [
          { type: "heading", level: 1, text: "A safe <em>heading</em>" },
          { type: "paragraph", text: "Body copy" },
          { type: "list", ordered: true, items: ["One", "Two"] },
          { type: "quote", text: "Quoted", attribution: "Author" },
          { type: "image", src: "/cover.png", alt: "Cover", caption: "Figure one" }
        ]
      }]
    });

    const content = page.render();
    expect(page.section).toBe("Journal");
    expect(content.querySelector("h1")?.textContent).toBe("A safe <em>heading</em>");
    expect(content.querySelector("h1 em")).toBeNull();
    expect(content.querySelectorAll("ol li")).toHaveLength(2);
    expect(content.querySelector("img")?.alt).toBe("Cover");
    expect(content.querySelector("figcaption")?.textContent).toBe("Figure one");
  });
});
