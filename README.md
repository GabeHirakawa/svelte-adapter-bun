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

## Example app

`examples/kitchen-sink` is a SvelteKit app that exercises every adapter contract
(deploy output, listen/origin env, client address, assets, ranges, WebSocket,
`$app/server` `read`, instrumentation, and shutdown). `example.test.ts` builds
that app and hits the running Bun server.

```bash
bun run build
cd examples/kitchen-sink
bun install
bun run build
# adapt() uses Bun.build / Bun.file — the example script is `bun --bun vite build`
ORIGIN=http://127.0.0.1:3000 bun ./build/index.js
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

The runtime serves those siblings when `Accept-Encoding` includes `br` or `gzip` (brotli first). `Range: bytes=` is `206`: one range via `Bun.file.slice`, several as `multipart/byteranges` (unsatisfiable extras are dropped; if none remain the response is `416`). Set `assets: false` if something else should serve the files.

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

`event.platform` is `{ server, request }`. Do not copy that interface by hand.
Reference the adapter from `src/app.d.ts` so TypeScript loads `bun-types` and
augments `App.Platform` in one step:

```ts
/// <reference types="@gkh/svelte-adapter-bun" />

declare global {
  namespace App {
    // Platform is { server: Bun.Server; request: Request } from the adapter.
    // Add your own fields here if you put extra data on event.platform.
  }
}

export {};
```

That reference is how you get **Bun globals** as well (`Bun.redis`, `Bun.file`,
`Bun.sql`, `Bun.s3`, …). Those live on the `Bun` namespace from `bun-types`,
not on `event.platform`. The adapter does not wrap them — they are process-wide
once the app is running on Bun. `App.Platform` is only the per-request object
passed into `server.respond` so `handle` can call
`event.platform.server.upgrade(event.platform.request)`.

Install `bun-types` next to the adapter (`bun add -d bun-types`). Without the
reference (or a `/// <reference types="bun-types" />` of your own), `Bun` is an
unknown name and `event.platform` stays Kit’s empty `Platform`.

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

The public origin for `event.url` is `ORIGIN` if set. Otherwise it is `PROTOCOL_HEADER` (default `https` — typical behind a TLS-terminating proxy) + `HOST_HEADER` or the request `Host` + optional `PORT_HEADER` (appended only when the host has no port). If `PROTOCOL_HEADER` is unset, the protocol is `https` so CSRF checks match the browser origin when Bun.serve only saw `http`.

`read` from `$app/server` works. The adapter claims `supports.read` and `Server.init` streams files from `client/` (plus Kit `paths.base`) via `Bun.file`.

`src/instrumentation.server.ts` is supported when you opt into `kit.experimental.instrumentation.server`. The adapter copies that file next to the Bun entry and wraps `index.js` so instrumentation loads first. The entry has no live exports.

On `SIGINT` / `SIGTERM` the runtime emits `sveltekit:shutdown` (same event as adapter-node) before `Bun.serve.stop(true)`. Listen on `process` to flush databases or jobs. There is no systemd `IDLE` reason.

`BODY_SIZE_LIMIT` caps the request body (`512K` default; suffixes `K` / `M` / `G`). `Infinity`, `0`, or `none` disables the cap (adapter-node’s documented off switch — gornostay rejects `Infinity`).

`IDLE_TIMEOUT` is Bun’s **per-connection** idle timeout in seconds (`10` default, range `0`–`255`). Values outside that range fail at boot instead of crashing `Bun.serve`. This is not adapter-node’s process idle-shutdown timer.

```
BODY_SIZE_LIMIT=2M IDLE_TIMEOUT=30 bun ./build/index.js
```

## Building and Running

After building your app with Bun (`bun --bun vite build` or `bun run build`
if the script already uses Bun):

```bash
bun --bun vite build
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
| Assets | `assets` (not `serveAssets`). `Bun.file` plus `.br` / `.gz` negotiation, not sirv. Single and multipart `Range: bytes=` via `Bun.file.slice` | Avoid a Node static-server dependency; precompress already wrote the siblings |
| `BODY_SIZE_LIMIT` | `Infinity` / `0` / `none` disable the cap | adapter-node’s documented off switch; gornostay rejects `Infinity` at boot |
| `IDLE_TIMEOUT` | Must be `0`–`255` (Bun per-connection idle). Out-of-range values throw a clear error | Bun will crash on `256+`. This is not adapter-node’s process idle-shutdown |
| Request origin | `ORIGIN`, or forwarded headers with protocol default `https`. Empty `HOST_HEADER` means use `Host`. `PORT_HEADER` is not appended when the host already has a port | Same shape as gornostay. Default `https` keeps CSRF working behind TLS-terminating proxies (`request.url` on Bun.serve is usually `http`) |
| `development` / `dynamic_origin` | Not accepted | Leftover from old gornostay. Current gornostay dropped them. Origin is always `ORIGIN` or forwarded headers; we do not minify the Bun entry |

## License

MIT
