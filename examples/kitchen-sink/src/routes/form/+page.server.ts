import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const message = String(data.get('message') ?? '');
		if (!message) {
			return fail(400, { message: '', missing: true });
		}

		return { message, echoed: true };
	}
} satisfies Actions;
