import { json } from '@sveltejs/kit';
import { collectProbe } from '$lib/server/probe';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => json(collectProbe(event));
