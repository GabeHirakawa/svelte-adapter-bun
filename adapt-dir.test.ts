import { describe, expect, test } from "bun:test";
import { adaptTempDir } from "./adapt-dir.ts";

describe("adaptTempDir", () => {
  test("delegates to builder.getBuildDirectory('adapter-bun')", () => {
    expect(
      adaptTempDir({
        getBuildDirectory: (name) => `.svelte-kit/${name}`,
      }),
    ).toBe(".svelte-kit/adapter-bun");
  });
});
