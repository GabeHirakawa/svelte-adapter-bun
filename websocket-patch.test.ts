import { describe, expect, test } from "bun:test";
import { patchServerWebsocketSource } from "./websocket-patch.ts";

const currentKitInit = `
async init({ env, read }) {
  const module = await get_hooks();
  this.#options.hooks = {
    handle: module.handle || (({ event, resolve }) => resolve(event)),
    handleError: module.handleError || (({ error }) => console.error(error)),
  };
}
`;

const reconstructedGetHooks = `
async function get_hooks() {
  ({handle, handleError, handleFetch} = await user_hooks());
  return { handle, handleError, handleFetch };
}
`;

describe("patchServerWebsocketSource", () => {
  test("copies module.websocket onto hooks and exposes Server.websocket()", () => {
    const patched = patchServerWebsocketSource(currentKitInit);

    expect(patched).toContain("websocket: module.websocket || null,");
    expect(patched).toContain("websocket() {return this.#options.hooks.websocket}");
    expect(patched.indexOf("websocket() {return this.#options.hooks.websocket}")).toBeLessThan(
      patched.indexOf("async init({ env, read })"),
    );
  });

  test("threads websocket through a reconstructed get_hooks object", () => {
    const patched = patchServerWebsocketSource(reconstructedGetHooks);

    expect(patched).toContain("async function get_hooks() {let websocket;");
    expect(patched).toContain("({handle, websocket,");
    expect(patched).toContain("return { websocket, handle,");
  });

  test("threads websocket through Kit 2.70 spaced get_hooks destructure", () => {
    const source = `
async function get_hooks() {
  let handle;
  ({ handle, handleFetch, handleError, handleValidationError, init } = await import("../entries/hooks.server.js"));
  return {
    handle,
    handleFetch,
    handleError,
    handleValidationError,
    init,
  };
}
`;
    const patched = patchServerWebsocketSource(source);
    expect(patched).toContain("({ handle, websocket, handleFetch,");
    expect(patched).toContain("return {\n    websocket, handle,");
  });

  test("leaves unrelated server source unchanged", () => {
    const source = "export const prerendered = new Set([]);\n";
    expect(patchServerWebsocketSource(source)).toBe(source);
  });
});
