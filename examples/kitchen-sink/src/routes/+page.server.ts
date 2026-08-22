import { collectProbe } from '$lib/server/probe';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	return { probe: collectProbe(event) };
};
