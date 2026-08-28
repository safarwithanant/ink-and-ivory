import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { registerStripeWebhook } from "./stripe";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

/**
 * Build the shared HTTP application used by local development and Vercel.
 * Static files are intentionally handled by the hosting layer on Vercel;
 * the local bootstrap adds its own Vite/static middleware afterward.
 */
export function createApp() {
  const app = express();

  // Stripe signatures must be verified against the unparsed request body.
  registerStripeWebhook(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
