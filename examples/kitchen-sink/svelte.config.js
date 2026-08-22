import adapter from '@gkh/svelte-adapter-bun';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			out: 'build',
			precompress: {
				brotli: true,
				gzip: true,
				files: ['html', 'js', 'json', 'css', 'svg', 'xml', 'wasm', 'txt']
			},
			envPrefix: process.env.ADAPTER_ENV_PREFIX ?? '',
			xff_depth: Number.parseInt(process.env.ADAPTER_XFF_DEPTH ?? '1', 10),
			assets: process.env.ADAPTER_ASSETS !== 'false'
		}),
		experimental: {
			instrumentation: {
				server: true
			}
		}
	}
};

export default config;
