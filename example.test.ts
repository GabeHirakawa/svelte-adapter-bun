import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = import.meta.dir;
const EXAMPLE = join(ROOT, "examples/kitchen-sink");
const BUILD = join(EXAMPLE, "build");
const PROBE_TXT = "ADAPTER-PROBE-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ!!";

type Probe = {
  url: string;
  origin: string;
  pathname: string;
  clientAddress: string;
  platform: { keys: string[]; hasServer: boolean; hasRequest: boolean };
  instrumented: boolean;
  prodMarker: string;
  devMarker: string;
  forwardedFor: string | null;
};

type Running = {
  proc: Bun.Subprocess;
  port: number;
  base: string;
};

const children: Bun.Subprocess[] = [];

async function run(cmd: string[], cwd: string, extraEnv: Record<string, string> = {}) {
  const proc = Bun.spawn(cmd, {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exit !== 0) {
    throw new Error(`$ ${cmd.join(" ")} failed (${exit})\n${stdout}\n${stderr}`);
  }
  return stdout + stderr;
}

async function freePort() {
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch() {
      return new Response("");
    },
  });
  const port = server.port;
  server.stop(true);
  return port;
}

async function startServer(
  env: Record<string, string> = {},
  opts: { prefix?: string; wait?: boolean } = {},
): Promise<Running> {
  const prefix = opts.prefix ?? "";
  const port = Number(env[`${prefix}PORT`] ?? env.PORT ?? (await freePort()));
  const listenEnv = prefix
    ? { [`${prefix}HOST`]: "127.0.0.1", [`${prefix}PORT`]: String(port), ...env }
    : { HOST: "127.0.0.1", PORT: String(port), ...env };

  const proc = Bun.spawn(["bun", "./build/index.js"], {
    cwd: EXAMPLE,
    env: { ...process.env, ...listenEnv },
    stdout: "pipe",
    stderr: "pipe",
  });
  children.push(proc);

  const running = { proc, port, base: `http://127.0.0.1:${port}` };
  if (opts.wait === false) {
    return running;
  }

  const deadline = Date.now() + 15_000;
  let last = "";
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      const err = await new Response(proc.stderr).text();
      const out = await new Response(proc.stdout).text();
      throw new Error(`server exited ${proc.exitCode}\n${out}\n${err}`);
    }
    try {
      await fetch(`${running.base}/about`);
      return running;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await Bun.sleep(100);
  }
  throw new Error(`timeout waiting for ${running.base}\n${last}`);
}

async function stop(proc: Bun.Subprocess, signal: NodeJS.Signals = "SIGTERM") {
  if (proc.exitCode === null) {
    proc.kill(signal);
  }
  await proc.exited;
}

async function rawRequest(options: {
  port: number;
  path: string;
  method?: string;
  headers?: Record<string, string>;
}) {
  const extra = Object.entries(options.headers ?? {})
    .map(([name, value]) => `${name}: ${value}`)
    .join("\r\n");
  const payload = `${options.method ?? "GET"} ${options.path} HTTP/1.1\r\nHost: 127.0.0.1:${options.port}\r\nConnection: close\r\n${extra ? `${extra}\r\n` : ""}\r\n`;

  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const socket = createConnection({ host: "127.0.0.1", port: options.port }, () => {
      socket.write(payload);
    });
    socket.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    socket.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    socket.on("error", reject);
  });

  const split = indexOfHeaders(bytes);
  const head = new TextDecoder().decode(bytes.slice(0, split));
  const body = bytes.slice(split + 4);
  const status = Number(head.match(/^HTTP\/1\.[01] (\d+)/)?.[1] ?? 0);
  const headers = new Headers();
  for (const line of head.split("\r\n").slice(1)) {
    const index = line.indexOf(":");
    if (index > 0) {
      headers.append(line.slice(0, index), line.slice(index + 1).trim());
    }
  }
  return { status, headers, body, head };
}

function indexOfHeaders(bytes: Uint8Array) {
  for (let i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) {
      return i;
    }
  }
  throw new Error("HTTP response missing header terminator");
}

async function probe(base: string, headers?: HeadersInit): Promise<Probe> {
  const res = await fetch(`${base}/api/probe`, { headers });
  expect(res.ok).toBe(true);
  return res.json();
}

async function buildExample(env: Record<string, string> = {}) {
  await run(["bun", "run", "build"], EXAMPLE, env);
}

