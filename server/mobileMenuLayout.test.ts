import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(new URL("../client/src/pages/HomeTypography.css", import.meta.url), "utf8");

describe("mobile menu arrow layout", () => {
  it("keeps navigation arrows in a dedicated right-side grid column", () => {
    expect(stylesheet).toContain(".mobile-menu nav button .mobile-menu__item { display: grid !important; grid-template-columns: 28px minmax(0, 1fr);");
    expect(stylesheet).toContain(".mobile-menu nav button > svg { grid-column: 2;");
  });
});
