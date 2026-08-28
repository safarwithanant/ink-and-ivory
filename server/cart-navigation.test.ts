import { describe, expect, it } from "vitest";
import { getCartItemCount, mergeCartItems, updateCartItemQuantity } from "../client/src/lib/cart";
import { resetRouteScroll } from "../client/src/lib/navigation";

describe("cart state", () => {
  it("adds, caps, and removes selected book quantities", () => {
    let cart = updateCartItemQuantity({}, "quiet-architect", 1);
    cart = updateCartItemQuantity(cart, "quiet-architect", 12);
    expect(cart).toEqual({ "quiet-architect": 10 });
    expect(getCartItemCount(cart)).toBe(10);
    cart = updateCartItemQuantity(cart, "quiet-architect", -10);
    expect(cart).toEqual({});
  });

  it("merges saved and previously purchased titles without exceeding the title cap", () => {
    const cart = mergeCartItems({ "quiet-architect": 9 }, [
      { bookId: "quiet-architect", quantity: 1 },
      { bookId: "after-last-train", quantity: 2 },
    ]);
    expect(cart).toEqual({ "quiet-architect": 10, "after-last-train": 2 });
  });
});

describe("route scroll restoration", () => {
  it("returns the viewport to the top after a route change", () => {
    const calls: Array<[number, number]> = [];
    resetRouteScroll({ scrollTo: (x, y) => calls.push([x, y]) });
    expect(calls).toEqual([[0, 0]]);
  });
});
