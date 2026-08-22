<script lang="ts">
	import FeatureList from '$lib/FeatureList.svelte';

	let { data } = $props();

	const contracts = [
		['Adapt / bundle', 'Vite build writes a Bun deploy directory via svelte-adapter-bun.'],
		['Dep split', 'dequal stays external; clsx is inlined from devDependencies.'],
		['Deploy env / listen', 'HOST, PORT, SOCKET_PATH, and optional envPrefix.'],
		['Request origin', 'ORIGIN, or forwarded proto/host/port (https by default).'],
		['Client address', 'ADDRESS_HEADER + XFF from the right, else Bun.requestIP.'],
		['Serve assets', 'client/ and prerendered/ with brotli/gzip siblings and Range.'],
		['Kit websocket', 'export const websocket plus event.platform.server.upgrade.'],
		['Kit read', '$app/server read() streams a client asset through Bun.file.'],
		['Instrumentation', 'src/instrumentation.server.ts loads before index.js.'],
		['sveltekit:shutdown', 'SIGINT / SIGTERM emit the Kit event, then Bun.serve.stop(true).']
	] as const;
</script>

<svelte:head>
	<title>svelte-adapter-bun kitchen sink</title>
</svelte:head>

<FeatureList probe={data.probe} />

<section>
	<h2>Contracts this app is built to hit</h2>
	<ol>
		{#each contracts as [title, detail] (title)}
			<li>
				<strong>{title}</strong>
				<span>{detail}</span>
			</li>
		{/each}
	</ol>
</section>

<style>
	section {
		margin-top: 1.75rem;
	}

	h2 {
		font-size: 1.05rem;
	}

	ol {
		margin: 0;
		padding-left: 1.2rem;
	}

	li {
		margin: 0.65rem 0;
	}

	li span {
		display: block;
		color: var(--muted);
	}
</style>
