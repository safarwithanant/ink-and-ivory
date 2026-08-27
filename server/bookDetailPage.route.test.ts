import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false, error: null, isAuthenticated: false, logout: vi.fn() }),
}));
vi.mock("@/lib/trpc", () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return { trpc: { useUtils: () => ({ profile: { savedBooks: { invalidate: vi.fn() } } }), profile: { savedBooks: { useQuery: () => ({ data: [], isLoading: false, isError: false, error: null }) }, saveBook: { useMutation: mutation }, removeSavedBook: { useMutation: mutation } } } };
});

import BookDetailPage from "../client/src/pages/BookDetailPage";

function renderBookDetailAt(path: string) {
  return renderToStaticMarkup(
    createElement(
      Router,
      { ssrPath: path },
      createElement(BookDetailPage),
    ),
  );
}

describe("BookDetailPage route states", () => {
  it("renders the selected title for a valid detail URL", () => {
    const markup = renderBookDetailAt("/book/quiet-architect");
    expect(markup).toContain("The Quiet Architect");
    expect(markup).toContain("Back to Psychology");
    expect(markup).toContain("Verified reviews");
  });

  it("renders the book-detail not-found state for an unknown title URL", () => {
    const markup = renderBookDetailAt("/book/missing-title");
    expect(markup).toContain("That title is not on this shelf.");
    expect(markup).not.toContain("The Quiet Architect");
  });
});
