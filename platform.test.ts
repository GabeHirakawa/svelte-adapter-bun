import { describe, expect, test } from "bun:test";
import { getRequest } from "./src/platform.ts";

describe("platform", () => {
  test("does not import the cookie package", async () => {
    const source = await Bun.file(new URL("./src/platform.ts", import.meta.url)).text();
    expect(source).not.toMatch(/from ['"]cookie['"]/);
  });

  test("exports getRequest and setResponse only", async () => {
    const platform = await import("./src/platform.ts");
    expect(Object.keys(platform).sort()).toEqual(["getRequest", "setResponse"]);
  });

  test("applies ORIGIN without keeping the listen port", async () => {
    const request = await getRequest({
      request: new Request("http://127.0.0.1:35679/api/probe"),
      origin: "https://prefixed.example",
    });
    expect(new URL(request.url).origin).toBe("https://prefixed.example");
  });

  test("uses the request protocol when ORIGIN and forwarded proto are unset", async () => {
    const request = await getRequest({
      request: new Request("http://127.0.0.1:3000/api/probe", {
        headers: { host: "127.0.0.1:3000" },
      }),
    });
    expect(new URL(request.url).origin).toBe("http://127.0.0.1:3000");
  });
});
