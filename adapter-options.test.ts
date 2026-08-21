import { describe, expect, test } from "bun:test";

describe("unused adapter options", () => {
  test("AdapterOptions does not declare development or dynamic_origin", async () => {
    const source = await Bun.file(new URL("./index.ts", import.meta.url)).text();
    expect(source).not.toMatch(/development\?:/);
    expect(source).not.toMatch(/dynamic_origin\?:/);
  });

  test("README options table does not list them", async () => {
    const readme = await Bun.file(new URL("./README.md", import.meta.url)).text();
    const start = readme.indexOf("| Option |");
    const end = readme.indexOf("### Compression");
    const table = readme.slice(start, end);
    expect(table).not.toMatch(/development/);
    expect(table).not.toMatch(/dynamic_origin/);
  });
});
