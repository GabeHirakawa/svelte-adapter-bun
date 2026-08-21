import { describe, expect, test } from "bun:test";
import { listenFromEnv, readEnv } from "./src/env.ts";

describe("readEnv", () => {
  test("reads the unprefixed name when prefix is empty", () => {
    expect(readEnv("PORT", { prefix: "", source: { PORT: "4000" } })).toBe("4000");
  });

  test("reads the prefixed name and ignores the unprefixed one", () => {
    expect(
      readEnv("PORT", {
        prefix: "MY_",
        source: { PORT: "4000", MY_PORT: "5000" },
      }),
    ).toBe("5000");
  });

  test("returns fallback when the prefixed name is absent", () => {
    expect(
      readEnv("HOST", { prefix: "MY_", source: { HOST: "127.0.0.1" }, fallback: "0.0.0.0" }),
    ).toBe("0.0.0.0");
  });
});

describe("listenFromEnv", () => {
  test("omits port when prefix is empty so Bun can read PORT / BUN_PORT / NODE_PORT", () => {
    expect(listenFromEnv("", { HOST: "127.0.0.1" })).toEqual({ hostname: "127.0.0.1" });
    expect(listenFromEnv("", {})).toEqual({});
  });

  test("passes prefixed PORT and HOST because Bun will not see MY_PORT", () => {
    expect(listenFromEnv("MY_", { MY_HOST: "127.0.0.1", MY_PORT: "4000" })).toEqual({
      hostname: "127.0.0.1",
      port: 4000,
    });
  });

  test("defaults prefixed PORT to 3000 when MY_PORT is absent", () => {
    expect(listenFromEnv("MY_", {})).toEqual({ hostname: "0.0.0.0", port: 3000 });
  });

  test("uses SOCKET_PATH and ignores host and port", () => {
    expect(
      listenFromEnv("", { SOCKET_PATH: "/tmp/app.sock", HOST: "127.0.0.1", PORT: "4000" }),
    ).toEqual({ unix: "/tmp/app.sock" });
    expect(listenFromEnv("MY_", { MY_SOCKET_PATH: "/tmp/app.sock", MY_PORT: "4000" })).toEqual({
      unix: "/tmp/app.sock",
    });
  });

  test("throws when a prefixed name is not a deploy-env var", () => {
    expect(() => listenFromEnv("MY_", { MY_SECRET: "nope" })).toThrow(/MY_SECRET/);
  });
});
