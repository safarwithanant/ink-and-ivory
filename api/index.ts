import { createApp } from "../server/app";

/**
 * Vercel treats this file as a Node.js Function. The rewrite in vercel.json
 * forwards every /api/* request here while preserving the original path for
 * Express route matching.
 */
export default createApp();
