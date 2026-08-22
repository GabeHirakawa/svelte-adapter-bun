# Kitchen-sink example

A SvelteKit app that is also the adapter’s end-to-end contract suite. It is not a
minimal hello-world — every public runtime surface in `CONTEXT.md` has a route or
deploy-dir assertion behind it.

## What it covers

| Contract | How this app hits it |
| --- | --- |
| Adapt / bundle | `bun --bun vite build` + `svelte-adapter-bun` writes `build/` |
| Dep split | `dequal` is a production dependency; `clsx` is a bundled `devDependency` |
| Deploy directory | `index.js`, `package.json`, `bun.lock`, `client/`, `prerendered/` |
| Deploy env / listen | `HOST`, `PORT`, `SOCKET_PATH`, optional `ADAPTER_ENV_PREFIX` |
| Request origin | `/api/probe` reports `event.url`; form actions need a matching origin |
| Client address | `/api/probe` reports `getClientAddress()` |
| Kit platform | probe includes `{ server, request }` keys |
| Kit websocket | `/ws` upgrades via `event.platform.server.upgrade` |
| Serve assets | `/adapter-probe.txt` and prerendered `/about` with `.br` / `.gz` |
| Range | single `206`, multipart `206`, unsatisfiable `416` |
| Serve limits | `BODY_SIZE_LIMIT` on `POST /api/echo`; `IDLE_TIMEOUT` at boot |
| Kit read | `GET /api/read` uses `read` from `$app/server` |
| Instrumentation | `src/instrumentation.server.ts` sets a global before the entry runs |
| sveltekit:shutdown | `ADAPTER_SHUTDOWN_MARK` is written on `SIGINT` / `SIGTERM` |
| assets: false | rebuild with `ADAPTER_ASSETS=false` so static files skip the adapter |

Adapter options that only apply at adapt time can be set when building:

```sh
ADAPTER_ENV_PREFIX=MY_ ADAPTER_ASSETS=false ADAPTER_XFF_DEPTH=2 bun run build
```

## Run locally

From the repository root:

```sh
bun run build
cd examples/kitchen-sink
bun install
bun run build
ORIGIN=http://127.0.0.1:3000 PORT=3000 bun ./build/index.js
```

Then open `/`, `/about`, `/form`, `/ws`, and `/api/probe`.

## Tests

The repo-root file `example.test.ts` builds this app and drives the running
server. It is part of `bun test`.
