export function adaptTempDir(builder: {
  getBuildDirectory: (name: string) => string;
}): string {
  return builder.getBuildDirectory("adapter-bun");
}
