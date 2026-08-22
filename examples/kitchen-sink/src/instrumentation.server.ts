globalThis.__ADAPTER_EXAMPLE_INSTRUMENTED__ = true;

const mark = process.env.ADAPTER_INSTRUMENT_MARK;
if (mark) {
	await Bun.write(mark, "instrumentation.server.ts loaded\n");
}
