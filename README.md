# svelte-adapter-bun

A SvelteKit adapter for Bun with optimized bundling using Bun's native bundler.

## Features

- 🚀 **Bun Native APIs**: Uses `Bun.serve`, `Bun.file`, `Bun.write`, and `Bun.gzipSync` for optimal performance
- 📦 **Smart Bundling**: Dev dependencies are bundled, production dependencies remain external (like `@sveltejs/adapter-node`)
- ⚡ **Fast Builds**: Uses Bun's native bundler instead of Rollup for faster build times
- 🔧 **WebSocket Support**: Built-in WebSocket handling with Bun's native WebSocket API
- 🗜️ **Compression**: Built-in Gzip and Brotli compression using Bun's native compression
- 🌐 **Environment Variables**: Full support for custom environment variable prefixes

## Installation

```bash
bun add -D svelte-adapter-bun
```

## Usage

Add the adapter to your `svelte.config.js`:

```js
import adapter from 'svelte-adapter-bun';

export default {
  kit: {
    adapter: adapter({
      // Options (all optional)
      out: 'build',           // Output directory
      precompress: true,      // Enable gzip/brotli compression
      envPrefix: '',          // Environment variable prefix
      development: false,     // Development mode
      dynamic_origin: false,  // Allow dynamic origin
      xff_depth: 1,          // X-Forwarded-For depth
      assets: true           // Serve static assets
    })
  }
};
```

## Building

```bash
bun run build
```

This creates a production server in the `build` directory (or your specified `out` directory).

## Running

```bash
bun ./build/index.js
```

Or with environment variables:

```bash
PORT=4000 HOST=127.0.0.1 bun ./build/index.js
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server hostname (default: 0.0.0.0)
- `ORIGIN` - Origin URL for the app
- `XFF_DEPTH` - X-Forwarded-For header depth
- `ADDRESS_HEADER` - Header to read client IP from
- `PROTOCOL_HEADER` - Header to read protocol from
- `HOST_HEADER` - Header to read host from
- `PORT_HEADER` - Header to read port from

## Bundling Strategy

This adapter follows the same bundling strategy as `@sveltejs/adapter-node`:

- **Dev dependencies are bundled** - Dependencies in `devDependencies` (like `tiny-glob`) are included in the bundle
- **Production dependencies are external** - Dependencies in `dependencies` (like `cookie`, `devalue`) remain external and must be installed in production
- **Peer dependencies are external** - `@sveltejs/kit` and other peer dependencies are not bundled

This means you only need to install production dependencies in your deployment environment:

```bash
# In production
bun install --production
```

## Development

```bash
# Install dependencies
bun install

# Build the adapter
bun run build

# Test with a SvelteKit project
bun run dev
```

## Project Structure

```
├── src/           # Runtime files (copied to 'files' in dist)
│   ├── index.js   # Main server entry point
│   ├── handler.js # Request handler
│   ├── env.js     # Environment variable helpers
│   └── platform.js # Platform adapters
├── dist/          # Built output
│   ├── index.js   # Bundled adapter code
│   └── files/     # Runtime files for user projects
├── build.ts       # Build script using Bun bundler
└── index.ts       # Adapter source code
```

## Comparison with adapter-node

| Feature | adapter-node | svelte-adapter-bun |
|---------|-------------|-------------------|
| Bundler | Rollup | Bun (native) |
| Runtime | Node.js | Bun |
| File I/O | fs module | Bun.file/Bun.write |
| Compression | zlib streams | Bun.gzipSync + zlib.brotli |
| WebSockets | Manual setup | Built-in Bun WebSocket API |
| Performance | Good | Faster (native Bun APIs) |

## License

MIT
