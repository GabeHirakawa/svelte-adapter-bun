import { describe, expect, test } from "bun:test";
import { parseBodySizeLimit, parseIdleTimeout, serveLimits } from "./src/serve-limits.ts";

describe("parseBodySizeLimit", () => {
  test("parses bytes and K/M/G suffixes", () => {
    expect(parseBodySizeLimit("100")).toBe(100);
    expect(parseBodySizeLimit("512K")).toBe(512 * 1024);
    expect(parseBodySizeLimit("2m")).toBe(2 * 1024 * 1024);
    expect(parseBodySizeLimit("1G")).toBe(1024 * 1024 * 1024);
  });

  test("treats Infinity / 0 / none as disable", () => {
    expect(parseBodySizeLimit("Infinity")).toBeUndefined();
    expect(parseBodySizeLimit("infinity")).toBeUndefined();
    expect(parseBodySizeLimit("0")).toBeUndefined();
    expect(parseBodySizeLimit("none")).toBeUndefined();
  });

  test("throws on an invalid value", () => {
    expect(() => parseBodySizeLimit("big")).toThrow(/Invalid BODY_SIZE_LIMIT/);
  });
});

describe("parseIdleTimeout", () => {
  test("parses a value in Bun's 0-255 second range", () => {
    expect(parseIdleTimeout("10")).toBe(10);
    expect(parseIdleTimeout("0")).toBe(0);
    expect(parseIdleTimeout("255")).toBe(255);
  });

  test("throws outside 0-255 instead of crashing Bun.serve", () => {
    expect(() => parseIdleTimeout("256")).toThrow(/IDLE_TIMEOUT/);
    expect(() => parseIdleTimeout("-1")).toThrow(/IDLE_TIMEOUT/);
    expect(() => parseIdleTimeout("idle")).toThrow(/IDLE_TIMEOUT/);
  });
});

describe("serveLimits", () => {
  test("defaults to 512K body and 10s idle", () => {
    expect(serveLimits({})).toEqual({
      maxRequestBodySize: 512 * 1024,
      idleTimeout: 10,
    });
  });

  test("omits maxRequestBodySize when the body cap is disabled", () => {
    expect(serveLimits({ BODY_SIZE_LIMIT: "Infinity", IDLE_TIMEOUT: "30" })).toEqual({
      idleTimeout: 30,
    });
  });
});
