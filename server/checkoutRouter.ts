import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getCheckoutProducts } from "./products";
import { getStripeClient } from "./stripe";
import { protectedProcedure, router } from "./_core/trpc";

const checkoutInput = z.object({
  items: z.array(z.object({ bookId: z.string().min(1), quantity: z.number().int().min(1).max(10) })).min(1).max(18),
});

export const checkoutRouter = router({
  createSession: protectedProcedure.input(checkoutInput).mutation(async ({ ctx, input }) => {
    const entries = getCheckoutProducts(input.items);
    const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get("host")}`;
    if (!origin || origin.includes("undefined")) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not determine a secure checkout return address." });
    }

    let session;
    try {
      session = await getStripeClient().checkout.sessions.create({
        mode: "payment",
        client_reference_id: ctx.user.id.toString(),
        customer_email: ctx.user.email || undefined,
        allow_promotion_codes: true,
        billing_address_collection: "required",
        shipping_address_collection: { allowed_countries: ["IN"] },
        phone_number_collection: { enabled: true },
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
          cart_item_ids: entries.map(entry => entry.bookId).join(","),
        },
        line_items: entries.map(({ product, quantity }) => ({
          quantity,
          price_data: {
            currency: "inr",
            unit_amount: product.unitAmount,
            product_data: { name: product.name, description: product.description },
          },
        })),
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/cancel`,
      });
    } catch (error) {
      console.error("[Stripe checkout] Session creation failed", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to start secure checkout. Please try again." });
    }

    if (!session.url) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe did not return a checkout link." });
    }
    return { url: session.url };
  }),
});
