import { describe, expect, it } from "vitest";
import { books, categoryMeta, categoryToSlug, filterCategoryBooks, getBookById, getBookDetailPath, getCategoryFromSlug, getRelatedBooks, resolveBookDetailPath } from "../client/src/data/catalog";

function searchCatalog(query: string) {
  const normalized = query.trim().toLowerCase();
  return books.filter(book =>
    [book.title, book.author, book.category, book.isbn, ...book.keywords].some(value => value.toLowerCase().includes(normalized)),
  );
}

function incrementCart(cart: Record<string, number>, bookId: string) {
  return { ...cart, [bookId]: (cart[bookId] || 0) + 1 };
}

function decrementCart(cart: Record<string, number>, bookId: string) {
  const nextQuantity = (cart[bookId] || 0) - 1;
  if (nextQuantity <= 0) {
    const { [bookId]: _, ...remaining } = cart;
    return remaining;
  }
  return { ...cart, [bookId]: nextQuantity };
}

describe("INK & IVORY storefront catalogue", () => {
  it("maps every supported category to a stable browseable route", () => {
    expect(categoryToSlug("Mystery & Thriller")).toBe("mystery-and-thriller");
    expect(getCategoryFromSlug("mystery-and-thriller")).toBe("Mystery & Thriller");
    const catalogueCategories = new Set(books.map(book => book.category));
    Object.keys(categoryMeta).forEach(category => {
      expect(catalogueCategories.has(category)).toBe(true);
      expect(getCategoryFromSlug(categoryToSlug(category))).toBe(category);
    });
  });

  it("filters an individual category shelf without showing another category's books", () => {
    expect(filterCategoryBooks("Fiction", "noah").map(book => book.id)).toEqual(["after-last-train"]);
    expect(filterCategoryBooks("Fiction", "").map(book => book.id)).toEqual(["after-last-train", "room-sunlight"]);
    expect(filterCategoryBooks("Fiction", "observatory")).toEqual([]);
  });

  it("resolves individual titles and returns distinct related books", () => {
    const book = getBookById("quiet-architect");
    expect(book?.title).toBe("The Quiet Architect");
    expect(getBookById("missing-title")).toBeUndefined();
    expect(book && getRelatedBooks(book).every(related => related.id !== book.id)).toBe(true);
    expect(book && getRelatedBooks(book)[0]?.category).toBe(book.category);
  });

  it("resolves valid book detail paths and rejects malformed or unknown detail paths", () => {
    expect(getBookDetailPath({ id: "quiet-architect" })).toBe("/book/quiet-architect");
    expect(resolveBookDetailPath("/book/quiet-architect")?.title).toBe("The Quiet Architect");
    expect(resolveBookDetailPath("/book/missing-title")).toBeUndefined();
    expect(resolveBookDetailPath("/category/psychology")).toBeUndefined();
    expect(resolveBookDetailPath("/book/quiet-architect/extra")).toBeUndefined();
  });

  it("searches titles, authors, categories, ISBNs, and keywords", () => {
    expect(searchCatalog("psychology").map(book => book.id)).toEqual(expect.arrayContaining(["quiet-architect", "human-pattern"]));
    expect(searchCatalog("Elias Rowan")[0]?.id).toBe("quiet-architect");
    expect(searchCatalog("978-81-963482-7-9")[0]?.id).toBe("midnight-march");
    expect(searchCatalog("observatory")[0]?.id).toBe("midnight-march");
  });

  it("increments a bag item and removes it once the quantity returns to zero", () => {
    const afterOne = incrementCart({}, "quiet-architect");
    const afterTwo = incrementCart(afterOne, "quiet-architect");
    expect(afterTwo).toEqual({ "quiet-architect": 2 });
    expect(decrementCart(afterTwo, "quiet-architect")).toEqual({ "quiet-architect": 1 });
    expect(decrementCart({ "quiet-architect": 1 }, "quiet-architect")).toEqual({});
  });
});
