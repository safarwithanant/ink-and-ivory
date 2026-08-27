import { describe, expect, it } from "vitest";
import { getCheckoutProducts } from "./products";
import { isStripeTestEvent } from "./stripe";

describe("book checkout catalog", () => {
  it("uses server-owned prices and combines duplicate book selections", () => {
    const entries = getCheckoutProducts([
      { bookId: "quiet-architect", quantity: 1 },
      { bookId: "quiet-architect", quantity: 2 },
      { bookId: "after-last-train", quantity: 1 },
    ]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ bookId: "quiet-architect", quantity: 3, product: { unitAmount: 59900 } });
  });

  it("rejects unavailable items and only recognizes dedicated Stripe test events", () => {
    expect(() => getCheckoutProducts([{ bookId: "not-a-book", quantity: 1 }])).toThrow("no longer available");
    expect(isStripeTestEvent("evt_test_checkout")).toBe(true);
    expect(isStripeTestEvent("evt_live_checkout")).toBe(false);
  });
});
