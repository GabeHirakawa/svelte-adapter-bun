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

console.log("🔨 Building svelte-adapter-bun...");

// Clean output directory
if (existsSync("dist")) {
  await Bun.$`rm -rf dist`;
}

// Bundle the main adapter
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

// Bundle the websocket types separately
const websocketResult = await Bun.build({
  entrypoints: ["./src/websocket.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
  external,
  minify: false,
  sourcemap: "external",
  splitting: false,
  naming: {
    entry: "websocket.js"
  }
});

if (!websocketResult.success) {
  console.error("❌ WebSocket build failed:");
  for (const message of websocketResult.logs) {
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
      "import": "./index.js",
      "types": "./index.d.ts"
    },
    "./websocket": {
      "import": "./websocket.js",
      "types": "./websocket.d.ts"
    }
  },
  files: ["index.js", "index.js.map", "websocket.js", "websocket.js.map", "*.d.ts", "ambient.d.ts", "files"],
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
  
  console.log("📁 Copied runtime files to dist/files");
}

try {
  await Bun.$`bunx tsc --noEmit`;
  await Bun.write("dist/ambient.d.ts", await Bun.file("ambient.d.ts").text());
  await Bun.write("dist/index.d.ts", await Bun.file("index.d.ts").text());
  console.log("📝 Published ambient and adapter types");
} catch (error) {
  console.error("❌ Failed to generate TypeScript declarations:", error);
  process.exit(1);
}

console.log("🎉 Build complete! Output in ./dist");

// Show simple bundle stats
const bundleStats = await Bun.file("dist/index.js").text();
const bundleSize = new TextEncoder().encode(bundleStats).length;
console.log(`📊 Bundle size: ${(bundleSize / 1024).toFixed(2)} KB`); 