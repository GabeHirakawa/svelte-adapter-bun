# svelte-adapter-bun

A high-performance SvelteKit adapter that leverages Bun's native APIs for optimal speed and efficiency.

## Features

- 🚀 **Native Bun Runtime**: Utilizes Bun's built-in APIs for maximum performance
- 📦 **Smart Bundling**: Bundles dev dependencies while keeping production dependencies external (same strategy as `@sveltejs/adapter-node`)
- 🔄 **Built-in Compression**: Supports Brotli and Gzip compression for static assets
- 📁 **Static Asset Handling**: Efficient serving of static files with proper caching headers
- 🌐 **Native WebSocket Support**: Built-in WebSocket handler using Bun's native WebSocket API
- 🔧 **Zero Config**: Works out of the box with sensible defaults
- 🎯 **Production Ready**: Generates minimal, optimized builds for deployment

## Installation

```bash
bun add -D svelte-adapter-bun
```

## Usage

In your `svelte.config.js`:

```js
import adapter from 'svelte-adapter-bun';

export default {
  kit: {
    adapter: adapter({
      // Options
    })
  }
};
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `out` | `string` | `'build'` | The directory to write the built files to |
| `precompress` | `boolean \| CompressOptions` | `false` | Enable precompression of assets |
| `envPrefix` | `string` | `''` | Prefix for environment variables |
| `development` | `boolean` | `false` | Enable development mode (disables minification) |
| `dynamic_origin` | `boolean` | `false` | Enable dynamic origin support |
| `xff_depth` | `number` | `1` | X-Forwarded-For depth for trusted proxies |
| `assets` | `boolean` | `true` | Serve static assets |

### Compression Options

```js
adapter({
  precompress: {
    brotli: true,    // Enable Brotli compression
    gzip: true,      // Enable Gzip compression
    files: ['html', 'js', 'css', 'svg', 'xml'] // File extensions to compress
  }
})
```

## WebSocket Support

This adapter includes native WebSocket support using Bun's WebSocket API. To use WebSockets in your SvelteKit app:

1. Create a `src/hooks.server.ts` file:

```ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};

// Export WebSocket handlers
export const handleWebsocket = {
  open(ws) {
    console.log('WebSocket opened');
    ws.send('Welcome!');
  },
  
  message(ws, message) {
    console.log('Received:', message);
    ws.send(`Echo: ${message}`);
  },
  
  close(ws, code, reason) {
    console.log('WebSocket closed:', code, reason);
  },
  
  // Optional: Control upgrade behavior
  upgrade(request, server) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      return true; // Upgrade to WebSocket
    }
    return false;
  }
};
```

2. Connect from the client:

```js
const ws = new WebSocket('ws://localhost:3000/ws');
ws.onmessage = (event) => console.log(event.data);
ws.send('Hello, server!');
```

See `src/hooks.example.ts` for a complete WebSocket implementation example.

## Environment Variables

`envPrefix` prefixes the **deploy** variables (`HOST`, `PORT`, `SOCKET_PATH`, `ORIGIN`, and the forwarded-header names), not SvelteKit `$env` / `PUBLIC_*` app vars.

```js
adapter({
  envPrefix: 'MY_'
})
```

```
MY_HOST=127.0.0.1 MY_PORT=4000 MY_ORIGIN=https://my.site bun ./build/index.js
```

With no prefix, `PORT` is omitted from `Bun.serve` so Bun 1.4 can read `PORT`, `BUN_PORT`, or `NODE_PORT`. Set `SOCKET_PATH` to listen on a Unix socket instead.

## Building and Running

After building your app:

```bash
bun run build
```

The adapter generates a minimal `package.json` in the build directory. To run the server:

```bash
cd build
bun install --production
bun ./index.js
```

Or simply:

```bash
bun ./build/index.js
```

## Production Deployment

The build output is optimized for production:

- All dev dependencies are bundled into the server code
- Only production dependencies need to be installed
- Static assets are precompressed (if enabled)
- Server code is minified (unless in development mode)

## Docker Example

```dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

# Copy build output
COPY build build/
COPY package.json .

# Install only production dependencies
RUN cd build && bun install --production

EXPOSE 3000
CMD ["bun", "./build/index.js"]
```

## Performance

This adapter leverages Bun's native features for optimal performance:

- Native file I/O operations using `Bun.file()`
- Built-in compression with `Bun.gzipSync()`
- Native HTTP server with `Bun.serve()`
- Zero-overhead WebSocket support
- Efficient bundling with `Bun.build()`

## Differences from adapter-node

While maintaining API compatibility with `@sveltejs/adapter-node`, this adapter:

- Uses Bun's native APIs instead of Node.js APIs
- Provides built-in WebSocket support without additional dependencies
- Leverages Bun's bundler for faster builds
- Offers better performance and lower memory usage

## Migration from adapter-node

1. Install the adapter: `bun add -D svelte-adapter-bun`
2. Update `svelte.config.js` to use the new adapter
3. Replace `npm/yarn` commands with `bun` equivalents
4. Enjoy the performance boost! ��

## License

MIT
