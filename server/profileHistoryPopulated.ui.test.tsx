/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ loading: false, isAuthenticated: true, user: { name: "Anant", email: "anant@example.com" } }) }));
vi.mock("@/lib/trpc", () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  const query = (data: unknown) => () => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });
  return {
    trpc: {
      useUtils: () => ({ profile: { addresses: { invalidate: vi.fn() }, paymentMethods: { invalidate: vi.fn() }, savedBooks: { invalidate: vi.fn() } } }),
      profile: {
        addresses: { useQuery: query([]) }, paymentMethods: { useQuery: query([]) },
        orders: { useQuery: query([{ id: 7, fulfillmentStatus: "packed", createdAt: new Date("2026-08-26"), items: [{ bookId: "quiet-architect", quantity: 1 }] }]) },
        savedBooks: { useQuery: query([{ id: 2, userId: 1, bookId: "after-last-train", createdAt: new Date("2026-08-26") }]) },
        addAddress: { useMutation: mutation }, updateAddress: { useMutation: mutation }, removeAddress: { useMutation: mutation }, setDefaultAddress: { useMutation: mutation }, setDefaultPaymentMethod: { useMutation: mutation }, removePaymentMethod: { useMutation: mutation }, removeSavedBook: { useMutation: mutation }, createPaymentPortal: { useMutation: mutation },
      },
    },
  };
});

import ProfilePage from "../client/src/pages/ProfilePage";
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("populated profile history and wishlist", () => {
  it("renders fulfilled purchase details and saved titles in their dedicated profile tabs", async () => {
    window.localStorage.clear();
    const { hook } = memoryLocation({ path: "/profile" });
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => { root.render(<Router hook={hook}><ProfilePage /></Router>); });
    const tabs = Array.from(container.querySelectorAll(".profile-tabs button")) as HTMLButtonElement[];
    await act(async () => tabs.find(tab => tab.textContent?.includes("Order history"))?.click());
    expect(container.textContent).toContain("Order #00007");
    expect(container.textContent).toContain("Carefully packed");
    expect(container.textContent).toContain("The Quiet Architect");
    const buyAgain = container.querySelector('[aria-label="Buy again order 00007"]') as HTMLButtonElement;
    await act(async () => buyAgain.click());
    expect(JSON.parse(window.localStorage.getItem("ink-and-ivory-bag") || "{}" )).toEqual({ "quiet-architect": 1 });
    await act(async () => tabs.find(tab => tab.textContent?.includes("Saved books"))?.click());
    expect(container.textContent).toContain("After the Last Train");
    expect(container.querySelector('[aria-label="Remove After the Last Train from saved books"]')).toBeTruthy();
    const addToBag = container.querySelector('[aria-label="Add After the Last Train to bag"]') as HTMLButtonElement;
    await act(async () => addToBag.click());
    expect(JSON.parse(window.localStorage.getItem("ink-and-ivory-bag") || "{}" )).toEqual({ "quiet-architect": 1, "after-last-train": 1 });
    await act(async () => root.unmount());
  });
});
