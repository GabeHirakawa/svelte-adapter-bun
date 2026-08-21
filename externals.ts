export type PackageJsonLike = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/** Production dependencies stay external, including deep exports (`pkg/subpath`). */
export function externalsFromPackageJson(pkg: PackageJsonLike): string[] {
  return Object.keys(pkg.dependencies ?? {}).flatMap((name) => [name, `${name}/*`]);
}
