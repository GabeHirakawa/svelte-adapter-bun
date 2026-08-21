export type EnvSource = Record<string, string | undefined>;

export type ReadEnvOptions = {
  prefix: string;
  source: EnvSource;
  fallback?: string;
};

export type ListenOptions = { unix: string } | { hostname?: string; port?: number };

const DEPLOY_ENV_NAMES = new Set([
  "SOCKET_PATH",
  "HOST",
  "PORT",
  "ORIGIN",
  "XFF_DEPTH",
  "ADDRESS_HEADER",
  "PROTOCOL_HEADER",
  "HOST_HEADER",
  "PORT_HEADER",
  "BODY_SIZE_LIMIT",
  "IDLE_TIMEOUT",
]);

function runtimePrefix(): string {
  return typeof ENV_PREFIX === "undefined" ? "" : ENV_PREFIX;
}

export function readEnv(name: string, options: ReadEnvOptions): string | undefined {
  const key = `${options.prefix}${name}`;
  const value = options.source[key];
  if (value !== undefined) {
    return value;
  }
  return options.fallback;
}

export function env(name: string): string | undefined;
export function env(name: string, defaultValue: string | number): string;
export function env(name: string, defaultValue?: string | number): string | undefined {
  return readEnv(name, {
    prefix: runtimePrefix(),
    source: Bun.env,
    fallback: arguments.length > 1 ? (defaultValue === undefined ? undefined : String(defaultValue)) : undefined,
  });
}

function assertExpectedPrefixedVars(prefix: string, source: EnvSource): void {
  if (!prefix) {
    return;
  }

  for (const name of Object.keys(source)) {
    if (!name.startsWith(prefix)) {
      continue;
    }
    const unprefixed = name.slice(prefix.length);
    if (!DEPLOY_ENV_NAMES.has(unprefixed)) {
      throw new Error(
        `You should change envPrefix (${prefix}) to avoid conflicts with existing environment variables — unexpectedly saw ${name}`,
      );
    }
  }
}

export function listenFromEnv(prefix: string, source: EnvSource): ListenOptions {
  assertExpectedPrefixedVars(prefix, source);

  const socketPath = readEnv("SOCKET_PATH", { prefix, source });
  if (socketPath) {
    return { unix: socketPath };
  }

  if (prefix) {
    return {
      hostname: readEnv("HOST", { prefix, source, fallback: "0.0.0.0" }),
      port: Number.parseInt(readEnv("PORT", { prefix, source, fallback: "3000" }) as string, 10),
    };
  }

  const hostname = readEnv("HOST", { prefix, source });
  return hostname ? { hostname } : {};
}

export function envInt(name: string, defaultValue?: number): number {
  const value = defaultValue !== undefined ? env(name, defaultValue.toString()) : env(name);

  if (value === undefined) {
    throw new Error(`Environment variable ${name} is required for integer parsing`);
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid integer, got: ${value}`);
  }

  return parsed;
}

export function envBool(name: string, defaultValue?: boolean): boolean {
  const value = defaultValue !== undefined ? env(name, defaultValue.toString()) : env(name);

  if (value === undefined) {
    return false;
  }

  const str = String(value).toLowerCase();
  return str === "true" || str === "1" || str === "yes" || str === "on";
}
