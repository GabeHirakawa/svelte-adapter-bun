export type ShutdownReason = "SIGINT" | "SIGTERM";

export type ShutdownHooks = {
  stop: (closeActive?: boolean) => void | Promise<void>;
  exit: (code: number) => void;
  emit: (event: string, reason: ShutdownReason) => void;
};

export async function gracefulShutdown(
  hooks: ShutdownHooks,
  reason: ShutdownReason,
): Promise<void> {
  hooks.emit("sveltekit:shutdown", reason);
  await hooks.stop(true);
  hooks.exit(0);
}
