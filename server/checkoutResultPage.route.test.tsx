import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import CheckoutResultPage from "../client/src/pages/CheckoutResultPage";

function renderCheckoutAt(path: string) {
  return renderToStaticMarkup(
    <Router ssrPath={path}>
      <CheckoutResultPage />
    </Router>,
  );
}

describe("CheckoutResultPage route states", () => {
  it("renders the payment confirmation state after a successful checkout", () => {
    const markup = renderCheckoutAt("/checkout/success");
    expect(markup).toContain("Payment received");
    expect(markup).toContain("Thank you for");
    expect(markup).toContain("your next chapter.");
  });

  it("renders the return-to-bag state after cancellation", () => {
    const markup = renderCheckoutAt("/checkout/cancel");
    expect(markup).toContain("Checkout paused");
    expect(markup).toContain("Your bag is still");
    expect(markup).toContain("Return to bag");
  });
});
