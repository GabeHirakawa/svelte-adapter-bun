<script lang="ts">
	import FeatureList from '$lib/FeatureList.svelte';

	let { data } = $props();

	const features = [
		{
			href: '/ws',
			kicker: 'Native Bun WebSocket',
			title: 'Upgrade in handle, echo in export const websocket',
			body: 'No extra server process. hooks.server upgrades with event.platform.server.upgrade and Bun.serve uses the Kit websocket handler.',
			cta: 'Open the split chat'
		},
		{
			href: '/api/probe',
			kicker: 'Origin + client address',
			title: 'ORIGIN, forwarded headers, XFF from the right',
			body: 'event.url and getClientAddress() follow the adapter-node deploy-env names, with requestIP when no ADDRESS_HEADER is set.'
		},
		{
			href: '/adapter-probe.txt',
			kicker: 'Assets + ranges',
			title: 'Bun.file, brotli/gzip siblings, 206 / 416',
			body: 'client/ and prerendered/ are served natively. Single ranges slice the file; several become multipart/byteranges.'
		},
		{
			href: '/api/read',
			kicker: 'Kit read',
			title: 'read() from $app/server via Bun.file',
			body: 'The adapter claims supports.read and streams imported client assets from the deploy directory.'
		},
		{
			href: '/about',
			kicker: 'Prerender + compress',
			title: 'about.html plus .br / .gz',
			body: 'Precompressed siblings are negotiated from Accept-Encoding. Try the prerendered page, then view source on the wire.'
		},
		{
			href: '/form',
			kicker: 'Forms + shutdown',
			title: 'CSRF-safe origin and sveltekit:shutdown',
			body: 'Same-origin form actions prove the public origin is correct. SIGINT / SIGTERM emit Kit’s shutdown event before Bun.serve.stop.'
		}
	] as const;
</script>

<svelte:head>
	<title>svelte-adapter-bun kitchen sink</title>
</svelte:head>

<a class="hero" href="/ws">
	<p class="kicker">Featured</p>
	<h2>Talk to the Bun server over a native WebSocket</h2>
	<p>
		Client on the left, <code>Bun.WebSocketHandler</code> on the right, and the exact
		<code>hooks.server.ts</code> that wires them. Send a line and watch the echo land on both sides.
	</p>
	<span class="cta">Open the live chat →</span>
</a>

<ul class="grid">
	{#each features as feature (feature.href)}
		<li>
			<a href={feature.href}>
				<p class="kicker">{feature.kicker}</p>
				<h3>{feature.title}</h3>
				<p>{feature.body}</p>
				{#if 'cta' in feature}
					<span class="cta">{feature.cta} →</span>
				{/if}
			</a>
		</li>
	{/each}
</ul>

<FeatureList probe={data.probe} />

<style>
	.hero {
		display: block;
		text-decoration: none;
		color: inherit;
		padding: 1.6rem 1.5rem 1.4rem;
		margin-bottom: 1.1rem;
		background:
			linear-gradient(135deg, rgba(232, 161, 58, 0.16), transparent 42%),
			var(--card);
		border: 1px solid var(--line);
		box-shadow: var(--shadow);
	}

	.hero h2 {
		margin: 0.2rem 0 0.6rem;
		font-size: clamp(1.6rem, 4vw, 2.3rem);
		letter-spacing: -0.03em;
		max-width: 20ch;
	}

	.hero p {
		max-width: 40rem;
		color: var(--muted);
		margin: 0 0 1rem;
	}

	.kicker {
		margin: 0;
		font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.cta {
		font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace;
		font-size: 0.82rem;
		color: var(--accent);
	}

	.grid {
		list-style: none;
		padding: 0;
		margin: 0 0 1.4rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16.5rem, 1fr));
		gap: 0.85rem;
	}

	.grid a {
		display: block;
		height: 100%;
		text-decoration: none;
		color: inherit;
		background: var(--card);
		border: 1px solid var(--line);
		padding: 1rem 1.05rem 1.1rem;
	}

	.grid a:hover {
		border-color: var(--accent);
	}

	.grid h3 {
		margin: 0.35rem 0 0.45rem;
		font-size: 1.15rem;
		letter-spacing: -0.02em;
	}

	.grid p {
		margin: 0;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.grid .cta {
		display: inline-block;
		margin-top: 0.75rem;
	}
</style>
