#!/usr/bin/env bun

import { existsSync } from "fs";

// Read package.json to determine external dependencies
const pkg = await Bun.file("package.json").json();
const external = [
  // Production dependencies should be external (not bundled)
  ...Object.keys(pkg.dependencies || {}),
  // Peer dependencies should be external  
  ...Object.keys(pkg.peerDependencies || {}).filter(dep => dep !== "typescript"),
  // SvelteKit specific modules that should remain external
  "@sveltejs/kit",
  "@sveltejs/kit/*"
];

console.log("🔨 Building svelte-adapter-bun with Bun bundler...");
console.log("📦 External dependencies:", external);

// Clean output directory
if (existsSync("dist")) {
  await Bun.$`rm -rf dist`;
}

// Bundle the adapter
const result = await Bun.build({
  entrypoints: ["./index.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
  external,
  minify: false, // Keep readable for debugging
  sourcemap: "external",
  splitting: false, // Single file output
  naming: {
    entry: "index.js"
  }
});

if (!result.success) {
  console.error("❌ Build failed:");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.log("✅ Build successful!");

// Copy package.json and update it for distribution
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: "module",
  main: "index.js",
  module: "index.js",
  exports: {
    ".": {
      "import": "./index.js"
    }
  },
  files: ["index.js", "index.js.map", "files"],
  keywords: pkg.keywords,
  author: pkg.author,
  license: pkg.license,
  repository: pkg.repository,
  bugs: pkg.bugs,
  homepage: pkg.homepage,
  // Only include production dependencies
  dependencies: pkg.dependencies || {},
  peerDependencies: pkg.peerDependencies || {}
};

await Bun.write("dist/package.json", JSON.stringify(distPkg, null, 2));

// Copy src directory to files in dist, excluding hooks.example.ts
if (existsSync("src")) {
  await Bun.$`mkdir -p dist/files`;
  // Copy all files except hooks.example.ts
  const srcFiles = await Bun.$`find src -type f -name "*.ts" ! -name "hooks.example.ts"`.text();
  const files = srcFiles.trim().split('\n').filter(f => f);
  
  for (const file of files) {
    await Bun.$`cp ${file} dist/files/`;
  }
  
  console.log("📁 Copied src directory to dist/files");
}

// Generate TypeScript declarations
try {
  await Bun.$`bunx tsc --declaration --emitDeclarationOnly --outDir dist`;
  console.log("📝 Generated TypeScript declarations");
} catch (error) {
  console.warn("⚠️  Failed to generate TypeScript declarations:", error);
}

console.log("🎉 Build complete! Output in ./dist");
console.log("📊 Bundle analysis:");

// Show bundle size
const bundleStats = await Bun.file("dist/index.js").text();
const bundleSize = new TextEncoder().encode(bundleStats).length;
console.log(`   Bundle size: ${(bundleSize / 1024).toFixed(2)} KB`);

// Show what was bundled vs external
console.log("   Bundled dependencies: dev dependencies and internal modules");
console.log("   External dependencies:", external.filter(dep => !dep.includes("*")).join(", ")); 