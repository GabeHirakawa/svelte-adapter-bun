import path from "path";
import { existsSync } from "fs";
import type { Handler } from "./types.ts";
import { pickCompressedSibling } from "./asset.ts";

function prerenderedFile(root: string, pathname: string): string | null {
  if (pathname === "/") {
    return path.join(root, "index.html");
  }

  if (pathname.endsWith("/")) {
    const dirPath = path.join(root, pathname, "index.html");
    const filePath = path.join(root, `${pathname.slice(0, -1)}.html`);
    return existsSync(dirPath) ? dirPath : existsSync(filePath) ? filePath : null;
  }

  const filePath = path.join(root, `${pathname}.html`);
  const dirPath = path.join(root, pathname, "index.html");
  return existsSync(filePath) ? filePath : existsSync(dirPath) ? dirPath : null;
}

export function createPrerenderedHandler(
  prerendered: Set<string>,
  prerenderedRoot = path.join(import.meta.dir, "prerendered"),
): Handler {
  return async function prerenderedHandler(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    if (!prerendered.has(url.pathname)) {
      return null;
    }

    const htmlPath = prerenderedFile(prerenderedRoot, url.pathname);
    if (!htmlPath) {
      return null;
    }

    const picked = pickCompressedSibling(
      htmlPath,
      request.headers.get("accept-encoding") ?? undefined,
      existsSync,
    );
    const headers: Record<string, string> = {
      "content-type": "text/html",
      "cache-control": "public, max-age=3600",
    };
    if (picked.encoding) {
      headers["content-encoding"] = picked.encoding;
      headers["vary"] = "accept-encoding";
    }

    return new Response(Bun.file(picked.path), { headers });
  };
}
