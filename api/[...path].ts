import { createApp } from "../server/app";

/**
 * Vercel's catch-all Function forwards every `/api/*` request to the shared
 * Express application. Static frontend assets remain handled by the Vercel
 * build output and CDN.
 */
const app = createApp();

export default app;