describe("kitchen-sink example", () => {
  let server: Running;

  beforeAll(async () => {
    await run(["bun", "run", "build"], ROOT);
    await run(["rm", "-rf", "node_modules"], EXAMPLE);
    await run(["bun", "install"], EXAMPLE);
    await buildExample();
    const port = await freePort();
    server = await startServer({
      PORT: String(port),
      ORIGIN: `http://127.0.0.1:${port}`,
      BODY_SIZE_LIMIT: "1K",
    });
  }, 180_000);

  afterAll(async () => {
    await Promise.all(children.splice(0).map((child) => stop(child)));
  });

  test("writes a Bun deploy directory with the adapter-node dep split", async () => {
    expect(existsSync(join(BUILD, "index.js"))).toBe(true);
    expect(existsSync(join(BUILD, "package.json"))).toBe(true);
    expect(existsSync(join(BUILD, "bun.lock"))).toBe(true);
    expect(existsSync(join(BUILD, "client", "adapter-probe.txt"))).toBe(true);
    expect(existsSync(join(BUILD, "prerendered", "about.html"))).toBe(true);
    expect(existsSync(join(BUILD, "instrumentation.server.js"))).toBe(true);

    const pkg = await Bun.file(join(BUILD, "package.json")).json();
    expect(pkg.dependencies).toEqual({ dequal: "^2.0.3" });
    expect(pkg.dependencies.clsx).toBeUndefined();
    expect(pkg.scripts.start).toBe("bun ./index.js");

    const probeChunk = await Bun.file(join(BUILD, "server/chunks/probe.js")).text();
    expect(probeChunk).toContain("inlined-dev-helper");
    expect(probeChunk).toMatch(/from\s+["']dequal["']/);
  });

  test("serves SSR, prerendered HTML, and a static file", async () => {
    const home = await fetch(`${server.base}/`);
    expect(home.ok).toBe(true);
    const homeText = await home.text();
    expect(homeText).toContain("Kitchen sink");
    expect(homeText).toContain("dequal-external");

    const about = await fetch(`${server.base}/about`);
    expect(about.ok).toBe(true);
    expect(about.headers.get("content-type")).toMatch(/text\/html/);
    expect(await about.text()).toContain("prerendered-about-marker");

    const asset = await fetch(`${server.base}/adapter-probe.txt`);
    expect(asset.status).toBe(200);
    expect(await asset.text()).toBe(PROBE_TXT);
    expect(asset.headers.get("accept-ranges")).toBe("bytes");
  });

  test("negotiates precompressed siblings over raw HTTP", async () => {
    expect(existsSync(join(BUILD, "prerendered", "about.html.br"))).toBe(true);
    expect(existsSync(join(BUILD, "prerendered", "about.html.gz"))).toBe(true);
    expect(existsSync(join(BUILD, "client", "adapter-probe.txt.br"))).toBe(true);

    const brotli = await rawRequest({
      port: server.port,
      path: "/about",
      headers: { "Accept-Encoding": "br" },
    });
    expect(brotli.status).toBe(200);
    expect(brotli.headers.get("content-encoding")).toBe("br");
    expect(brotli.headers.get("vary")?.toLowerCase()).toContain("accept-encoding");

    const gzip = await rawRequest({
      port: server.port,
      path: "/adapter-probe.txt",
      headers: { "Accept-Encoding": "gzip" },
    });
    expect(gzip.status).toBe(200);
    expect(gzip.headers.get("content-encoding")).toBe("gzip");
    expect(gzip.headers.get("content-type")).toMatch(/text\/plain/);

    const txtBr = await rawRequest({
      port: server.port,
      path: "/adapter-probe.txt",
      headers: { "Accept-Encoding": "br" },
    });
    expect(txtBr.status).toBe(200);
    expect(txtBr.headers.get("content-encoding")).toBe("br");
    expect(txtBr.headers.get("content-type")).toMatch(/text\/plain/);
    expect(txtBr.headers.get("content-disposition") ?? "").not.toMatch(/\.br/i);
  });

  test("serves single, multipart, and unsatisfiable byte ranges", async () => {
    const single = await rawRequest({
      port: server.port,
      path: "/adapter-probe.txt",
      headers: { Range: "bytes=0-13" },
    });
    expect(single.status).toBe(206);
    expect(single.headers.get("content-range")).toBe(`bytes 0-13/${PROBE_TXT.length}`);
    expect(new TextDecoder().decode(single.body)).toBe("ADAPTER-PROBE-");

    const multi = await rawRequest({
      port: server.port,
      path: "/adapter-probe.txt",
      headers: { Range: "bytes=0-6,14-23" },
    });
    expect(multi.status).toBe(206);
    const contentType = multi.headers.get("content-type") ?? "";
    expect(contentType.startsWith("multipart/byteranges; boundary=")).toBe(true);
    const body = new TextDecoder().decode(multi.body);
    expect(body).toContain("ADAPTER");
    expect(body).toContain("0123456789");

    const miss = await rawRequest({
      port: server.port,
      path: "/adapter-probe.txt",
      headers: { Range: "bytes=999-1000" },
    });
    expect(miss.status).toBe(416);
    expect(miss.headers.get("content-range")).toBe(`bytes */${PROBE_TXT.length}`);
  });

  test("exposes origin, platform, instrumentation, and dep markers", async () => {
    const data = await probe(server.base);
    expect(data.origin).toBe(server.base);
    expect(data.pathname).toBe("/api/probe");
    expect(data.platform.keys).toEqual(["request", "server"]);
    expect(data.platform.hasServer).toBe(true);
    expect(data.platform.hasRequest).toBe(true);
    expect(data.instrumented).toBe(true);
    expect(data.prodMarker).toBe("dequal-external");
    expect(data.devMarker).toBe("inlined-dev-helper");
    expect(data.clientAddress).toMatch(/127\.0\.0\.1|::1|::ffff:127\.0\.0\.1/);
  });

  test("reads X-Forwarded-For from the right and does not rewrite it", async () => {
    const xff = await startServer({
      ORIGIN: "http://placeholder",
      ADDRESS_HEADER: "X-Forwarded-For",
      XFF_DEPTH: "2",
    });
    try {
      const header = "spoofed, client, proxy";
      const data = await probe(xff.base, { "x-forwarded-for": header });
      expect(data.clientAddress).toBe("client");
      expect(data.forwardedFor).toBe(header);

      const missing = await fetch(`${xff.base}/api/probe`);
      expect(missing.status).toBe(500);
    } finally {
      await stop(xff.proc);
    }
  });

  test("resolves origin from ORIGIN or forwarded headers", async () => {
    const forwarded = await startServer({
      PROTOCOL_HEADER: "x-forwarded-proto",
      HOST_HEADER: "x-forwarded-host",
      PORT_HEADER: "x-forwarded-port",
    });
    try {
      const data = await probe(forwarded.base, {
        "x-forwarded-proto": "http",
        "x-forwarded-host": "app.example",
        "x-forwarded-port": "8080",
      });
      expect(data.origin).toBe("http://app.example:8080");

      const fallback = await startServer({});
      try {
        const raw = await probe(fallback.base);
        expect(raw.origin).toBe(`https://127.0.0.1:${fallback.port}`);
      } finally {
        await stop(fallback.proc);
      }
    } finally {
      await stop(forwarded.proc);
    }
  });

  test("upgrades /ws with the Kit websocket handler", async () => {
    const messages: string[] = [];
    const ws = new WebSocket(`${server.base.replace("http", "ws")}/ws`);
    const opened = new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => resolve());
      ws.addEventListener("error", () => reject(new Error("websocket error")));
    });
    ws.addEventListener("message", (event) => messages.push(String(event.data)));
    await opened;
    await Bun.sleep(50);
    expect(messages[0]).toBe("Welcome!");
    ws.send("ping-adapter");
    await Bun.sleep(50);
    expect(messages).toContain("ping-adapter");
    ws.close();
  });

  test("streams a client asset through $app/server read", async () => {
    const res = await fetch(`${server.base}/api/read`);
    expect(res.ok).toBe(true);
    expect((await res.text()).trim()).toBe("kit-read-asset-marker");
  });

  test("preserves multiple Set-Cookie headers", async () => {
    const res = await fetch(`${server.base}/api/cookies`);
    expect(res.ok).toBe(true);
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((cookie) => cookie.startsWith("adapter-a=one"))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith("adapter-b=two"))).toBe(true);
  });

  test("accepts same-origin form actions and rejects CSRF mismatches", async () => {
    const ok = await fetch(`${server.base}/form`, {
      method: "POST",
      headers: {
        origin: server.base,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "message=kitchen-sink",
    });
    expect(ok.ok).toBe(true);
    expect(await ok.text()).toContain("kitchen-sink");

    const csrf = await fetch(`${server.base}/form`, {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "message=nope",
    });
    expect(csrf.status).toBe(403);
  });

  test("enforces BODY_SIZE_LIMIT and can disable the cap", async () => {
    const over = await fetch(`${server.base}/api/echo`, {
      method: "POST",
      body: "x".repeat(2048),
    });
    expect(over.status).toBeGreaterThanOrEqual(400);

    const unlimited = await startServer({
      ORIGIN: "http://placeholder",
      BODY_SIZE_LIMIT: "Infinity",
    });
    try {
      const res = await fetch(`${unlimited.base}/api/echo`, {
        method: "POST",
        body: "x".repeat(2048),
      });
      expect(res.ok).toBe(true);
      expect((await res.text()).length).toBe(2048);
    } finally {
      await stop(unlimited.proc);
    }
  });

  test("rejects path traversal on static files", async () => {
    const res = await fetch(`${server.base}/../package.json`);
    expect(res.status).not.toBe(200);
    const text = await res.text();
    expect(text).not.toContain('"dequal"');
  });

  test("listens on a unix socket", async () => {
    const dir = await mkdtemp(join(tmpdir(), "adapter-sock-"));
    const socketPath = join(dir, "app.sock");
    const proc = Bun.spawn(["bun", "./build/index.js"], {
      cwd: EXAMPLE,
      env: {
        ...process.env,
        SOCKET_PATH: socketPath,
        ORIGIN: "http://unix.localhost",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    children.push(proc);
    try {
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline && !existsSync(socketPath)) {
        if (proc.exitCode !== null) {
          throw new Error(await new Response(proc.stderr).text());
        }
        await Bun.sleep(50);
      }
      const res = await fetch("http://unix.localhost/api/probe", { unix: socketPath });
      expect(res.ok).toBe(true);
      const data = (await res.json()) as Probe;
      expect(data.origin).toBe("http://unix.localhost");
      expect(data.clientAddress).toBe("");
    } finally {
      await stop(proc);
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("emits sveltekit:shutdown before stopping", async () => {
    const dir = await mkdtemp(join(tmpdir(), "adapter-shutdown-"));
    const mark = join(dir, "reason.txt");
    const running = await startServer({
      ORIGIN: "http://placeholder",
      ADAPTER_SHUTDOWN_MARK: mark,
    });
    try {
      running.proc.kill("SIGTERM");
      await running.proc.exited;
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline && !existsSync(mark)) {
        await Bun.sleep(25);
      }
      expect(existsSync(mark)).toBe(true);
      expect((await Bun.file(mark).text()).trim()).toBe("SIGTERM");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("fails boot on an out-of-range IDLE_TIMEOUT", async () => {
    const proc = Bun.spawn(["bun", "./build/index.js"], {
      cwd: EXAMPLE,
      env: { ...process.env, HOST: "127.0.0.1", PORT: String(await freePort()), IDLE_TIMEOUT: "256" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stderr, exit] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);
    expect(exit).not.toBe(0);
    expect(stderr + (await new Response(proc.stdout).text())).toMatch(/IDLE_TIMEOUT/);
  });

  test("reads prefixed deploy env and rejects unknown prefixed names", async () => {
    await buildExample({ ADAPTER_ENV_PREFIX: "MY_" });
    const running = await startServer(
      { MY_ORIGIN: "https://prefixed.example" },
      { prefix: "MY_" },
    );
    try {
      const data = await probe(running.base);
      expect(data.origin).toBe("https://prefixed.example");
    } finally {
      await stop(running.proc);
    }

    const bad = Bun.spawn(["bun", "./build/index.js"], {
      cwd: EXAMPLE,
      env: {
        ...process.env,
        MY_HOST: "127.0.0.1",
        MY_PORT: String(await freePort()),
        MY_SECRET: "nope",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stderr, exit] = await Promise.all([new Response(bad.stderr).text(), bad.exited]);
    expect(exit).not.toBe(0);
    expect(stderr).toMatch(/MY_SECRET/);
  }, 120_000);

  test("skips adapter static serving when assets is false", async () => {
    await buildExample({ ADAPTER_ASSETS: "false" });
    const running = await startServer({ ORIGIN: "http://placeholder" });
    try {
      const missing = await fetch(`${running.base}/adapter-probe.txt`);
      expect(missing.status).toBe(404);

      const data = await probe(running.base);
      expect(data.platform.keys).toEqual(["request", "server"]);

      const about = await fetch(`${running.base}/about`);
      expect(about.status).toBe(404);
    } finally {
      await stop(running.proc);
    }
  }, 120_000);
});
