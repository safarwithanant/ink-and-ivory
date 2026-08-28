# Vercel deployment notes

Sources consulted on 2026-08-28:

- https://vercel.com/docs/frameworks/backend/express
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/functions/functions-api-reference?framework=other&language=ts

Relevant guidance: Vercel deploys files under `/api` as Functions for non-Next frameworks. Express applications can be exported as a default app, but static assets should be served from `public/**` because `express.static()` is ignored by Vercel's Express integration. Node.js Function entrypoints support JavaScript and TypeScript, while path mappings may not be supported in direct TypeScript Function compilation. The project therefore uses a source `api/index.js` wrapper that requires the production-built `dist/server-app.cjs` bundle, and `vercel.json` routes `/api/*` to that Function while preserving filesystem assets and SPA fallback.
