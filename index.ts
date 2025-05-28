import { existsSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import glob from "tiny-glob";
import type { Builder } from "@sveltejs/kit"

// Resolve the files directory relative to the adapter's location
const __dirname = dirname(fileURLToPath(import.meta.url));

// Check if we're running from source (development) or dist (production)
let files = join(__dirname, "files");
if (!existsSync(files)) {
  // Try dist/files (when running from source)
  files = join(__dirname, "dist", "files");
  if (!existsSync(files)) {
    // Try src directory (when running from source without build)
    files = join(__dirname, "src");
  }
}

interface AdapterOptions {
  out?: string;
  precompress?: boolean | CompressOptions;
  envPrefix?: string;
  development?: boolean;
  dynamic_origin?: boolean;
  xff_depth?: number;
  assets?: boolean;
  websocket?: {
    enabled?: boolean;
    path?: string;
    compression?: boolean;
    maxCompressedSize?: number;
    maxBackpressure?: number;
  };
}

interface CompressOptions {
  files?: string[];
  brotli?: boolean;
  gzip?: boolean;
}

export default function (opts: AdapterOptions = {}) {
  const {
    out = "build",
    precompress = false,
    envPrefix = "",
    development = false,
    dynamic_origin = false,
    xff_depth = 1,
    assets = true,
    websocket = { enabled: false, path: '/ws', compression: true },
  } = opts;
  
  return {
    name: "svelte-adapter-bun",
    async adapt(builder: Builder) {
      try {
        builder.rimraf(out);
        builder.mkdirp(out);

        builder.log.minor("Copying assets");
        builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
        builder.writePrerendered(`${out}/prerendered${builder.config.kit.paths.base}`);

        if (precompress) {
          builder.log.minor("Compressing assets");
          await Promise.all([
            compress(`${out}/client`, precompress),
            compress(`${out}/prerendered`, precompress),
          ]);
        }

        builder.log.minor("Building server");
        builder.writeServer(`${out}/server`);

        // Generate manifest file
        await Bun.write(
          `${out}/manifest.js`,
          `export const manifest = ${builder.generateManifest({ relativePath: "./server" })};\n\n` +
            `export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`,
        );

        // Read the app's package.json (not the adapter's)
        const pkg = await Bun.file("package.json").json().catch(() => ({}));

        builder.log.minor(`Bundling with production dependencies external`);

        // Use SvelteKit's recommended intermediate directory
        const tempDir = ".svelte-kit/svelte-adapter-bun";
        builder.rimraf(tempDir);
        builder.mkdirp(tempDir);

        builder.log.minor("Preparing runtime files");
        if (existsSync(files)) {
          builder.copy(files, tempDir);
        } else {
          throw new Error(`Runtime files directory not found: ${files}`);
        }
        
        // Generate the main entry file with configuration
        builder.log.minor("Generating server entry file");
        
        // Read the base index file
        const indexPath = join(tempDir, "index.ts");
        let entryContent = await Bun.file(indexPath).text();
        
        // Replace configuration values
        entryContent = entryContent.replace(/xff_depth: 1/, `xff_depth: ${xff_depth}`);
        entryContent = entryContent.replace(
          /websocket: \{[^}]+\}/,
          `websocket: ${JSON.stringify(websocket)}`
        );
        
        await Bun.write(indexPath, entryContent);

        // Bundle the server keeping production dependencies external
        builder.log.minor("Bundling server with dependencies");
        
        const buildResult = await Bun.build({
          entrypoints: [indexPath],
          outdir: out,
          target: "bun",
          format: "esm",
          splitting: true,
          sourcemap: "external",
          naming: {
            entry: "index.js",
            chunk: "chunks/[name]-[hash].js",
            asset: "assets/[name]-[hash].[ext]"
          },
        });

        if (!buildResult.success) {
          builder.log.error("Build failed. Logs:");
          for (const log of buildResult.logs) {
            builder.log.error(`  ${log}`);
          }
          throw new Error('Bundle failed');
        }

        // Clean up intermediate directory
        builder.rimraf(tempDir);

        // Generate minimal package.json for deployment
        const package_data = {
          name: pkg.name || "bun-sveltekit-app",
          version: pkg.version || "0.0.0",
          type: "module",
          private: true,
          main: "index.js",
          scripts: {
            start: "bun ./index.js",
          },
          dependencies: pkg.dependencies || {},
        };

        await Bun.write(`${out}/package.json`, JSON.stringify(package_data, null, 2));

        builder.log.success(`Start server with: bun ./${out}/index.js`);
      } catch (error) {
        builder.log.error("Adapter failed:");
        builder.log.error(error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
          builder.log.error(error.stack);
        }
        throw error;
      }
    },
  };
}

/**
 * @param {string} directory
 * @param {boolean | CompressOptions} options
 */
async function compress(directory: string, options: boolean | CompressOptions) {
  if (!existsSync(directory)) {
    return;
  }

  let files_ext = (typeof options === "object" && options.files) ? options.files : ["html", "js", "json", "css", "svg", "xml", "wasm"];
  const files = await glob(`**/*.{${files_ext.join()}}`, {
    cwd: directory,
    dot: true,
    absolute: true,
    filesOnly: true,
  });

  let doBr = false,
    doGz = false;

  if (options === true) {
    doBr = doGz = true;
  } else if (typeof options === "object") {
    doBr = options.brotli ?? false;
    doGz = options.gzip ?? false;
  }

  await Promise.all(
    files.map((file: string) =>
      Promise.all([doGz && compress_file(file, "gz"), doBr && compress_file(file, "br")]),
    ),
  );
}

/**
 * @param {string} file
 * @param {'gz' | 'br'} format
 */
async function compress_file(file: string, format: "gz" | "br" = "gz") {
  // Use Bun.file to read the file
  const fileData = await Bun.file(file).arrayBuffer();
  
  let compressed: Uint8Array;
  if (format === "br") {
    // Use Node.js zlib for Brotli compression since Bun doesn't have brotliCompressSync
    const zlib = await import("zlib");
    compressed = zlib.brotliCompressSync(new Uint8Array(fileData), {
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: statSync(file).size,
      },
    });
  } else {
    // Use Bun's built-in Gzip compression
    compressed = Bun.gzipSync(new Uint8Array(fileData), {
      level: 9, // Maximum compression
    });
  }

  // Use Bun.write to write the compressed file
  await Bun.write(`${file}.${format}`, compressed);
}