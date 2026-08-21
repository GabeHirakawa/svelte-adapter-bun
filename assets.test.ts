import { describe, expect, test } from "bun:test";
import {
  pickCompressedSibling,
  resolveSafePath,
  serveAssetsEnabled,
  xffDepthFromBuild,
} from "./src/asset.ts";

describe("serveAssetsEnabled", () => {
  test("is on by default", () => {
    expect(serveAssetsEnabled(undefined)).toBe(true);
    expect(serveAssetsEnabled({})).toBe(true);
  });

  test("is off when assets is false", () => {
    expect(serveAssetsEnabled({ assets: false })).toBe(false);
  });
});

describe("xffDepthFromBuild", () => {
  test("uses BUILD_OPTIONS.xff_depth when it is a finite number", () => {
    expect(xffDepthFromBuild({ xff_depth: 3 })).toBe(3);
  });

  test("falls back to 1 when BUILD_OPTIONS has no xff_depth", () => {
    expect(xffDepthFromBuild(undefined)).toBe(1);
    expect(xffDepthFromBuild({})).toBe(1);
  });
});

describe("resolveSafePath", () => {
  test("joins a pathname under the root", () => {
    expect(resolveSafePath("/var/app/client", "/_app/foo.js")).toBe("/var/app/client/_app/foo.js");
  });

  test("rejects path traversal", () => {
    expect(resolveSafePath("/var/app/client", "/../secret")).toBeNull();
    expect(resolveSafePath("/var/app/client", "/_app/../../etc/passwd")).toBeNull();
  });
});

describe("pickCompressedSibling", () => {
  const exists = (path: string) =>
    path === "/app/style.css.br" || path === "/app/style.css.gz";

  test("prefers brotli when Accept-Encoding includes br and the sibling exists", () => {
    expect(pickCompressedSibling("/app/style.css", "gzip, deflate, br", exists)).toEqual({
      path: "/app/style.css.br",
      encoding: "br",
    });
  });

  test("uses gzip when brotli is absent or not accepted", () => {
    expect(pickCompressedSibling("/app/style.css", "gzip", exists)).toEqual({
      path: "/app/style.css.gz",
      encoding: "gzip",
    });
    expect(
      pickCompressedSibling("/app/style.css", "br", (path) => path === "/app/style.css.gz"),
    ).toEqual({ path: "/app/style.css" });
  });

  test("serves the original file when nothing is accepted or present", () => {
    expect(pickCompressedSibling("/app/style.css", undefined, exists)).toEqual({
      path: "/app/style.css",
    });
    expect(pickCompressedSibling("/app/style.css", "gzip, br", () => false)).toEqual({
      path: "/app/style.css",
    });
  });
});
