import { LIBRARY_CONFIG, type BookItem, type LibrarySection } from "./books";
import { generateCoverThumbnail } from "./thumbnail";

interface LibraryViewOptions {
  onSelectBook: (bookId: string) => void;
}

export class LibraryView {
  private container: HTMLElement;
  private options: LibraryViewOptions;

  constructor(container: HTMLElement, options: LibraryViewOptions) {
    this.container = container;
    this.options = options;
  }

  public render(): void {
    this.container.innerHTML = "";
    this.container.className = "library-page-wrapper";

    const header = this.buildHeader();
    const main = document.createElement("main");
    main.className = "library-main-content";

    const hero = this.buildHero();
    main.append(hero);

    const sectionsContainer = document.createElement("div");
    sectionsContainer.className = "library-sections-container";

    LIBRARY_CONFIG.sections.forEach((section) => {
      const sectionEl = this.buildSection(section);
      sectionsContainer.append(sectionEl);
    });

    main.append(sectionsContainer);

    const footer = this.buildFooter();

    this.container.append(header, main, footer);
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement("header");
    header.className = "library-header";

    header.innerHTML = `
      <div class="library-header-inner">
        <div class="library-brand">
          <a href="#" class="library-logo-link" title="ALUFURN Home" aria-label="ALUFURN Home">
            <img 
              src="${import.meta.env.BASE_URL}${LIBRARY_CONFIG.logoSrc}" 
              alt="ALUFURN Logo" 
              class="library-header-logo"
            />
          </a>
        </div>
        <div class="library-header-actions">
          <a 
            href="${LIBRARY_CONFIG.websiteUrl}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="library-website-link"
            title="Visit ALUFURN official website"
          >
            <span>${LIBRARY_CONFIG.websiteLabel}</span>
            <svg class="external-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </div>
    `;

    return header;
  }

  private buildHero(): HTMLElement {
    const hero = document.createElement("section");
    hero.className = "library-hero";
    hero.innerHTML = `
      <div class="hero-eyebrow">
        <span class="hero-dot"></span>
        <span>Architectural Outdoor Living</span>
      </div>
      <h1 class="hero-title">Publications & Digital Catalogues</h1>
      <p class="hero-description">
        Experience our interactive, tactile digital lookbooks featuring luxury pergolas, bespoke outdoor kitchens, and modular architectural systems.
      </p>
    `;
    return hero;
  }

  private buildSection(section: LibrarySection): HTMLElement {
    const sectionEl = document.createElement("section");
    sectionEl.className = "library-section";
    sectionEl.setAttribute("aria-labelledby", `section-${section.id}`);

    const header = document.createElement("div");
    header.className = "section-heading-block";
    header.innerHTML = `
      <div class="section-title-wrap">
        <h2 id="section-${section.id}" class="section-title">${section.title}</h2>
        ${section.description ? `<p class="section-description">${section.description}</p>` : ""}
      </div>
      <div class="section-count-badge">${section.books.length} Available</div>
    `;
    sectionEl.append(header);

    const grid = document.createElement("div");
    grid.className = "library-books-grid";

    section.books.forEach((book) => {
      const card = this.buildBookCard(book);
      grid.append(card);
    });

    // Add a future book placeholder to showcase upcoming publications
    const comingSoonCard = document.createElement("div");
    comingSoonCard.className = "book-card book-card-coming-soon";
    comingSoonCard.innerHTML = `
      <div class="book-cover-preview coming-soon-cover">
        <div class="coming-soon-content">
          <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          <span>More Collections</span>
          <p>Upcoming Editions</p>
        </div>
      </div>
      <div class="book-details">
        <span class="book-badge badge-upcoming">In Preparation</span>
        <h3 class="book-title">Bespoke Living 2026</h3>
        <p class="book-desc">New architectural series and modular outdoor living lookbooks will appear here.</p>
      </div>
    `;
    grid.append(comingSoonCard);

    sectionEl.append(grid);
    return sectionEl;
  }

