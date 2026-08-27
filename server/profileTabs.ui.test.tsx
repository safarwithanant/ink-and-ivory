/* @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ loading: false, isAuthenticated: true, user: { name: "Anant", email: "anant@example.com" } }) }));
vi.mock("@/lib/trpc", () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  const query = () => ({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() });
  return { trpc: { useUtils: () => ({ profile: { addresses: { invalidate: vi.fn() }, paymentMethods: { invalidate: vi.fn() }, savedBooks: { invalidate: vi.fn() } } }), profile: { addresses: { useQuery: query }, paymentMethods: { useQuery: query }, orders: { useQuery: query }, savedBooks: { useQuery: query }, addAddress: { useMutation: mutation }, updateAddress: { useMutation: mutation }, removeAddress: { useMutation: mutation }, setDefaultAddress: { useMutation: mutation }, setDefaultPaymentMethod: { useMutation: mutation }, removePaymentMethod: { useMutation: mutation }, removeSavedBook: { useMutation: mutation }, createPaymentPortal: { useMutation: mutation } } } };
});

import ProfilePage from "../client/src/pages/ProfilePage";
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("profile account tabs", () => {
  it("reveals empty order history and saved-book shelf states when the customer changes tabs", async () => {
    const { hook } = memoryLocation({ path: "/profile" });
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => { root.render(<Router hook={hook}><ProfilePage /></Router>); });
    const buttons = Array.from(container.querySelectorAll(".profile-tabs button")) as HTMLButtonElement[];
    await act(async () => buttons.find(button => button.textContent?.includes("Order history"))?.click());
    expect(container.textContent).toContain("No orders yet.");
    await act(async () => buttons.find(button => button.textContent?.includes("Saved books"))?.click());
    expect(container.textContent).toContain("Your saved shelf is empty.");
    await act(async () => root.unmount());
  });
});
