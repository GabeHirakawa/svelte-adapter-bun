import type { RequestEvent } from '@sveltejs/kit';
import type { Probe } from '$lib/probe';
import { devMarker, prodMarker } from './deps.ts';

export function collectProbe(event: RequestEvent): Probe {
	const platform = event.platform;

	return {
		url: event.url.href,
		origin: event.url.origin,
		pathname: event.url.pathname,
		method: event.request.method,
		clientAddress: event.getClientAddress(),
		platform: {
			keys: platform ? Object.keys(platform).sort() : [],
			hasServer: Boolean(platform?.server),
			hasRequest: Boolean(platform?.request)
		},
		instrumented: globalThis.__ADAPTER_EXAMPLE_INSTRUMENTED__ === true,
		prodMarker,
		devMarker,
		forwardedFor: event.request.headers.get('x-forwarded-for')
	};
}
