// Vercel builds this entrypoint after the production bundle is emitted.
// @ts-expect-error The generated CommonJS bundle is created by pnpm build.
import { createApp } from "../dist/server-app.cjs";

export default createApp();
