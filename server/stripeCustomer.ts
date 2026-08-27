import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";
import * as db from "./db";
import { getStripeClient } from "./stripe";

type CustomerUser = Pick<User, "id" | "name" | "email" | "stripeCustomerId">;

export async function ensureStripeCustomer(user: CustomerUser) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await getStripeClient().customers.create({
    email: user.email || undefined,
    name: user.name || undefined,
    metadata: { user_id: user.id.toString() },
  });
  await db.setUserStripeCustomerId(user.id, customer.id);
  return customer.id;
}

export async function getSafePaymentMethods(user: CustomerUser) {
  const customerId = await ensureStripeCustomer(user);
  const stripe = getStripeClient();
  const [customer, methods] = await Promise.all([
    stripe.customers.retrieve(customerId),
    stripe.paymentMethods.list({ customer: customerId, type: "card" }),
  ]);
  const defaultPaymentMethod = !customer.deleted && typeof customer.invoice_settings.default_payment_method === "string"
    ? customer.invoice_settings.default_payment_method
    : undefined;

  return methods.data.flatMap(method => method.card ? [{
    id: method.id,
    brand: method.card.brand,
    last4: method.card.last4,
    expMonth: method.card.exp_month,
    expYear: method.card.exp_year,
    isDefault: method.id === defaultPaymentMethod,
  }] : []);
}

async function assertCustomerPaymentMethod(customerId: string, paymentMethodId: string) {
  const method = await getStripeClient().paymentMethods.retrieve(paymentMethodId);
  if (method.customer !== customerId || method.type !== "card") {
    throw new TRPCError({ code: "FORBIDDEN", message: "That payment method is not available on this profile." });
  }
}

export async function setDefaultStripePaymentMethod(user: CustomerUser, paymentMethodId: string) {
  const customerId = await ensureStripeCustomer(user);
  await assertCustomerPaymentMethod(customerId, paymentMethodId);
  await getStripeClient().customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
}

export async function detachStripePaymentMethod(user: CustomerUser, paymentMethodId: string) {
  const customerId = await ensureStripeCustomer(user);
  await assertCustomerPaymentMethod(customerId, paymentMethodId);
  await getStripeClient().paymentMethods.detach(paymentMethodId);
}

export async function createStripeCustomerPortal(user: CustomerUser, returnUrl: string) {
  const customerId = await ensureStripeCustomer(user);
  return getStripeClient().billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}
