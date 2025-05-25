import { existsSync, statSync } from "fs";
import { fileURLToPath } from "url";
import glob from "tiny-glob";
import type { Builder } from "@sveltejs/kit"
const files = fileURLToPath(new URL("./files", import.meta.url).href);

interface AdapterOptions {
  out?: string;
  precompress?: boolean | CompressOptions;
  envPrefix?: string;
  development?: boolean;
  dynamic_origin?: boolean;
  xff_depth?: number;
  assets?: boolean;
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
  } = opts;
  
  return {
    name: "svelte-adapter-bun",
    async adapt(builder: Builder) {
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

      // Use Bun.write instead of writeFileSync
      await Bun.write(
        `${out}/manifest.js`,
        `export const manifest = ${builder.generateManifest({ relativePath: "./server" })};\n\n` +
          `export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`,
      );

      builder.log.minor("Patching server (websocket support)");
      await patchServerWebsocketHandler(`${out}/server`);

      // Use Bun.file to read package.json
      const pkg = await Bun.file("package.json").json().catch(() => ({}));

      builder.copy(files, out, {
        replace: {
          SERVER: "./server/index.js",
          MANIFEST: "./manifest.js",
          ENV_PREFIX: JSON.stringify(envPrefix),
          dotENV_PREFIX: envPrefix,
          BUILD_OPTIONS: `{ development: ${development}, dynamic_origin: ${dynamic_origin}, xff_depth: ${xff_depth}, assets: ${assets} }`,
        },
      });

      let package_data = {
        name: "bun-sveltekit-app",
        version: "0.0.0",
        type: "module",
        private: true,
        main: "index.js",
        scripts: {
          start: "bun ./index.js",
        },
        dependencies: { cookie: "latest", devalue: "latest", "set-cookie-parser": "latest" },
      };

      try {
        pkg.name && (package_data.name = pkg.name);
        pkg.version && (package_data.version = pkg.version);
        pkg.dependencies &&
          (package_data.dependencies = {
            ...pkg.dependencies,
            ...package_data.dependencies,
          });
      } catch (error) {
        builder.log.warn(`Parse package.json error: ${(error as Error).message}`);
      }

      // Use Bun.write instead of writeFileSync
      await Bun.write(`${out}/package.json`, JSON.stringify(package_data, null, "\t"));

      builder.log.success(`Start server with: bun ./${out}/index.js`);
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

/**
 * @param {string} out
 */
async function patchServerWebsocketHandler(out: string) {
  // Use Bun.file to read the file
  const src = await Bun.file(`${out}/index.js`).text();
  
  const regex_gethook = /(this\.#options\.hooks\s+=\s+{)\s+(handle:)/gm;
  const substr_gethook = `$1 \nhandleWebsocket: module.handleWebsocket || null,\n$2`;
  const result1 = src.replace(regex_gethook, substr_gethook);

  const regex_sethook = /(this\.#options\s+=\s+options;)/gm;
  const substr_sethook = `$1\nthis.websocket = ()=>this.#options.hooks.handleWebsocket;`;
  const result = result1.replace(regex_sethook, substr_sethook);

  // Use Bun.write to write the patched file
  await Bun.write(`${out}/index.js`, result);
}