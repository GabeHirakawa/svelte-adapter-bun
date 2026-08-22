/// <reference types="@sveltejs/kit" />
/// <reference types="bun-types" />

declare global {
	namespace App {
		interface Platform {
			server: Bun.Server;
			request: Request;
		}
	}

	var __ADAPTER_EXAMPLE_INSTRUMENTED__: boolean | undefined;
}

export {};
