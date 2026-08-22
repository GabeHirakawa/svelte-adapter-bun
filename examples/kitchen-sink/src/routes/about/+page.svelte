<svelte:head>
	<title>Prerendered about</title>
</svelte:head>

<article>
	<h2>Prerendered page</h2>
	<p>
		This route sets <code>export const prerender = true</code>. After adapt, the HTML lives under
		<code>build/prerendered/about.html</code> with <code>.br</code> and <code>.gz</code> siblings.
	</p>
	<p class="marker">prerendered-about-marker</p>
</article>

<style>
	article {
		background: var(--card);
		border: 1px solid var(--line);
		padding: 1.2rem;
	}

	h2 {
		margin-top: 0;
	}

	.marker {
		font-family: ui-monospace, "IBM Plex Mono", Menlo, monospace;
		color: var(--accent);
	}
</style>
