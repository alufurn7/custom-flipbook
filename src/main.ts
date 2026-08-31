import "./styles.css";
import { FlipbookEngine } from "./core/FlipbookEngine";
import type { PageDefinition } from "./types";

const makePage = (
  title: string,
  section: string,
  theme: string,
  body: string,
  extra = ""
): PageDefinition => ({
  title,
  section,
  render: () => {
    const page = document.createElement("div");
    page.className = `magazine-page ${theme}`;
    page.dataset.folio = title;
    page.innerHTML = `<p class="eyebrow">${section}</p><h2>${title}</h2><div class="rule"></div><p>${body}</p>${extra}`;
    return page;
  }
});

const pages: PageDefinition[] = [
  {
    title: "The Shape of Ideas",
    section: "Paperfold Journal · Issue 01",
    render: () => {
      const page = document.createElement("div");
      page.className = "magazine-page cover";
      page.dataset.folio = "01";
      page.innerHTML = `<p class="eyebrow">Paperfold Journal · Issue 01</p><h1>The shape<br>of ideas</h1><div class="rule"></div><p>A tactile, responsive publishing experiment built from live HTML.</p><div class="hero-block"></div>`;
      return page;
    }
  },
  makePage("Inside the fold", "Contents", "grid", "A study in interaction, geometry and digital craft.", `<div class="stat-grid"><div class="stat"><strong>01</strong>Motion</div><div class="stat"><strong>02</strong>Light</div><div class="stat"><strong>03</strong>Form</div><div class="stat"><strong>04</strong>Systems</div></div>`),
  makePage("A physical illusion", "Essay", "sun", "A digital page does not need to bend like paper to feel tactile. A precise crease, a reflected surface and responsive light are enough to persuade the eye."),
  makePage("Geometry first", "Engineering", "dark", "The crease is the perpendicular bisector between the grabbed corner and the pointer. Every visible layer follows from that one construction.", `<p class="quote">One line controls the entire fold.</p>`),
  makePage("Masks in motion", "Rendering", "blue", "An oversized clipping surface rotates around the crease while the page face is reflected beneath it. The diagonal of the page guarantees complete coverage."),
  makePage("Light sells depth", "Visual design", "", "Multiple narrow gradients make a straight fold read as curved paper. Their width and opacity respond continuously to progress and angle.", `<div class="stat-grid"><div class="stat"><strong>42%</strong>crease</div><div class="stat"><strong>18px</strong>edge</div></div>`),
  makePage("Release has intent", "Interaction", "grid", "Distance alone makes a reader feel mechanical. Combining progress with directional velocity allows both deliberate slow turns and tiny confident flicks."),
  makePage("Return to rest", "Interaction", "sun", "Pull a page inward, then return it to the edge. The engine recognizes the return and restores every layer without changing the page index."),
  makePage("A small live window", "Performance", "dark", "Only the current pages and their near neighbors need rich DOM trees. The rest can remain lightweight definitions until the reader approaches them.", `<p class="quote">Six pages, not six hundred.</p>`),
  makePage("One page or two", "Responsive", "blue", "The logical publication survives a layout change. Wide containers receive a spread; compact containers receive a single page with larger touch targets."),
  makePage("Readable by design", "Accessibility", "", "Live text, native controls, keyboard navigation and polite announcements preserve the document's meaning beyond its visual effect."),
  makePage("Zoom without losing place", "Navigation", "grid", "Fit scale and user zoom are separate. That distinction lets the container resize without unexpectedly resetting the reader's chosen view."),
  makePage("Quiet machinery", "Architecture", "sun", "The state machine owns intent. Geometry owns truth. Rendering merely projects that state into layers that the browser can composite efficiently."),
  makePage("Designed to extend", "API", "dark", "Pages can be images, HTML, components or later PDF surfaces. The fold engine only needs a page element with known dimensions."),
  makePage("Measure the feeling", "Testing", "blue", "Unit tests protect the mathematics. Browser gestures and visual snapshots protect the experience. Both are necessary for a convincing reader."),
  {
    title: "Continue the story",
    section: "Back cover",
    render: () => {
      const page = document.createElement("div");
      page.className = "magazine-page cover";
      page.dataset.folio = "16";
      page.innerHTML = `<p class="eyebrow">Paperfold Engine</p><p class="quote">A page should respond before it turns.</p><div class="rule"></div><p>Drag any outer edge or corner to begin again.</p>`;
      return page;
    }
  }
];

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing application root");

const engine = new FlipbookEngine(app, {
  pages,
  initialPage: 0,
  pageWidth: 720,
  pageHeight: 1016,
  turnDuration: 285,
  autoplayInterval: 3000,
  spreadBreakpoint: 760,
  preloadRadius: 3,
  maxCachedPages: 10,
  curvature: "multi-band"
});

Object.assign(window, { paperfold: engine });
