import { describe, expect, it } from "vitest";
import { getCheckoutProducts } from "./products";
import { isStripeTestEvent } from "./stripe";
import { toStripeShippingAddress } from "./checkoutAddress";
import { createCheckoutSessionParams } from "./checkoutSession";

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

  it("formats the customer default address as Stripe shipping details without exposing payment data", () => {
    expect(toStripeShippingAddress({ fullName: "Anant Kumar", phone: "+919999999999", line1: "14 Reader Lane", line2: null, city: "Pune", state: "Maharashtra", postalCode: "411001", country: "IN" })).toEqual({ name: "Anant Kumar", phone: "+919999999999", address: { line1: "14 Reader Lane", line2: undefined, city: "Pune", state: "Maharashtra", postal_code: "411001", country: "IN" } });
  });

  it("carries the default address identifier into the exact server-created Stripe Checkout session", () => {
    const entries = getCheckoutProducts([{ bookId: "quiet-architect", quantity: 1 }]);
    const session = createCheckoutSessionParams({ origin: "https://inkandivory.example", customerId: "cus_reader", user: { id: 7, email: "reader@example.com", name: "Reader" }, entries, defaultAddressId: 23 });
    expect(session.customer_update).toEqual({ shipping: "auto", name: "auto" });
    expect(session.metadata?.shipping_address_id).toBe("23");
    expect(session.success_url).toContain("/checkout/success");
  });
});
