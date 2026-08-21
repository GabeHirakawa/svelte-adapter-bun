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
| `precompress` | `boolean \| CompressOptions` | `false` | Write `.gz` / `.br` siblings next to client and prerendered files |
| `envPrefix` | `string` | `''` | Prefix for deploy env (`HOST`, `PORT`, `SOCKET_PATH`, `ORIGIN`, forwarded-header names) |
| `development` | `boolean` | `false` | Enable development mode (disables minification) |
| `dynamic_origin` | `boolean` | `false` | Enable dynamic origin support |
| `xff_depth` | `number` | `1` | Fallback `XFF_DEPTH` when the deploy env is unset |
| `assets` | `boolean` | `true` | Serve `client/` and `prerendered/` (including precompressed siblings). Set `false` to let a CDN / SvelteKit handle them |

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

The runtime serves those siblings when `Accept-Encoding` includes `br` or `gzip` (brotli first). Set `assets: false` if something else should serve the files.

## WebSocket Support

Export `websocket` from `src/hooks.server.ts` (`Bun.WebSocketHandler`). Upgrade inside `handle` with `event.platform.server.upgrade(event.platform.request)`:

```ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.headers.get('connection')?.toLowerCase().includes('upgrade') &&
    request.headers.get('upgrade')?.toLowerCase() === 'websocket' &&
    url.pathname.startsWith('/ws')
  ) {
    await event.platform.server.upgrade(event.platform.request);
    return new Response(null, { status: 101 });
  }

  return resolve(event);
};

export const websocket: Bun.WebSocketHandler = {
  open(ws) {
    ws.send('Welcome!');
  },
  message(ws, message) {
    ws.send(message);
  },
};
```

`event.platform` is `{ server, request }`. Declare it on `App.Platform` in `src/app.d.ts`:

```ts
declare global {
  namespace App {
    interface Platform {
      server: Bun.Server;
      request: Request;
    }
  }
}

export {};
```

Connect from the client:

```js
const ws = new WebSocket('ws://localhost:3000/ws');
ws.onmessage = (event) => console.log(event.data);
ws.send('Hello, server!');
```

See `src/hooks.example.ts` for a complete example.

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

`ADDRESS_HEADER` and `XFF_DEPTH` control `event.getClientAddress()`. With no `ADDRESS_HEADER`, the adapter uses `Bun.Server.requestIP`. When `ADDRESS_HEADER` is `X-Forwarded-For`, the address is read from the **right** by `XFF_DEPTH` (trusted proxies). The request’s `X-Forwarded-For` header is not rewritten.

```
ADDRESS_HEADER=X-Forwarded-For XFF_DEPTH=2 bun ./build/index.js
```

`BODY_SIZE_LIMIT` caps the request body (`512K` default; suffixes `K` / `M` / `G`). `Infinity`, `0`, or `none` disables the cap (adapter-node’s documented off switch — gornostay rejects `Infinity`).

`IDLE_TIMEOUT` is Bun’s **per-connection** idle timeout in seconds (`10` default, range `0`–`255`). Values outside that range fail at boot instead of crashing `Bun.serve`. This is not adapter-node’s process idle-shutdown timer.

```
BODY_SIZE_LIMIT=2M IDLE_TIMEOUT=30 bun ./build/index.js
```

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

## Migrating from gornostay25/svelte-adapter-bun

Public runtime shape is the same: deploy env names (`HOST`, `PORT`, `SOCKET_PATH`, `ORIGIN`, forwarded-header names), `export const websocket` plus `event.platform.server.upgrade(event.platform.request)`, and `ADDRESS_HEADER` / `XFF_DEPTH` for `event.getClientAddress()`.

Intentional differences:

| Topic | This adapter | Why |
|--------|----------------|-----|
| Adapt/bundle | `Bun.build` + adapter-node dep split (`dependencies` external, `devDependencies` bundled) | Rolldown inside `adapt()` is out of scope; it caused `lifecycle_outside_component` in apps using this adapter |
| Listen | With no `envPrefix`, `port` is omitted so Bun 1.4 can read `PORT` / `BUN_PORT` / `NODE_PORT` | Passing `port: 3000` always shadows those vars |
| Client address | One policy: `ADDRESS_HEADER` (XFF from the right by `XFF_DEPTH`) or `Bun.Server.requestIP`. The incoming `X-Forwarded-For` header is not rewritten. Bad `XFF_DEPTH` / a missing address header fail the request | The previous split (rewrite-from-the-right, then read left-most, else `127.0.0.1`) was two policies and hid the real peer |
| `xff_depth` option | Still accepted; used only when `XFF_DEPTH` is unset | Deploy env is the runtime source of truth, matching the rest of deploy env |
| Assets | `assets` (not `serveAssets`). `Bun.file` plus `.br` / `.gz` negotiation, not sirv | Avoid a Node static-server dependency; precompress already wrote the siblings |
| `BODY_SIZE_LIMIT` | `Infinity` / `0` / `none` disable the cap | adapter-node’s documented off switch; gornostay rejects `Infinity` at boot |
| `IDLE_TIMEOUT` | Must be `0`–`255` (Bun per-connection idle). Out-of-range values throw a clear error | Bun will crash on `256+`. This is not adapter-node’s process idle-shutdown |

Not ported yet: HTTP range requests.

## License

MIT
