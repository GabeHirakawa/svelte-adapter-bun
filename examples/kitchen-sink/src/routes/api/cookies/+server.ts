import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies }) => {
	cookies.set('adapter-a', 'one', { path: '/', httpOnly: true });
	cookies.set('adapter-b', 'two', { path: '/', httpOnly: true });
	return json({ ok: true });
};
