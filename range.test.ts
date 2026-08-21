import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { applyByteRange, parseByteRange } from "./src/range.ts";
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

  test("parses multiple ranges and drops unsatisfiable ones", () => {
    expect(parseByteRange("bytes=0-1,3-4", 11)).toEqual({
      kind: "ranges",
      ranges: [
        { start: 0, end: 1 },
        { start: 3, end: 4 },
      ],
    });
    expect(parseByteRange("bytes=0-1, 20-30", 11)).toEqual({ kind: "range", start: 0, end: 1 });
    expect(parseByteRange("bytes=20-30,40-50", 11)).toEqual({ kind: "unsatisfiable" });
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

  test("returns 206 multipart/byteranges for multiple ranges", async () => {
    const dir = await mkdtemp(join(tmpdir(), "adapter-multipart-"));
    await writeFile(join(dir, "hi.txt"), "hello world");
    const handler = createStaticHandler(dir);
    const response = await handler(
      new Request("http://localhost/hi.txt", { headers: { range: "bytes=0-1,6-10" } }),
    );

    expect(response?.status).toBe(206);
    const contentType = response?.headers.get("content-type") ?? "";
    expect(contentType.startsWith("multipart/byteranges; boundary=")).toBe(true);
    const boundary = contentType.slice("multipart/byteranges; boundary=".length);
    const body = await response?.text();
    expect(body).toContain(`--${boundary}`);
    expect(body).toContain("Content-Range: bytes 0-1/11");
    expect(body).toContain("Content-Range: bytes 6-10/11");
    expect(body).toContain("he");
    expect(body).toContain("world");
    expect(body).toContain(`--${boundary}--`);
  });
});

describe("applyByteRange multipart", () => {
  test("builds a multipart body with a stable boundary", async () => {
    const dir = await mkdtemp(join(tmpdir(), "adapter-apply-mp-"));
    const path = join(dir, "hi.txt");
    await writeFile(path, "hello world");
    const file = Bun.file(path);
    const ranged = await applyByteRange(file, 11, "bytes=0-1,6-10", "GET", {
      contentType: "text/plain",
      boundary: "BOUND",
    });

    expect(ranged.status).toBe(206);
    expect(ranged.headers["content-type"]).toBe("multipart/byteranges; boundary=BOUND");
    expect(await new Response(ranged.body).text()).toBe(
      [
        "--BOUND",
        "Content-Type: text/plain",
        "Content-Range: bytes 0-1/11",
        "",
        "he",
        "--BOUND",
        "Content-Type: text/plain",
        "Content-Range: bytes 6-10/11",
        "",
        "world",
        "--BOUND--",
        "",
      ].join("\r\n"),
    );
  });
});
