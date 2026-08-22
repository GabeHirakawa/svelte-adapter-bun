import { describe, expect, test } from "bun:test";

describe("adapter ambient types", () => {
  test("references bun-types so Bun.redis and other globals are in scope", async () => {
    const ambient = await Bun.file(new URL("./ambient.d.ts", import.meta.url)).text();
    expect(ambient).toMatch(/\/\/\/\s*<reference types="bun-types"\s*\/>/);
    expect(ambient).toContain("interface Platform");
    expect(ambient).toContain("server: Bun.Server");
    expect(ambient).toContain("request: Request");
  });

  test("README tells apps to reference the adapter instead of copying Platform", async () => {
    const readme = await Bun.file(new URL("./README.md", import.meta.url)).text();
    expect(readme).toContain('/// <reference types="@gkh/svelte-adapter-bun" />');
    expect(readme).toContain("Bun.redis");
    expect(readme).not.toMatch(
      /Declare it on `App\.Platform` in `src\/app\.d\.ts`:\s*```ts\s*declare global/,
    );
  });
});
