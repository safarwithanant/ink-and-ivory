import express, { type Express, type Request, type Response } from "express";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe payment processing is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export function isStripeTestEvent(eventId: string) {
  return eventId.startsWith("evt_test_");
}

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || Array.isArray(signature) || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: "Missing Stripe webhook signature." });
    }

    let event: Stripe.Event;
    try {
      event = getStripeClient().webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      console.warn("[Stripe webhook] Signature verification failed", error instanceof Error ? error.message : "Unknown error");
      return res.status(400).json({ error: "Invalid Stripe webhook signature." });
    }

    if (isStripeTestEvent(event.id)) {
      console.log("[Stripe webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[Stripe webhook] Checkout completed", { eventId: event.id, sessionId: session.id, customerId: session.customer, userId: session.metadata?.user_id });
    }

    return res.json({ received: true });
  });
}
