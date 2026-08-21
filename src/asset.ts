import path from "path";

export type BuildOptions = {
  assets?: boolean;
  xff_depth?: number;
};

export type CompressedPick = {
  path: string;
  encoding?: "br" | "gzip";
};

export function serveAssetsEnabled(options?: BuildOptions): boolean {
  return options?.assets !== false;
}

export function xffDepthFromBuild(options?: BuildOptions, fallback = 1): number {
  return typeof options?.xff_depth === "number" && Number.isFinite(options.xff_depth)
    ? options.xff_depth
    : fallback;
}

export function resolveSafePath(root: string, pathname: string): string | null {
  const relative = path.posix.normalize(pathname.replace(/^\/+/, ""));
  if (relative === ".." || relative.startsWith("../") || path.posix.isAbsolute(relative)) {
    return null;
  }

  const resolved = path.resolve(root, relative);
  const rootResolved = path.resolve(root);
  if (resolved !== rootResolved && !resolved.startsWith(`${rootResolved}${path.sep}`)) {
    return null;
  }

  return resolved;
}

function acceptsEncoding(header: string | undefined, token: string): boolean {
  if (!header) {
    return false;
  }
  return header.split(",").some((part) => part.trim().split(";")[0]?.trim().toLowerCase() === token);
}

export function pickCompressedSibling(
  filePath: string,
  acceptEncoding: string | undefined,
  exists: (path: string) => boolean,
): CompressedPick {
  if (acceptsEncoding(acceptEncoding, "br") && exists(`${filePath}.br`)) {
    return { path: `${filePath}.br`, encoding: "br" };
  }
  if (acceptsEncoding(acceptEncoding, "gzip") && exists(`${filePath}.gz`)) {
    return { path: `${filePath}.gz`, encoding: "gzip" };
  }
  return { path: filePath };
}
