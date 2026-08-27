import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {}, get: () => "ink-ivory.example" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("profile router security", () => {
  it("requires authentication before reading saved addresses or payment methods", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.profile.addresses()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.profile.paymentMethods()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
