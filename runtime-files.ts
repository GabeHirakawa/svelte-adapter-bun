import { existsSync } from "fs";
import { join } from "path";

export function runtimeFilesDir(
  adapterDir: string,
  exists: (path: string) => boolean = existsSync,
): string {
  const candidates = [
    join(adapterDir, "files"),
    join(adapterDir, "dist", "files"),
    join(adapterDir, "src"),
  ];
  return candidates.find(exists) ?? candidates[2]!;
}
