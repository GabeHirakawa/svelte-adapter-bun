import { describe, expect, test } from "bun:test";
import adapter from "./index.ts";
import { maybeInstrument } from "./instrument.ts";

describe("adapter supports.instrumentation", () => {
  test("claims Kit instrumentation.server.js can run first", () => {
    expect(adapter().supports?.instrumentation?.()).toBe(true);
  });
});

describe("maybeInstrument", () => {
  test("does nothing when the app has no instrumentation file", async () => {
    const calls: unknown[] = [];
    await maybeInstrument(
      {
        hasServerInstrumentationFile: () => false,
        instrument: (args) => calls.push(args),
      },
      "build",
    );
    expect(calls).toEqual([]);
  });

  test("copies the Kit file and wraps the Bun entry", async () => {
    const calls: unknown[] = [];
    const copies: [string, string][] = [];
    await maybeInstrument(
      {
        hasServerInstrumentationFile: () => true,
        instrument: (args) => calls.push(args),
      },
      "build",
      async (from, to) => {
        copies.push([from, to]);
      },
    );
    expect(copies).toEqual([
      ["build/server/instrumentation.server.js", "build/instrumentation.server.js"],
    ]);
    expect(calls).toEqual([
      {
        entrypoint: "build/index.js",
        instrumentation: "build/instrumentation.server.js",
      },
    ]);
  });
});
