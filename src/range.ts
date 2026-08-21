export type ByteRange =
  | { kind: "none" }
  | { kind: "range"; start: number; end: number }
  | { kind: "unsatisfiable" };

export function parseByteRange(header: string | undefined | null, size: number): ByteRange {
  if (!header) {
    return { kind: "none" };
  }

  const match = header.match(/^bytes=(.+)$/i);
  if (!match?.[1]) {
    return { kind: "none" };
  }

  const spec = match[1];
  if (spec.includes(",")) {
    return { kind: "none" };
  }

  if (size <= 0) {
    return { kind: "unsatisfiable" };
  }

  if (spec.startsWith("-")) {
    const suffix = Number(spec.slice(1));
    if (!Number.isInteger(suffix) || suffix <= 0) {
      return { kind: "unsatisfiable" };
    }
    const start = Math.max(0, size - suffix);
    return { kind: "range", start, end: size - 1 };
  }

  const [rawStart, rawEnd] = spec.split("-");
  const start = Number(rawStart);
  if (!Number.isInteger(start) || start < 0 || start >= size) {
    return { kind: "unsatisfiable" };
  }

  const end = rawEnd === "" || rawEnd === undefined ? size - 1 : Number(rawEnd);
  if (!Number.isInteger(end) || end < start) {
    return { kind: "unsatisfiable" };
  }

  return { kind: "range", start, end: Math.min(end, size - 1) };
}

export function applyByteRange(
  file: Bun.BunFile,
  size: number,
  rangeHeader: string | null | undefined,
  method: string,
): { body: Bun.BunFile | null; status: number; headers: Record<string, string> } {
  const parsed = parseByteRange(rangeHeader, size);
  const headers: Record<string, string> = {
    "accept-ranges": "bytes",
  };

  if (parsed.kind === "unsatisfiable") {
    headers["content-range"] = `bytes */${size}`;
    return { body: null, status: 416, headers };
  }

  if (parsed.kind === "range") {
    headers["content-range"] = `bytes ${parsed.start}-${parsed.end}/${size}`;
    headers["content-length"] = String(parsed.end - parsed.start + 1);
    const body = method === "HEAD" ? null : file.slice(parsed.start, parsed.end + 1);
    return { body, status: 206, headers };
  }

  headers["content-length"] = String(size);
  return { body: method === "HEAD" ? null : file, status: 200, headers };
}

export function fileRangeResponse(
  filePath: string,
  request: Request,
  extraHeaders: Record<string, string>,
): Response {
  const file = Bun.file(filePath);
  const size = file.size;
  const ranged = applyByteRange(file, size, request.headers.get("range"), request.method);
  return new Response(ranged.body, {
    status: ranged.status,
    headers: { ...extraHeaders, ...ranged.headers },
  });
}
