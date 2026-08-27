import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";

const mocks = vi.hoisted(() => ({
  auth: { loading: false, isAuthenticated: false, user: null as { name?: string; email?: string } | null },
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/trpc", () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  const query = () => ({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() });
  return { trpc: { useUtils: () => ({ profile: { addresses: { invalidate: vi.fn() }, paymentMethods: { invalidate: vi.fn() }, savedBooks: { invalidate: vi.fn() } } }), profile: { addresses: { useQuery: query }, paymentMethods: { useQuery: query }, orders: { useQuery: query }, savedBooks: { useQuery: query }, addAddress: { useMutation: mutation }, updateAddress: { useMutation: mutation }, removeAddress: { useMutation: mutation }, setDefaultAddress: { useMutation: mutation }, setDefaultPaymentMethod: { useMutation: mutation }, removePaymentMethod: { useMutation: mutation }, removeSavedBook: { useMutation: mutation }, createPaymentPortal: { useMutation: mutation } } } };
});

import ProfilePage from "../client/src/pages/ProfilePage";

function renderProfile() {
  return renderToStaticMarkup(<Router ssrPath="/profile"><ProfilePage /></Router>);
}

describe("ProfilePage protected route states", () => {
  beforeEach(() => { mocks.auth = { loading: false, isAuthenticated: false, user: null }; });

  it("shows a secure sign-in gate to anonymous visitors", () => {
    const markup = renderProfile();
    expect(markup).toContain("Your reading");
    expect(markup).toContain("Sign in to continue");
  });

  it("renders the personal address and payment management sections to signed-in customers", () => {
    mocks.auth = { loading: false, isAuthenticated: true, user: { name: "Anant", email: "anant@example.com" } };
    const markup = renderProfile();
    expect(markup).toContain("Welcome back,");
    expect(markup).toContain("Where should");
    expect(markup).toContain("Manage payment methods");
  });
});
