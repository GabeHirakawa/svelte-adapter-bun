# svelte-adapter-bun

A SvelteKit adapter that emits a Bun deploy directory. Runtime contracts follow current gornostay25/svelte-adapter-bun. The build contract follows adapter-node’s dep split, implemented with Bun.build.

## Language

**Adapt/bundle**:
The module that turns SvelteKit builder output into a Bun deploy directory. This pass is only Bun.build plus the dep split — not runtime tokens, hosts, or WebSocket.
_Avoid_: rolldown path, smart bundling, build wrapper

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
