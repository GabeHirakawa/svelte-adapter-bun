<script lang="ts">
	let log = $state<string[]>(['Connect to echo Welcome! then whatever you send.']);
	let text = $state('hello bun');
	let socket: WebSocket | null = null;
	let connected = $state(false);

	function append(line: string) {
		log = [...log, line];
	}

	function connect() {
		socket?.close();
		const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
		socket = new WebSocket(`${protocol}//${location.host}/ws`);
		socket.addEventListener('open', () => {
			connected = true;
			append('open');
		});
		socket.addEventListener('message', (event) => {
			append(`recv: ${event.data}`);
		});
		socket.addEventListener('close', () => {
			connected = false;
			append('close');
		});
	}

	function send() {
		socket?.send(text);
		append(`send: ${text}`);
	}
</script>

<svelte:head>
	<title>WebSocket</title>
</svelte:head>

<section>
	<h2>Native Bun WebSocket</h2>
	<p>
		<code>hooks.server.ts</code> upgrades <code>/ws</code> with
		<code>event.platform.server.upgrade(event.platform.request)</code> and exports
		<code>websocket</code>.
	</p>
	<div class="row">
		<button type="button" onclick={connect}>{connected ? 'Reconnect' : 'Connect'}</button>
		<input bind:value={text} />
		<button type="button" onclick={send} disabled={!connected}>Send</button>
	</div>
	<pre>{log.join('\n')}</pre>
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

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
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

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	pre {
		white-space: pre-wrap;
		background: var(--bg);
		padding: 0.8rem;
		min-height: 8rem;
	}
</style>
