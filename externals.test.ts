import { describe, expect, test } from "bun:test";
import { externalsFromPackageJson } from "./externals.ts";

describe("externalsFromPackageJson", () => {
  test("returns nothing when there are no production dependencies", () => {
    expect(externalsFromPackageJson({})).toEqual([]);
    expect(externalsFromPackageJson({ devDependencies: { vite: "8.0.0" } })).toEqual([]);
  });

  test("marks each production dependency and its deep exports external", () => {
    expect(
      externalsFromPackageJson({
        dependencies: { pg: "^8.0.0", sharp: "^0.33.0" },
        devDependencies: { vite: "8.0.0" },
        peerDependencies: { typescript: "^5.0.0" },
      }),
    ).toEqual(["pg", "pg/*", "sharp", "sharp/*"]);
  });
});
