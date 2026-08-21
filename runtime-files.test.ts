import { describe, expect, test } from "bun:test";
import { runtimeFilesDir } from "./runtime-files.ts";

describe("runtimeFilesDir", () => {
  test("prefers files next to the adapter", () => {
    const exists = (path: string) => path === "/pkg/files";
    expect(runtimeFilesDir("/pkg", exists)).toBe("/pkg/files");
  });

  test("falls back to dist/files when running from source", () => {
    const exists = (path: string) => path === "/pkg/dist/files";
    expect(runtimeFilesDir("/pkg", exists)).toBe("/pkg/dist/files");
  });

  test("falls back to src when the adapter has not been built", () => {
    const exists = (path: string) => path === "/pkg/src";
    expect(runtimeFilesDir("/pkg", exists)).toBe("/pkg/src");
  });

  test("returns src even when nothing exists so adapt can throw a clear error", () => {
    expect(runtimeFilesDir("/pkg", () => false)).toBe("/pkg/src");
  });
});
