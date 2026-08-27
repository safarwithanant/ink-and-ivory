import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getCheckoutProducts } from "./products";
import { getDefaultShippingAddress } from "./db";
import { toStripeShippingAddress } from "./checkoutAddress";
import { createCheckoutSessionParams } from "./checkoutSession";
import { getStripeClient } from "./stripe";
import { ensureStripeCustomer } from "./stripeCustomer";
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
      const customerId = await ensureStripeCustomer(ctx.user);
      const defaultAddress = await getDefaultShippingAddress(ctx.user.id);
      if (defaultAddress) {
        await getStripeClient().customers.update(customerId, {
          shipping: toStripeShippingAddress(defaultAddress),
        });
      }
      session = await getStripeClient().checkout.sessions.create(createCheckoutSessionParams({ origin, customerId, user: ctx.user, entries, defaultAddressId: defaultAddress?.id }));
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
