import { read } from '$app/server';
import type { RequestHandler } from './$types';
import asset from './kit-read-asset.txt';

export const GET: RequestHandler = async () => {
	const file = read(asset);
	return new Response(await file.text(), {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
};
