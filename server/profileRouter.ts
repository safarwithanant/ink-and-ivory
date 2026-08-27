import { z } from "zod";
import * as db from "./db";
import { getCheckoutProducts } from "./products";
import { addressInputSchema } from "./profileValidation";
import { createStripeCustomerPortal, detachStripePaymentMethod, getSafePaymentMethods, setDefaultStripePaymentMethod } from "./stripeCustomer";
import { protectedProcedure, router } from "./_core/trpc";

const addressIdInput = z.object({ id: z.number().int().positive() });
const paymentMethodInput = z.object({ paymentMethodId: z.string().min(1).max(255) });

function requestOrigin(request: { headers: { origin?: string }; protocol: string; get: (name: string) => string | undefined }) {
  return request.headers.origin || `${request.protocol}://${request.get("host")}`;
}

export const profileRouter = router({
  addresses: protectedProcedure.query(({ ctx }) => db.listShippingAddresses(ctx.user.id)),
  addAddress: protectedProcedure.input(addressInputSchema).mutation(async ({ ctx, input }) => {
    await db.createShippingAddress(ctx.user.id, input);
    return { success: true } as const;
  }),
  updateAddress: protectedProcedure.input(addressIdInput.extend({ address: addressInputSchema })).mutation(async ({ ctx, input }) => {
    await db.updateShippingAddress(ctx.user.id, input.id, input.address);
    return { success: true } as const;
  }),
  removeAddress: protectedProcedure.input(addressIdInput).mutation(async ({ ctx, input }) => {
    await db.deleteShippingAddress(ctx.user.id, input.id);
    return { success: true } as const;
  }),
  setDefaultAddress: protectedProcedure.input(addressIdInput).mutation(async ({ ctx, input }) => {
    await db.setDefaultShippingAddress(ctx.user.id, input.id);
    return { success: true } as const;
  }),
  paymentMethods: protectedProcedure.query(({ ctx }) => getSafePaymentMethods(ctx.user)),
  setDefaultPaymentMethod: protectedProcedure.input(paymentMethodInput).mutation(async ({ ctx, input }) => {
    await setDefaultStripePaymentMethod(ctx.user, input.paymentMethodId);
    return { success: true } as const;
  }),
  removePaymentMethod: protectedProcedure.input(paymentMethodInput).mutation(async ({ ctx, input }) => {
    await detachStripePaymentMethod(ctx.user, input.paymentMethodId);
    return { success: true } as const;
  }),
  createPaymentPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const session = await createStripeCustomerPortal(ctx.user, `${requestOrigin(ctx.req)}/profile`);
    return { url: session.url };
  }),
  orders: protectedProcedure.query(({ ctx }) => db.listOrdersForUser(ctx.user.id)),
  savedBooks: protectedProcedure.query(({ ctx }) => db.listSavedBooks(ctx.user.id)),
  saveBook: protectedProcedure.input(z.object({ bookId: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    getCheckoutProducts([{ bookId: input.bookId, quantity: 1 }]);
    await db.saveBook(ctx.user.id, input.bookId);
    return { success: true } as const;
  }),
  removeSavedBook: protectedProcedure.input(z.object({ bookId: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    await db.removeSavedBook(ctx.user.id, input.bookId);
    return { success: true } as const;
  }),
});
