/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false, error: null, isAuthenticated: false, logout: vi.fn() }),
}));
vi.mock("@/lib/trpc", () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    trpc: {
      useUtils: () => ({ profile: { savedBooks: { invalidate: vi.fn() } } }),
      profile: {
        savedBooks: { useQuery: () => ({ data: [], isLoading: false, isError: false, error: null }) },
        saveBook: { useMutation: mutation },
        removeSavedBook: { useMutation: mutation },
      },
    },
  };
});

import Home from "../client/src/pages/Home";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("profile navigation", () => {
  it("routes the desktop profile control to the protected profile page", async () => {
    const { hook, history } = memoryLocation({ path: "/", record: true });
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => { root.render(<Router hook={hook}><Home /></Router>); });
    const profileButton = container.querySelector('[aria-label="Open customer profile"]') as HTMLButtonElement;
    expect(profileButton).toBeTruthy();
    await act(async () => { profileButton.click(); });
    expect(history).toContain("/profile");
    await act(async () => root.unmount());
  });

  it("gives a wrapped mobile navigation label and its arrow separate rendered elements", async () => {
    const { hook } = memoryLocation({ path: "/" });
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => { root.render(<Router hook={hook}><Home /></Router>); });
    await act(async () => (container.querySelector('[aria-label="Open menu"]') as HTMLButtonElement).click());
    const longLabel = Array.from(container.querySelectorAll(".mobile-menu nav button")).find(button => button.textContent?.includes("New arrivals"));
    expect(longLabel?.querySelector(".mobile-menu__item b")?.textContent).toBe("New arrivals");
    expect(longLabel?.querySelector("svg")).toBeTruthy();
    await act(async () => root.unmount());
  });
});
