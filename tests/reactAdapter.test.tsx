// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FlipbookSnapshot, PageDefinition } from "../src/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const engineState = vi.hoisted(() => {
  const instances: MockEngine[] = [];
  class MockEngine {
    snapshot: FlipbookSnapshot = { currentPage: 0, displayMode: "spread", phase: "idle", zoom: 1 };
    listener?: (snapshot: FlipbookSnapshot) => void;
    destroy = vi.fn();
    next = vi.fn();
    previous = vi.fn();
    first = vi.fn();
    last = vi.fn();
    goToPage = vi.fn();
    setZoom = vi.fn();
    startAutoplay = vi.fn();
    stopAutoplay = vi.fn();
    constructor(public root: HTMLElement, public options: unknown) { instances.push(this); }
    onChange(listener: (snapshot: FlipbookSnapshot) => void) {
      this.listener = listener;
      return vi.fn();
    }
  }
  return { instances, MockEngine };
});

vi.mock("../src/core/FlipbookEngine", () => ({ FlipbookEngine: engineState.MockEngine }));

import { Paperfold, type PaperfoldHandle } from "../src/react";

const pages: PageDefinition[] = [{
  title: "Cover",
  section: "Opening",
  render: () => document.createElement("article")
}];

afterEach(() => {
  document.body.replaceChildren();
  engineState.instances.length = 0;
});

describe("Paperfold React adapter", () => {
  it("creates one engine, forwards commands, and cleans it up", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const handle = createRef<PaperfoldHandle>();

    await act(async () => root.render(<Paperfold ref={handle} pages={pages} />));
    expect(engineState.instances).toHaveLength(1);
    handle.current?.next();
    handle.current?.goToPage(4);
    expect(engineState.instances[0].next).toHaveBeenCalledOnce();
    expect(engineState.instances[0].goToPage).toHaveBeenCalledWith(4);

    await act(async () => root.unmount());
    expect(engineState.instances[0].destroy).toHaveBeenCalledOnce();
  });

  it("forwards initial and subscribed snapshots without rebuilding for callback changes", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const firstListener = vi.fn();
    const secondListener = vi.fn();

    await act(async () => root.render(<Paperfold pages={pages} onChange={firstListener} />));
    expect(firstListener).toHaveBeenCalledWith(engineState.instances[0].snapshot);
    await act(async () => root.render(<Paperfold pages={pages} onChange={secondListener} />));
    expect(engineState.instances).toHaveLength(1);

    const changed = { ...engineState.instances[0].snapshot, currentPage: 1 };
    await act(async () => engineState.instances[0].listener?.(changed));
    expect(secondListener).toHaveBeenCalledWith(changed);
    await act(async () => root.unmount());
  });
});
