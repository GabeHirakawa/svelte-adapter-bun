import { describe, expect, test } from "bun:test";
import { requestOrigin } from "./src/origin.ts";

const headers = (init: Record<string, string>) => new Headers(init);

describe("requestOrigin", () => {
  test("uses ORIGIN when it is set", () => {
    expect(
      requestOrigin({
        origin: "https://my.site",
        headers: headers({ host: "localhost:3000" }),
      }),
    ).toBe("https://my.site");
  });

  test("defaults protocol to https when ORIGIN and PROTOCOL_HEADER are unset", () => {
    expect(
      requestOrigin({
        headers: headers({ host: "localhost:3000" }),
      }),
    ).toBe("https://localhost:3000");
  });

  test("reads protocol, host, and port from forwarded headers", () => {
    expect(
      requestOrigin({
        protocolHeader: "x-forwarded-proto",
        hostHeader: "x-forwarded-host",
        portHeader: "x-forwarded-port",
        headers: headers({
          "x-forwarded-proto": "http",
          "x-forwarded-host": "app.example",
          "x-forwarded-port": "8080",
          host: "localhost:3000",
        }),
      }),
    ).toBe("http://app.example:8080");
  });

  test("falls back to Host when HOST_HEADER is empty", () => {
    expect(
      requestOrigin({
        protocolHeader: "x-forwarded-proto",
        headers: headers({
          "x-forwarded-proto": "https",
          host: "app.example",
        }),
      }),
    ).toBe("https://app.example");
  });

  test("returns undefined when there is no host at all", () => {
    expect(requestOrigin({ headers: headers({}) })).toBeUndefined();
  });

  test("does not append PORT_HEADER when the host already has a port", () => {
    expect(
      requestOrigin({
        portHeader: "x-forwarded-port",
        headers: headers({
          host: "app.example:443",
          "x-forwarded-port": "8080",
        }),
      }),
    ).toBe("https://app.example:443");
  });
});
