import type { Handle } from '@sveltejs/kit';

const shutdownMark = process.env.ADAPTER_SHUTDOWN_MARK;
if (shutdownMark) {
	// @ts-expect-error sveltekit:shutdown is a Kit custom process event
	process.on('sveltekit:shutdown', (reason: string) => {
		void Bun.write(shutdownMark, String(reason));
	});
}

export const handle: Handle = async ({ event, resolve }) => {
	const { request } = event;
	const url = new URL(request.url);

	if (
		request.headers.get('connection')?.toLowerCase().includes('upgrade') &&
		request.headers.get('upgrade')?.toLowerCase() === 'websocket' &&
		url.pathname.startsWith('/ws')
	) {
		if (!event.platform) {
			return new Response('Kit platform missing', { status: 500 });
		}

		await event.platform.server.upgrade(event.platform.request);
		return new Response(null, { status: 101 });
	}

	return resolve(event);
};

function asText(message: string | Buffer) {
	return typeof message === 'string' ? message : new TextDecoder().decode(message);
}

function adapterLog(event: 'open' | 'message' | 'send', detail: string) {
	return JSON.stringify({ type: 'adapter-log', at: Date.now(), event, detail });
}

export const websocket: Bun.WebSocketHandler = {
	open(ws) {
		ws.send('Welcome!');
		ws.send(adapterLog('open', 'Bun.WebSocketHandler.open — sent Welcome!'));
	},
	message(ws, message) {
		const text = asText(message);
		ws.send(adapterLog('message', `received "${text}"`));
		ws.send(message);
		ws.send(adapterLog('send', `echoed "${text}"`));
	}
};
