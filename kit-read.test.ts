import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import adapter from "./index.ts";
import { kitRead } from "./src/kit-read.ts";

describe("kitRead", () => {
  test("returns a stream of a file under the root", async () => {
    const root = await mkdtemp(join(tmpdir(), "kit-read-"));
    await writeFile(join(root, "hello.txt"), "hello kit");

    const stream = kitRead(root, "hello.txt");
    expect(await new Response(stream).text()).toBe("hello kit");
  });

  test("rejects path traversal", () => {
    expect(() => kitRead("/var/app/client", "../secret")).toThrow(/Invalid read path/);
  });
});

describe("adapter supports.read", () => {
  test("claims Kit read works in production", () => {
    expect(adapter().supports?.read?.({ config: {}, route: { id: "/" } })).toBe(true);
  });
});
