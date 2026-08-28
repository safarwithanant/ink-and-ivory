import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import apiApp from "../api/index";

let server: Server | undefined;

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server?.close(error => (error ? reject(error) : resolve()));
  });
  server = undefined;
});

describe("Vercel API entrypoint", () => {
  it("serves the public auth query through the shared Express app", async () => {
    server = createServer(apiApp);
    await new Promise<void>((resolve, reject) => {
      server?.listen(0, "127.0.0.1", () => resolve());
      server?.once("error", reject);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not expose a TCP address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/trpc/auth.me`
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      result: { data: { json: null } },
    });
  });
});
