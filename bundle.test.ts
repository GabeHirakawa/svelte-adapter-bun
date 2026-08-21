import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { externalsFromPackageJson } from "./externals.ts";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("Bun.build dep split", () => {
  test("inlines local modules and leaves production dependencies as imports", async () => {
    const dir = await mkdtemp(join(tmpdir(), "adapt-bundle-"));
    dirs.push(dir);

    await writeFile(
      join(dir, "helper.ts"),
      `export const marker = "inlined-dev-helper";\n`,
    );
    await writeFile(
      join(dir, "entry.ts"),
      `import pg from "pg";\nimport { marker } from "./helper.ts";\nexport { pg, marker };\n`,
    );

    const result = await Bun.build({
      entrypoints: [join(dir, "entry.ts")],
      outdir: join(dir, "out"),
      target: "bun",
      format: "esm",
      external: externalsFromPackageJson({ dependencies: { pg: "^8.0.0" } }),
    });

    expect(result.success).toBe(true);
    const js = result.outputs.filter((o) => o.path.endsWith(".js"));
    expect(js.length).toBeGreaterThan(0);
    const bundled = await Promise.all(js.map((o) => o.text()));
    const text = bundled.join("\n");

    expect(text).toContain("inlined-dev-helper");
    expect(text).toMatch(/from\s+["']pg["']/);
  });
});
