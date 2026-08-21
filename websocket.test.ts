import { describe, expect, test } from "bun:test";
import { kitPlatform, websocketFromKitServer } from "./src/websocket.ts";

describe("kitPlatform", () => {
  test("is { server, request } so handle can upgrade the original request", () => {
    const request = new Request("http://localhost/ws", {
      headers: { upgrade: "websocket" },
    });
    const server = { upgrade: () => true };

    expect(kitPlatform(server as unknown as Bun.Server, request)).toEqual({
      server,
      request,
    });
  });
});

describe("websocketFromKitServer", () => {
  test("returns Server.websocket() after the Vite server has been patched", () => {
    const handler = { message() {} };
    const kitServer = { websocket: () => handler };

    expect(websocketFromKitServer(kitServer)).toBe(handler);
  });

  test("returns undefined when hooks did not export websocket", () => {
    expect(websocketFromKitServer({})).toBeUndefined();
    expect(websocketFromKitServer({ websocket: () => null })).toBeUndefined();
  });
});
