import path from "path";
import { existsSync, statSync } from "fs";
import type { Handler, MimeTypeMap } from "./types.ts";
import { pickCompressedSibling, resolveSafePath } from "./asset.ts";

function getMimeType(pathname: string): string | undefined {
  const ext = pathname.split(".").pop()?.toLowerCase();
  const mimeTypes: MimeTypeMap = {
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    mjs: "application/javascript",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject",
    webp: "image/webp",
    avif: "image/avif",
  };

  return ext ? mimeTypes[ext] : undefined;
}

export function createStaticHandler(
  clientRoot = path.join(import.meta.dir, "client"),
): Handler {
  return async function staticHandler(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const assetPath = resolveSafePath(clientRoot, url.pathname);
    if (!assetPath || !existsSync(assetPath) || !statSync(assetPath).isFile()) {
      return null;
    }

    const picked = pickCompressedSibling(
      assetPath,
      request.headers.get("accept-encoding") ?? undefined,
      existsSync,
    );
    const file = Bun.file(picked.path);
    const mimeType = getMimeType(url.pathname) || file.type;
    const headers: Record<string, string> = {
      "cache-control": url.pathname.includes("/_app/immutable/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
    };

    if (mimeType) {
      headers["content-type"] = mimeType;
    }
    if (picked.encoding) {
      headers["content-encoding"] = picked.encoding;
      headers["vary"] = "accept-encoding";
    }

    return new Response(file, { headers });
  };
}
