<script lang="ts">
	import type { Probe } from '$lib/probe';

	let { probe }: { probe: Probe } = $props();

	const rows = $derived([
		['Request origin', probe.origin],
		['Client address', probe.clientAddress || '(empty — unix socket or missing requestIP)'],
		['Platform keys', probe.platform.keys.join(', ') || '(none)'],
		['Kit instrumentation', probe.instrumented ? 'loaded before the Bun entry' : 'missing'],
		['Production dependency', probe.prodMarker],
		['Bundled dev dependency', probe.devMarker]
	] as const);
</script>

<section>
	<h2>This request, through the adapter</h2>
	<dl>
		{#each rows as [label, value] (label)}
			<div>
				<dt>{label}</dt>
				<dd class="mono">{value}</dd>
			</div>
		{/each}
	</dl>
</section>

<style>
	section {
		background: var(--card);
		border: 1px solid var(--line);
		padding: 1.15rem 1.2rem 0.35rem;
		box-shadow: var(--shadow);
	}

	h2 {
		margin: 0 0 0.85rem;
		font-size: 1.2rem;
		font-weight: 600;
	}

	dl {
		margin: 0;
	}

	dl > div {
		display: grid;
		grid-template-columns: 14rem 1fr;
		gap: 0.4rem 1rem;
		padding: 0.65rem 0;
		border-top: 1px solid var(--line);
	}

	dt {
		color: var(--muted);
		font-size: 0.92rem;
	}

	dd {
		margin: 0;
		overflow-wrap: anywhere;
		font-size: 0.86rem;
	}

	@media (max-width: 640px) {
		dl > div {
			grid-template-columns: 1fr;
		}
	}
</style>
