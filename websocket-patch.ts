/**
 * Patch Vite-built SvelteKit server source so hooks.server `export const websocket`
 * is kept on Server.#options.hooks and exposed as Server.websocket().
 */
export function patchServerWebsocketSource(source: string): string {
  if (!source.includes("get_hooks") && !source.includes("async init")) {
    return source;
  }

  return source
    .replace(
      /(const (.*?) = await get_hooks\(\);)\s+(this\.#options\.hooks\s+=\s+{)/,
      "$1$3websocket: $2.websocket || null,",
    )
    .replace(/(async function get_hooks\(\) {)/, "$1let websocket;")
    .replace(/(\({handle,)((.|\s)*?return {)/, "$1websocket,$2websocket,")
    .replace(
      /(async init\({ env, read }\) {)/,
      "websocket() {return this.#options.hooks.websocket}\n$1",
    );
}
