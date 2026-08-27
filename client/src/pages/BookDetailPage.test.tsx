import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import BookDetailPage from "./BookDetailPage";

function renderBookDetailAt(path: string) {
  return renderToStaticMarkup(
    <Router ssrPath={path}>
      <BookDetailPage />
    </Router>,
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
