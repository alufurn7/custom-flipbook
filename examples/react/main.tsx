import { StrictMode, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Paperfold, type PaperfoldHandle } from "paperfold-flipbook/react";
import type { PageDefinition } from "paperfold-flipbook";
import "paperfold-flipbook/styles.css";

function App() {
  const flipbook = useRef<PaperfoldHandle>(null);
  const [visiblePage, setVisiblePage] = useState(1);
  const pages = useMemo<PageDefinition[]>(() => Array.from({ length: 8 }, (_, index) => ({
    title: `Page ${index + 1}`,
    section: index < 2 ? "Opening" : "Article",
    render: () => {
      const page = document.createElement("article");
      page.innerHTML = `<p>React integration</p><h2>Page ${index + 1}</h2>`;
      return page;
    }
  })), []);

  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <Paperfold
        ref={flipbook}
        pages={pages}
        options={{ preloadRadius: 3, maxCachedPages: 10 }}
        onChange={(snapshot) => setVisiblePage(snapshot.currentPage + 1)}
        containerProps={{ "aria-label": "Product catalogue" }}
      />
      <output style={{ position: "fixed", right: 12, top: 12 }}>Page {visiblePage}</output>
    </main>
  );
}

const root = document.querySelector<HTMLElement>("#root");
if (!root) throw new Error("Missing #root mount point");
createRoot(root).render(<StrictMode><App /></StrictMode>);
