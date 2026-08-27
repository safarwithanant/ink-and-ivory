import type Stripe from "stripe";
import type { getCheckoutProducts } from "./products";
import { encodePurchasedBooks } from "./orderUtils";

type CheckoutEntry = ReturnType<typeof getCheckoutProducts>[number];
type CheckoutUser = { id: number; email: string | null; name: string | null };

export function createCheckoutSessionParams(input: { origin: string; customerId: string; user: CheckoutUser; entries: CheckoutEntry[]; defaultAddressId?: number }): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    client_reference_id: input.user.id.toString(),
    customer: input.customerId,
    allow_promotion_codes: true,
    billing_address_collection: "required",
    shipping_address_collection: { allowed_countries: ["IN"] },
    customer_update: { shipping: "auto", name: "auto" },
    phone_number_collection: { enabled: true },
    metadata: {
      user_id: input.user.id.toString(),
      customer_email: input.user.email || "",
      customer_name: input.user.name || "",
      cart_item_ids: input.entries.map(entry => entry.bookId).join(","),
      cart_items: encodePurchasedBooks(input.entries.map(entry => ({ bookId: entry.bookId, quantity: entry.quantity }))),
      shipping_address_id: input.defaultAddressId?.toString() || "",
    },
    line_items: input.entries.map(({ product, quantity }) => ({ quantity, price_data: { currency: "inr", unit_amount: product.unitAmount, product_data: { name: product.name, description: product.description } } })),
    success_url: `${input.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/checkout/cancel`,
  };
}
