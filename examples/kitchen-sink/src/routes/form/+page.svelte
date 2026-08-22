<script lang="ts">
	let { form } = $props();
</script>

<svelte:head>
	<title>Form action</title>
</svelte:head>

<section>
	<h2>Form action</h2>
	<p>
		Posts back to the same origin SvelteKit computed from <code>ORIGIN</code> or forwarded headers.
		A wrong origin fails CSRF, which is how we know request origin is wired through.
	</p>

	<form method="POST">
		<label>
			Message
			<input name="message" value={form?.message ?? ''} />
		</label>
		<button type="submit">Echo</button>
	</form>

	{#if form?.missing}
		<p class="bad">Message is required.</p>
	{/if}

	{#if form?.echoed}
		<p class="ok">Echoed: <code>{form.message}</code></p>
	{/if}
</section>

<style>
	section {
		background: var(--card);
		border: 1px solid var(--line);
		padding: 1.2rem;
	}

	h2 {
		margin-top: 0;
	}

	form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: end;
	}

	label {
		display: grid;
		gap: 0.3rem;
	}

	input,
	button {
		background: var(--bg);
		color: var(--fg);
		border: 1px solid var(--line);
		padding: 0.45rem 0.7rem;
	}

	button {
		cursor: pointer;
		border-color: var(--accent);
	}

	.ok {
		color: var(--ok);
	}

	.bad {
		color: var(--bad);
	}
</style>
