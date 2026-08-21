import { describe, expect, test } from "bun:test";

describe("platform", () => {
  test("does not import the cookie package", async () => {
    const source = await Bun.file(new URL("./src/platform.ts", import.meta.url)).text();
    expect(source).not.toMatch(/from ['"]cookie['"]/);
  });

  test("exports getRequest and setResponse only", async () => {
    const platform = await import("./src/platform.ts");
    expect(Object.keys(platform).sort()).toEqual(["getRequest", "setResponse"]);
  });
});
