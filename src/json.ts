import type { PageDefinition } from "./types";

export type JsonPageBlock =
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "divider" };

export interface JsonPage {
  title: string;
  section?: string;
  className?: string;
  blocks: JsonPageBlock[];
}

export interface JsonFlipbookDocument {
  title?: string;
  pages: JsonPage[];
}

export interface JsonAdapterOptions {
  pageClassName?: string;
  imageLoading?: "eager" | "lazy";
}

const appendText = (element: HTMLElement, text: string): HTMLElement => {
  element.textContent = text;
  return element;
};

const renderBlock = (block: JsonPageBlock, imageLoading: "eager" | "lazy"): HTMLElement => {
  switch (block.type) {
    case "heading": {
      const heading = document.createElement(`h${block.level ?? 2}`);
      heading.className = "paperfold-json-heading";
      return appendText(heading, block.text);
    }
    case "paragraph":
      return appendText(document.createElement("p"), block.text);
    case "quote": {
      const quote = document.createElement("blockquote");
      quote.append(appendText(document.createElement("p"), block.text));
      if (block.attribution) quote.append(appendText(document.createElement("cite"), block.attribution));
      return quote;
    }
    case "image": {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.src = block.src;
      image.alt = block.alt;
      image.loading = imageLoading;
      image.draggable = false;
      figure.append(image);
      if (block.caption) figure.append(appendText(document.createElement("figcaption"), block.caption));
      return figure;
    }
    case "list": {
      const list = document.createElement(block.ordered ? "ol" : "ul");
      for (const item of block.items) list.append(appendText(document.createElement("li"), item));
      return list;
    }
    case "divider":
      return document.createElement("hr");
  }
};

export const createPagesFromJson = (
  input: JsonFlipbookDocument,
  options: JsonAdapterOptions = {}
): PageDefinition[] => input.pages.map((page) => ({
  title: page.title,
  section: page.section ?? input.title ?? "Document",
  render: () => {
    const article = document.createElement("article");
    article.className = ["paperfold-json-page", options.pageClassName, page.className]
      .filter(Boolean)
      .join(" ");
    for (const block of page.blocks) article.append(renderBlock(block, options.imageLoading ?? "lazy"));
    return article;
  }
}));
