import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { parseByteRange } from "./src/range.ts";
import { createStaticHandler } from "./src/static.ts";

describe("parseByteRange", () => {
  test("returns none when Range is absent or not bytes", () => {
    expect(parseByteRange(undefined, 100)).toEqual({ kind: "none" });
    expect(parseByteRange("items=0-10", 100)).toEqual({ kind: "none" });
  });

  test("parses start-end, start-only, and suffix ranges", () => {
    expect(parseByteRange("bytes=0-4", 11)).toEqual({ kind: "range", start: 0, end: 4 });
    expect(parseByteRange("bytes=6-", 11)).toEqual({ kind: "range", start: 6, end: 10 });
    expect(parseByteRange("bytes=-3", 11)).toEqual({ kind: "range", start: 8, end: 10 });
  });

  test("clamps the end to the last byte", () => {
    expect(parseByteRange("bytes=0-999", 11)).toEqual({ kind: "range", start: 0, end: 10 });
  });

  test("serves the full file when multiple ranges are requested", () => {
    expect(parseByteRange("bytes=0-1,3-4", 11)).toEqual({ kind: "none" });
  });

  test("is unsatisfiable when the start is past the file", () => {
    expect(parseByteRange("bytes=20-30", 11)).toEqual({ kind: "unsatisfiable" });
    expect(parseByteRange("bytes=0-4", 0)).toEqual({ kind: "unsatisfiable" });
  });
});

describe("createStaticHandler ranges", () => {
  test("returns 206 with the requested bytes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "adapter-range-"));
    await writeFile(join(dir, "hi.txt"), "hello world");
    const handler = createStaticHandler(dir);
    const response = await handler(
      new Request("http://localhost/hi.txt", { headers: { range: "bytes=0-4" } }),
    );

    expect(response?.status).toBe(206);
    expect(response?.headers.get("content-range")).toBe("bytes 0-4/11");
    expect(await response?.text()).toBe("hello");
  });
});
