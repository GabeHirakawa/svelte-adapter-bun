export type RequestOriginOptions = {
  origin?: string;
  protocolHeader?: string;
  hostHeader?: string;
  portHeader?: string;
  fallbackProtocol?: "http" | "https";
  headers: Headers;
};

function forwardedProtocol(value: string | null): "http" | "https" | undefined {
  if (!value) {
    return undefined;
  }
  const first = value.split(",")[0]?.trim().toLowerCase();
  return first === "http" || first === "https" ? first : undefined;
}

export function requestOrigin({
  origin,
  protocolHeader,
  hostHeader,
  portHeader,
  fallbackProtocol,
  headers,
}: RequestOriginOptions): string | undefined {
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  const protocol =
    forwardedProtocol(protocolHeader ? headers.get(protocolHeader) : null) ??
    fallbackProtocol ??
    "https";
  const host = ((hostHeader && headers.get(hostHeader)) || headers.get("host") || "").trim();
  if (!host) {
    return undefined;
  }

  const port = portHeader ? headers.get(portHeader)?.trim() : undefined;
  const portAlreadyOnHost = /:\d+$/.test(host);
  if (
    !portAlreadyOnHost &&
    port &&
    /^\d+$/.test(port) &&
    Number.parseInt(port, 10) >= 1 &&
    Number.parseInt(port, 10) <= 65535
  ) {
    return `${protocol}://${host}:${port}`;
  }

  return `${protocol}://${host}`;
}
