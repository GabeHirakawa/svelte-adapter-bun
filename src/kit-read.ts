import { resolveSafePath } from "./asset.ts";

export function clientAssetRoot(dir: string, base = ""): string {
  return `${dir}/client${base}`;
}

export function baseFromBuild(options?: { base?: string }): string {
  return typeof options?.base === "string" ? options.base : "";
}

export function kitRead(root: string, file: string): ReadableStream {
  const safe = resolveSafePath(root, file);
  if (!safe) {
    throw new Error(`Invalid read path: ${file}`);
  }
  return Bun.file(safe).stream();
}
