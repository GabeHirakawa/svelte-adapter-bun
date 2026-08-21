export type ByteSpan = { start: number; end: number };

export type ByteRange =
  | { kind: "none" }
  | { kind: "range"; start: number; end: number }
  | { kind: "ranges"; ranges: ByteSpan[] }
  | { kind: "unsatisfiable" };

export type RangeOptions = {
  contentType?: string;
  boundary?: string;
};

function parseOneSpec(spec: string, size: number): ByteSpan | null {
  if (size <= 0) {
    return null;
  }

  if (spec.startsWith("-")) {
    const suffix = Number(spec.slice(1));
    if (!Number.isInteger(suffix) || suffix <= 0) {
      return null;
    }
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const [rawStart, rawEnd] = spec.split("-");
  const start = Number(rawStart);
  if (!Number.isInteger(start) || start < 0 || start >= size) {
    return null;
  }

  const end = rawEnd === "" || rawEnd === undefined ? size - 1 : Number(rawEnd);
  if (!Number.isInteger(end) || end < start) {
    return null;
  }

  return { start, end: Math.min(end, size - 1) };
}

export function parseByteRange(header: string | undefined | null, size: number): ByteRange {
  if (!header) {
    return { kind: "none" };
  }

  const match = header.match(/^bytes=(.+)$/i);
  if (!match?.[1]) {
    return { kind: "none" };
  }

  const specs = match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (specs.length === 0) {
    return { kind: "none" };
  }

  if (size <= 0) {
    return { kind: "unsatisfiable" };
  }

  const ranges = specs
    .map((spec) => parseOneSpec(spec, size))
    .filter((range): range is ByteSpan => range !== null);
  if (ranges.length === 0) {
    return { kind: "unsatisfiable" };
  }
  if (ranges.length === 1) {
    return { kind: "range", start: ranges[0]!.start, end: ranges[0]!.end };
  }

  return { kind: "ranges", ranges };
}

async function multipartBody(
  file: Bun.BunFile,
  size: number,
  ranges: ByteSpan[],
  contentType: string,
  boundary: string,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  for (const range of ranges) {
    parts.push(
      encoder.encode(
        `--${boundary}\r\nContent-Type: ${contentType}\r\nContent-Range: bytes ${range.start}-${range.end}/${size}\r\n\r\n`,
      ),
    );
    parts.push(new Uint8Array(await file.slice(range.start, range.end + 1).arrayBuffer()));
    parts.push(encoder.encode("\r\n"));
  }
  parts.push(encoder.encode(`--${boundary}--\r\n`));

  const body = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.byteLength;
  }
  return body;
}

export async function applyByteRange(
  file: Bun.BunFile,
  size: number,
  rangeHeader: string | null | undefined,
  method: string,
  options: RangeOptions = {},
): Promise<{ body: BodyInit | null; status: number; headers: Record<string, string> }> {
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

  if (parsed.kind === "ranges") {
    const contentType = options.contentType || "application/octet-stream";
    const boundary = options.boundary ?? `adapterbun${crypto.randomUUID().replaceAll("-", "")}`;
    const body = await multipartBody(file, size, parsed.ranges, contentType, boundary);
    headers["content-type"] = `multipart/byteranges; boundary=${boundary}`;
    headers["content-length"] = String(body.byteLength);
    return { body: method === "HEAD" ? null : body, status: 206, headers };
  }

  headers["content-length"] = String(size);
  return { body: method === "HEAD" ? null : file, status: 200, headers };
}

export async function fileRangeResponse(
  filePath: string,
  request: Request,
  extraHeaders: Record<string, string>,
): Promise<Response> {
  const file = Bun.file(filePath);
  const size = file.size;
  const ranged = await applyByteRange(file, size, request.headers.get("range"), request.method, {
    contentType: extraHeaders["content-type"],
  });
  return new Response(ranged.body, {
    status: ranged.status,
    headers: { ...extraHeaders, ...ranged.headers },
  });
}
