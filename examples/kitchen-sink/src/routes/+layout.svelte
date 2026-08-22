<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="shell">
	<header>
		<p class="eyebrow">svelte-adapter-bun</p>
		<h1>Kitchen sink</h1>
		<p class="lede">
			A SvelteKit app that exercises every adapter contract: deploy output, listen env, origin,
			client address, assets, ranges, WebSocket, <code>read</code>, instrumentation, and shutdown.
		</p>
		<nav>
			<a href="/">Probe</a>
			<a href="/about">Prerendered</a>
			<a href="/form">Form action</a>
			<a href="/ws">WebSocket</a>
			<a href="/adapter-probe.txt">Static txt</a>
			<a href="/api/probe">JSON probe</a>
		</nav>
	</header>
	<main>
		{@render children()}
	</main>
</div>

<style>
	.shell {
		max-width: 52rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 4rem;
	}

	.eyebrow {
		margin: 0;
		color: var(--accent);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.75rem;
		font-family: ui-monospace, "IBM Plex Mono", Menlo, monospace;
	}

	h1 {
		margin: 0.35rem 0 0.75rem;
		font-size: 2.4rem;
		font-weight: 600;
	}

	.lede {
		color: var(--muted);
		max-width: 40rem;
	}

	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.1rem;
		margin: 1.4rem 0 2rem;
		padding: 0.85rem 0;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}

	nav a {
		text-decoration: none;
		font-family: ui-monospace, "IBM Plex Mono", Menlo, monospace;
		font-size: 0.86rem;
	}

	nav a:hover {
		text-decoration: underline;
	}
</style>