  private buildBookCard(book: BookItem): HTMLElement {
    const card = document.createElement("article");
    card.className = "book-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${book.title}`);

    const coverContainer = document.createElement("div");
    coverContainer.className = "book-cover-container";

    const coverWrapper = document.createElement("div");
    coverWrapper.className = "book-cover-wrapper";

    const img = document.createElement("img");
    img.className = "book-cover-image is-loading";
    img.alt = `${book.title} Cover`;
    img.draggable = false;

    // Spine and depth overlay
    const spineOverlay = document.createElement("div");
    spineOverlay.className = "book-cover-spine-effect";

    const hoverOverlay = document.createElement("div");
    hoverOverlay.className = "book-cover-hover-overlay";
    hoverOverlay.innerHTML = `
      <div class="hover-btn">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" aria-hidden="true">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
        <span>Open Flipbook</span>
      </div>
    `;

    coverWrapper.append(img, spineOverlay, hoverOverlay);
    coverContainer.append(coverWrapper);

    // Asynchronously generate thumbnail from page 1 of the book PDF
    this.loadThumbnail(book, img);

    // Book metadata details
    const details = document.createElement("div");
    details.className = "book-details";

    details.innerHTML = `
      <div class="book-meta-top">
        ${book.badge ? `<span class="book-badge">${book.badge}</span>` : ""}
        ${book.year ? `<span class="book-year">${book.year}</span>` : ""}
      </div>
      <h3 class="book-title">${book.title}</h3>
      ${book.subtitle ? `<h4 class="book-subtitle">${book.subtitle}</h4>` : ""}
      ${book.description ? `<p class="book-desc">${book.description}</p>` : ""}
      <div class="book-card-actions">
        <button type="button" class="btn-read-book">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          <span>Open Interactive Flipbook</span>
        </button>
        <a 
          href="${import.meta.env.BASE_URL}${encodeURIComponent(book.pdfUrl)}" 
          target="_blank" 
          rel="noopener noreferrer"
          class="btn-pdf-download"
          title="Download PDF version"
          download
        >
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Download PDF</span>
        </a>
      </div>
    `;

    card.append(coverContainer, details);

    // Interactions
    const openBook = (e: Event) => {
      // Don't trigger flipbook if user clicked the download link
      const target = e.target as HTMLElement | null;
      if (target && target.closest(".btn-pdf-download")) return;
      this.options.onSelectBook(book.id);
    };

    card.addEventListener("click", openBook);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openBook(e);
      }
    });

    return card;
  }

  private loadThumbnail(book: BookItem, imgEl: HTMLImageElement): void {
    // If a static thumbnail is provided, try loading it first
    if (book.thumbnailUrl) {
      const staticUrl = `${import.meta.env.BASE_URL}${book.thumbnailUrl}`;
      const tempImg = new Image();
      tempImg.src = staticUrl;
      tempImg.onload = () => {
        imgEl.src = staticUrl;
        imgEl.classList.remove("is-loading");
      };
      tempImg.onerror = () => {
        // If static thumbnail doesn't exist yet, generate dynamically from page 1 of PDF!
        this.generateAndSetThumbnail(book, imgEl);
      };
    } else {
      this.generateAndSetThumbnail(book, imgEl);
    }
  }

  private generateAndSetThumbnail(book: BookItem, imgEl: HTMLImageElement): void {
    generateCoverThumbnail(book, 540)
      .then((dataUrl) => {
        imgEl.src = dataUrl;
        imgEl.classList.remove("is-loading");
      })
      .catch((err) => {
        console.warn("Cover thumbnail generation fallback", err);
        imgEl.classList.remove("is-loading");
        imgEl.classList.add("load-failed");
      });
  }

  private buildFooter(): HTMLElement {
    const footer = document.createElement("footer");
    footer.className = "library-footer";
    footer.innerHTML = `
      <div class="library-footer-inner">
        <div class="footer-brand-row">
          <img 
            src="${import.meta.env.BASE_URL}${LIBRARY_CONFIG.logoSrc}" 
            alt="ALUFURN" 
            class="library-footer-logo"
          />
          <p class="footer-tagline">Architectural Outdoor Furniture & Craftsmanship</p>
        </div>
        <div class="footer-nav">
          <a href="${LIBRARY_CONFIG.websiteUrl}" target="_blank" rel="noopener noreferrer" class="footer-link">
            www.alufurn.com
          </a>
          <span class="footer-dot">·</span>
          <span>Digital Library Portal</span>
        </div>
        <p class="footer-copy">© ${new Date().getFullYear()} ALUFURN. All rights reserved.</p>
      </div>
    `;
    return footer;
  }
}
