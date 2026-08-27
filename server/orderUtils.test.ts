import { describe, expect, it } from "vitest";
import { decodePurchasedBooks, encodePurchasedBooks } from "./orderUtils";

describe("completed order metadata", () => {
  it("encodes and decodes server-validated selected books and quantities", () => {
    const items = [{ bookId: "quiet-architect", quantity: 2 }, { bookId: "after-last-train", quantity: 1 }];
    expect(decodePurchasedBooks(encodePurchasedBooks(items))).toEqual(items);
  });

  it("drops malformed payment metadata rather than creating invalid order items", () => {
    expect(decodePurchasedBooks("quiet-architect:2,unsafe:-1,bad:nope")).toEqual([{ bookId: "quiet-architect", quantity: 2 }]);
  });
});
