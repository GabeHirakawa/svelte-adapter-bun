import { describe, expect, test } from "bun:test";
import { gracefulShutdown } from "./src/shutdown.ts";

describe("gracefulShutdown", () => {
  test("emits sveltekit:shutdown then stops active connections then exits", async () => {
    const order: string[] = [];
    await gracefulShutdown(
      {
        emit(event, reason) {
          order.push(`${event}:${reason}`);
        },
        async stop(closeActive) {
          order.push(`stop:${closeActive}`);
        },
        exit(code) {
          order.push(`exit:${code}`);
        },
      },
      "SIGTERM",
    );
    expect(order).toEqual(["sveltekit:shutdown:SIGTERM", "stop:true", "exit:0"]);
  });
});
