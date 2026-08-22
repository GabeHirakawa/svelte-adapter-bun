# svelte-adapter-bun

A SvelteKit adapter that emits a Bun deploy directory. Runtime contracts follow the **shape** of current gornostay25/svelte-adapter-bun (deploy env names, `export const websocket`, `{ server, request }` platform). Intentional divergences are listed under “Migrating from gornostay25/svelte-adapter-bun” in the README. The build contract follows adapter-node’s dep split, implemented with Bun.build.

## Language

**Adapt/bundle**:
The module that turns SvelteKit builder output into a Bun deploy directory. Dep split and Bun.build. Adapter options reach the runtime through `define` (`ENV_PREFIX`, `BUILD_OPTIONS`), not string replace on the entry file. Intermediate files go in `builder.getBuildDirectory("adapter-bun")`. Targets SvelteKit 2.31+ (developed on 2.70); not Kit 3.
Runtime files for the deploy entry come from `files`, then `dist/files`, then `src` next to the adapter module.
_Avoid_: rolldown path, smart bundling, regex tokens, Kit 3 Adapter.vite, hardcoded `.svelte-kit/svelte-adapter-bun`

**Dep split**:
The adapter-node rule: production dependencies stay external, including deep exports (`pkg/subpath`); everything else is bundled into the server output.
_Avoid_: tree shaking, packages: external (that marks every package external)

**Production dependency**:
A package listed in the app’s `package.json` `dependencies`. It is not inlined at adapt time and must be installed in the deploy directory.
_Avoid_: runtime package, external package

**Dev dependency**:
A package listed in `devDependencies`. It is inlined into the server output and is not installed at deploy.
_Avoid_: bundled package

**Deploy directory**:
The `out` folder Adapt/bundle writes: server bundle, client/prerendered assets, `package.json` with production dependencies, and `bun.lock` when the app has one.
_Avoid_: dist, build output (ambiguous with the adapter’s own package build)

**Deploy env**:
The listen and origin names Adapt/bundle’s runtime reads: `HOST`, `PORT`, `SOCKET_PATH`, `ORIGIN`, and the forwarded-header names. `envPrefix` applies only to these names.
_Avoid_: $env, PUBLIC_ vars, app env

**Listen options**:
What `listenFromEnv` returns for `Bun.serve`: a Unix socket, or optional `hostname` / `port`. With no prefix, `port` is omitted so Bun reads `PORT` / `BUN_PORT` / `NODE_PORT`.
_Avoid_: server options, bind config

**Kit websocket**:
The `export const websocket` (`Bun.WebSocketHandler`) from `hooks.server`. Adapt/bundle patches the Vite server so `Server.websocket()` returns it, and `Bun.serve` uses that handler.
_Avoid_: handleWebsocket, adapter websocket option

**Kit platform**:
`event.platform` is `{ server, request }` so `handle` can call `event.platform.server.upgrade(event.platform.request)`. Apps pick this up with `/// <reference types="@gkh/svelte-adapter-bun" />` in `src/app.d.ts`, which also pulls `bun-types` so `Bun.redis` and other Bun globals typecheck. Do not ask apps to copy `App.Platform` by hand.
_Avoid_: isBun, upgrade callback, documenting a handwritten Platform block as the setup step

**Client address**:
What `getClientAddress` returns for SvelteKit. If `ADDRESS_HEADER` is set, read that header (for `x-forwarded-for`, from the right by `XFF_DEPTH`). If it is unset, use `Bun.Server.requestIP`. Do not rewrite the request’s `X-Forwarded-For`.
_Avoid_: left-most XFF, 127.0.0.1 fallback

**Serve assets**:
When `assets` is true, the runtime serves files from `client/` and `prerendered/`, including `.br` / `.gz` siblings when `Accept-Encoding` asks. `Range: bytes=` is `206`: one range via `Bun.file.slice`, several as `multipart/byteranges`. When false, those requests go to SvelteKit.
_Avoid_: sirv, serveAssets

**Serve limits**:
`BODY_SIZE_LIMIT` (bytes, optional K/M/G) becomes `Bun.serve` `maxRequestBodySize`. `IDLE_TIMEOUT` is Bun’s per-connection idle seconds (0–255). `Infinity` / `0` / `none` disable the body cap.
_Avoid_: process idle shutdown (adapter-node’s meaning of IDLE_TIMEOUT)

**Request origin**:
The public URL origin for `event.url`. `ORIGIN` wins. Otherwise forwarded proto from `PROTOCOL_HEADER` (when present) + `HOST_HEADER` or `Host` + optional `PORT_HEADER` (only when the host has no port). When forwarded proto is unset or not configured, use the incoming request URL protocol (`http` vs `https`).
_Avoid_: request.url as-is, default http

**Kit read**:
`supports.read` is true. `Server.init` gets `read` that streams a file under `client` + `paths.base` via `Bun.file`, using the same path-traversal rule as serve assets.
_Avoid_: no init.read, Node createReadableStream

**Kit instrumentation**:
`supports.instrumentation` is true. After Bun.build, if the app has `instrumentation.server.js`, copy it next to the entry and `builder.instrument` wraps `index.js` so that file runs first.
_Avoid_: live exports on the Bun entry, Kit 3 Adapter.vite

**sveltekit:shutdown**:
On `SIGINT` / `SIGTERM`, emit `process` `sveltekit:shutdown` with that reason, then `Bun.serve.stop(true)`, then `exit(0)`, so apps can flush work.
_Avoid_: process-idle IDLE reason (adapter-node systemd)
