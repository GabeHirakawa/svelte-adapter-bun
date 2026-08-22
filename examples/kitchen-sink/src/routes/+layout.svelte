<script lang="ts">
	import { page } from '$app/state';
	import '../app.css';

	let { children } = $props();

	const links = [
		{ href: '/', label: 'Features' },
		{ href: '/ws', label: 'Live chat' },
		{ href: '/about', label: 'Prerendered' },
		{ href: '/form', label: 'Form action' },
		{ href: '/probe.txt', label: 'Static txt', external: true },
		{ href: '/api/probe', label: 'JSON probe', external: true }
	] as const;
</script>

<div class="shell">
	<header>
		<p class="eyebrow">svelte-adapter-bun</p>
		<h1>Kitchen sink</h1>
		<p class="lede">
			What this adapter opens up that a generic Node deploy does not: native Bun WebSockets, origin
			and client-address policy, precompressed assets with ranges, <code>read</code>, and Kit
			instrumentation — running on <code>Bun.serve</code>.
		</p>
		<nav>
			{#each links as link (link.href)}
				<a
					href={link.href}
					rel={'external' in link ? 'external' : undefined}
					aria-current={page.url.pathname === link.href ? 'page' : undefined}
				>
					{link.label}
				</a>
			{/each}
		</nav>
	</header>
	<main>
		{@render children()}
	</main>
</div>

<style>
	.shell {
		max-width: 72rem;
		margin: 0 auto;
		padding: 2.4rem 1.25rem 5rem;
	}

	.eyebrow {
		margin: 0;
		color: var(--accent);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.72rem;
		font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace;
	}

	h1 {
		margin: 0.4rem 0 0.75rem;
		font-size: clamp(2.4rem, 6vw, 4rem);
		font-weight: 600;
		letter-spacing: -0.03em;
	}

	.lede {
		color: var(--muted);
		max-width: 44rem;
		font-size: 1.12rem;
	}

	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		margin: 1.6rem 0 2.1rem;
	}

	nav a {
		text-decoration: none;
		font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace;
		font-size: 0.8rem;
		color: var(--fg);
		border: 1px solid var(--line);
		padding: 0.4rem 0.7rem;
		background: rgba(34, 25, 16, 0.7);
	}

	nav a:hover,
	nav a[aria-current='page'] {
		border-color: var(--accent);
		color: var(--accent);
	}
</style>
