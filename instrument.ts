export type InstrumentBuilder = {
  hasServerInstrumentationFile?: () => boolean;
  instrument?: (args: { entrypoint: string; instrumentation: string }) => void;
};

export async function maybeInstrument(
  builder: InstrumentBuilder,
  out: string,
  copy: (from: string, to: string) => Promise<void> = async (from, to) => {
    await Bun.write(to, await Bun.file(from).arrayBuffer());
  },
): Promise<boolean> {
  if (!builder.hasServerInstrumentationFile?.()) {
    return false;
  }

  const instrumentation = `${out}/instrumentation.server.js`;
  await copy(`${out}/server/instrumentation.server.js`, instrumentation);
  builder.instrument?.({
    entrypoint: `${out}/index.js`,
    instrumentation,
  });
  return true;
}
