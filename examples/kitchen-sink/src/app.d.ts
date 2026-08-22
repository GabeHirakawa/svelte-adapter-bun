/// <reference types="@sveltejs/kit" />
/// <reference types="@gkh/svelte-adapter-bun" />

declare global {
	namespace App {
		// Platform is filled in by the adapter ambient types.
	}

	var __ADAPTER_EXAMPLE_INSTRUMENTED__: boolean | undefined;
}

export {};
