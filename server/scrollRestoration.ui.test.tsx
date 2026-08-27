/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ScrollToTop } from "../client/src/components/ScrollToTop";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ScrollToTop", () => {
  it("restores the viewport to the top after router navigation", async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", { configurable: true, value: scrollTo });
    const { hook, navigate } = memoryLocation({ path: "/", record: true });
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(<Router hook={hook}><ScrollToTop /></Router>);
    });
    scrollTo.mockClear();

    await act(async () => {
      navigate("/book/quiet-architect");
    });

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    await act(async () => root.unmount());
  });
});
