# svelte-adapter-bun

A high-performance SvelteKit adapter for [Bun](https://bun.sh/) runtime, built with TypeScript and leveraging Bun's native APIs for optimal performance.

## ⚠️ Experimental Status

**This adapter is currently experimental and under active development.** While it should work, I have not had an opportunity to fully test it across all environments
[]
### Recommendations
- ✅ **Safe for**: Development, prototyping, and low-traffic applications
- ⚠️ **Use with caution**: Production applications with critical uptime requirements
- 🔄 **Stay updated**: Monitor releases for important updates and breaking changes

### Feedback Welcome
Feel free to try the adapter and [report any issues](https://github.com/gabehirakawa/svelte-adapter-bun/issues) you encounter.

## Features

- 🚀 **Native Bun APIs**: Uses `Bun.serve()`, `Bun.file()`, `Bun.write()`, and `Bun.gzipSync()` for maximum performance
- 📦 **Smart Bundling**: Bundles dev dependencies while keeping production dependencies external (same strategy as `@sveltejs/adapter-node`)
- 🔧 **TypeScript First**: Written entirely in TypeScript with comprehensive type safety
- 🏗️ **Modular Architecture**: Clean separation of concerns with dedicated handlers for static assets, prerendered pages, and dynamic routes
- ⚡ **Zero Race Conditions**: Deterministic request handling order eliminates asset serving issues
- 🗜️ **Asset Compression**: Built-in Gzip and Brotli compression support
- 🌐 **WebSocket Support**: Includes WebSocket handler patching for real-time applications
## Installation

```bash
npm install svelte-adapter-bun
# or
bun add svelte-adapter-bun
```

## Usage

In your `svelte.config.js`:

```js
import adapter from 'svelte-adapter-bun';

export default {
  kit: {
    adapter: adapter({
      // options
    })
  }
};
```

## Configuration Options

```typescript
interface AdapterOptions {
  out?: string;                    // Output directory (default: 'build')
  precompress?: boolean | {        // Asset compression (default: false)
    files?: string[];              // File extensions to compress
    brotli?: boolean;              // Enable Brotli compression
    gzip?: boolean;                // Enable Gzip compression
  };
  envPrefix?: string;              // Environment variable prefix (default: '')
  development?: boolean;           // Development mode (default: false)
  dynamic_origin?: boolean;        // Allow dynamic origin detection (default: false)
  xff_depth?: number;              // X-Forwarded-For depth (default: 1)
  assets?: boolean;                // Include static assets (default: true)
}
```

### Example Configuration

```js
import adapter from 'svelte-adapter-bun';

export default {
  kit: {
    adapter: adapter({
      out: 'dist',
      precompress: {
        gzip: true,
        brotli: true,
        files: ['html', 'js', 'css', 'json', 'svg']
      },
      envPrefix: 'MY_APP_',
      development: false
    })
  }
};
```

## Building Your App

```bash
# Build with Bun (recommended)
bun --bun run build

# Or with npm/pnpm
npm run build
```

**Important**: Use `bun --bun run build` instead of `bun run build` to ensure Bun's native APIs are available during the build process.

## Running Your App

```bash
# Start the production server
bun ./build/index.js

# Or with custom port
PORT=8080 bun ./build/index.js
```

## Environment Variables

The adapter supports the following environment variables:

- `PORT` - Server port (default: 3000)
- `HOST` - Server hostname (default: 0.0.0.0)
- `ORIGIN` - Origin URL for request handling
- `XFF_DEPTH` - X-Forwarded-For header depth (default: 1)
- `ADDRESS_HEADER` - Custom address header name
- `PROTOCOL_HEADER` - Custom protocol header name
- `HOST_HEADER` - Custom host header name (default: host)
- `PORT_HEADER` - Custom port header name

### Environment Variable Prefixes

You can use the `envPrefix` option to namespace your environment variables:

```js
adapter({
  envPrefix: 'MYAPP_'
})
```

This allows you to use variables like `MYAPP_PORT`, `MYAPP_HOST`, etc.

## Architecture

The adapter uses a modular architecture with three main handlers:

1. **Static Handler** (`src/static.ts`) - Serves static assets with proper caching headers
2. **Prerendered Handler** (`src/prerendered.ts`) - Serves prerendered pages
3. **SvelteKit Handler** (`src/sveltekit.ts`) - Handles dynamic routes through SvelteKit

Request flow:
```
Request → Static Assets → Prerendered Pages → SvelteKit → Response
```

## Performance Features

### Native Bun APIs
- `Bun.serve()` for HTTP server
- `Bun.file()` for file operations
- `Bun.write()` for file writing
- `Bun.gzipSync()` for compression

### Smart Caching
- Immutable assets: `max-age=31536000, immutable`
- Regular assets: `max-age=3600`
- Prerendered pages: `max-age=3600`

### Bundling Strategy
- **Bundled**: Development dependencies and internal modules
- **External**: Production dependencies, Node.js built-ins, and SvelteKit modules

## Development

### Project Structure

```
svelte-adapter-bun/
├── src/                 # TypeScript source files
│   ├── types.ts        # Type definitions
│   ├── env.ts          # Environment helpers
│   ├── platform.ts     # Request/Response adapters
│   ├── static.ts       # Static file handler
│   ├── prerendered.ts  # Prerendered page handler
│   ├── sveltekit.ts    # SvelteKit handler
│   └── index.ts        # Main server entry
├── test-app/           # Test SvelteKit application
├── build.ts            # Build script
├── index.ts            # Adapter entry point
└── README.md
```

### Building the Adapter

```bash
# Build the adapter
bun run build.ts

# Test with the test app
cd test-app
bun --bun run build
bun ./build/index.js
```

### TypeScript Compilation

The adapter automatically compiles TypeScript files to JavaScript during the build process:

1. Copies TypeScript files to the output directory
2. Applies build-time replacements (MANIFEST, SERVER, etc.)
3. Compiles TypeScript to JavaScript using Bun's transpiler
4. Removes TypeScript files, keeping only JavaScript

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built for [SvelteKit](https://kit.svelte.dev/)
- Powered by [Bun](https://bun.sh/)
- Inspired by `@sveltejs/adapter-node`
- Special thanks to [gornostay25/svelte-adapter-bun](https://github.com/gornostay25/svelte-adapter-bun) and [TheOrdinaryWow/svelte-adapter-bun-next](https://github.com/TheOrdinaryWow/svelte-adapter-bun-next/)
