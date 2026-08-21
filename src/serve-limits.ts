export type ServeLimitSource = {
  BODY_SIZE_LIMIT?: string;
  IDLE_TIMEOUT?: string;
};

export type ServeLimits = {
  idleTimeout: number;
  maxRequestBodySize?: number;
};

const UNITS: Record<string, number> = {
  B: 1,
  K: 1024,
  M: 1024 * 1024,
  G: 1024 * 1024 * 1024,
};

export function parseBodySizeLimit(value: string): number | undefined {
  const trimmed = value.trim();
  if (/^(infinity|inf|none|0)$/i.test(trimmed)) {
    return undefined;
  }

  const unit = trimmed.at(-1)?.toUpperCase() ?? "";
  const multiplier = UNITS[unit];
  const amount = multiplier ? trimmed.slice(0, -1) : trimmed;
  const parsed = Number(amount) * (multiplier ?? 1);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(
      `Invalid BODY_SIZE_LIMIT: '${value}'. Use a byte count, an optional K/M/G suffix, or Infinity to disable.`,
    );
  }

  return parsed;
}

export function parseIdleTimeout(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
    throw new Error(
      `IDLE_TIMEOUT must be an integer from 0 to 255 (Bun per-connection idle seconds), got: '${value}'`,
    );
  }
  return parsed;
}

export function serveLimits(source: ServeLimitSource): ServeLimits {
  const maxRequestBodySize = parseBodySizeLimit(source.BODY_SIZE_LIMIT ?? "512K");
  const idleTimeout = parseIdleTimeout(source.IDLE_TIMEOUT ?? "10");
  return maxRequestBodySize === undefined
    ? { idleTimeout }
    : { idleTimeout, maxRequestBodySize };
}
