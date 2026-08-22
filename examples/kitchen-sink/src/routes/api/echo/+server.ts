import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	return new Response(body, {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
};
