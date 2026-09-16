export interface BookItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  pdfUrl: string;
  splitSpreads?: boolean;
  pageCount?: number;
  badge?: string;
  year?: string;
  thumbnailUrl?: string;
}

export interface LibrarySection {
  id: string;
  title: string;
  description?: string;
  books: BookItem[];
}

export const LIBRARY_CONFIG = {
  brandName: "ALUFURN",
  websiteUrl: "https://www.alufurn.com",
  websiteLabel: "Visit our website",
  logoSrc: "alufurn-logo.png",
  sections: [
    {
      id: "product-catalogues",
      title: "Product Catalogues",
      description: "Browse our signature architectural outdoor furniture collections, premium living spaces, and luxury craft.",
      books: [
        {
          id: "alufurn-catalogue",
          title: "ALUFURN Catalogue",
          subtitle: "Luxury Outdoor Living Collection",
          description: "Discover handcrafted pergolas, modular outdoor lounges, bespoke dining sets, and architectural aluminium systems.",
          pdfUrl: "ALUFURN Catalogue.pdf",
          splitSpreads: true,
          badge: "Current Edition",
          year: "2025 / 2026",
          thumbnailUrl: "thumbnails/alufurn-catalogue.jpg"
        }
      ]
    }
  ] as LibrarySection[]
};

export const getBookById = (id: string): BookItem | undefined => {
  for (const section of LIBRARY_CONFIG.sections) {
    const found = section.books.find((b) => b.id === id);
    if (found) return found;
  }
  return undefined;
};
