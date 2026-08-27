import { describe, expect, it } from "vitest";
import { addressInputSchema } from "./profileValidation";

describe("saved shipping address validation", () => {
  const validAddress = { label: "Home", fullName: "Anant Sharma", line1: "42 Library Road", line2: null, city: "Pune", state: "Maharashtra", postalCode: "411001", country: "IN" as const, phone: "+919876543210", isDefault: true };

  it("accepts validated Indian shipping-address fields", () => {
    expect(addressInputSchema.parse(validAddress)).toMatchObject(validAddress);
  });

  it("rejects unexpected or malformed address data", () => {
    expect(() => addressInputSchema.parse({ ...validAddress, country: "US" })).toThrow();
    expect(() => addressInputSchema.parse({ ...validAddress, cardNumber: "4242424242424242" })).toThrow();
  });
});
