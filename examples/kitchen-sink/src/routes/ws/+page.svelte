<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { upgradeSample, websocketSample } from '$lib/ws-code';

	type ChatLine = { id: number; from: 'you' | 'server'; text: string };
	type ServerLine = { id: number; event: string; detail: string; time: string };

	let text = $state('hello from the browser');
	let connected = $state(false);
	let chat = $state<ChatLine[]>([]);
	let server = $state<ServerLine[]>([]);
	let socket: WebSocket | null = null;
	let nextId = 0;

	const pinBottom: Attachment<HTMLElement> = (el) => {
		const scroll = () => {
			el.scrollTop = el.scrollHeight;
		};
		const observer = new MutationObserver(scroll);
		observer.observe(el, { childList: true, subtree: true, characterData: true });
		return () => observer.disconnect();
	};

	function stamp(at = Date.now()) {
		return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}

	function pushChat(from: ChatLine['from'], value: string) {
		chat = [...chat, { id: ++nextId, from, text: value }];
	}

	function pushServer(event: string, detail: string, at?: number) {
		server = [...server, { id: ++nextId, event, detail, time: stamp(at) }];
	}

	function connect() {
		socket?.close();
		chat = [];
		server = [];
		const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
		socket = new WebSocket(`${protocol}//${location.host}/ws`);
		socket.addEventListener('open', () => {
			connected = true;
			pushServer('client', 'browser opened ws://…/ws');
		});
		socket.addEventListener('message', (event) => {
			const data = String(event.data);
			try {
				const parsed = JSON.parse(data) as {
					type?: string;
					event?: string;
					detail?: string;
					at?: number;
				};
				if (parsed.type === 'adapter-log' && parsed.event && parsed.detail) {
					pushServer(parsed.event, parsed.detail, parsed.at);
					return;
				}
			} catch {
				// plain echo / Welcome!
			}
			pushChat('server', data);
		});
		socket.addEventListener('close', () => {
			connected = false;
			pushServer('client', 'socket closed');
		});
	}

	function send() {
		const line = text.trim();
		if (!line || !socket || socket.readyState !== WebSocket.OPEN) {
			return;
		}
		pushChat('you', line);
		socket.send(line);
	}

	function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		send();
	}
</script>

<svelte:head>
	<title>Native WebSocket chat</title>
</svelte:head>

<section class="intro">
	<p class="kicker">Native Bun WebSocket</p>
	<h2>Split bench — browser on the left, handler on the right</h2>
	<p>
		The adapter patches Kit so <code>export const websocket</code> becomes
		<code>{'Bun.serve({ websocket })'}</code>. Type a line. The browser shows the echo; the server column
		is what <code>open</code> / <code>message</code> actually ran.
	</p>
</section>

<div class="bench">
	<article class="pane client">
		<header>
			<h3>Browser</h3>
			<span class={['lamp', { on: connected }]}>{connected ? 'live' : 'idle'}</span>
		</header>
		<div class="scroll" {@attach pinBottom}>
			{#if chat.length === 0}
				<p class="empty">Press Connect. The first server line is <code>Welcome!</code></p>
			{/if}
			{#each chat as line (line.id)}
				<p class={['bubble', line.from]}>
					<span>{line.from === 'you' ? 'you' : 'server'}</span>
					{line.text}
				</p>
			{/each}
		</div>
		<form {onsubmit}>
			<input
				bind:value={text}
				placeholder="Say something"
				aria-label="Chat message"
				disabled={!connected}
			/>
			<button type="submit" disabled={!connected}>Send</button>
			<button type="button" onclick={connect}>{connected ? 'Reconnect' : 'Connect'}</button>
		</form>
	</article>

	<article class="pane rack">
		<header>
			<h3>Bun.WebSocketHandler</h3>
			<span class={['lamp', { on: connected }]}>hooks.server</span>
		</header>
		<div class="scroll" {@attach pinBottom}>
			{#if server.length === 0}
				<p class="empty">Server events from <code>adapter-log</code> frames land here.</p>
			{/if}
			{#each server as line (line.id)}
				<p class="event">
					<time>{line.time}</time>
					<strong>{line.event}</strong>
					<span>{line.detail}</span>
				</p>
			{/each}
		</div>
	</article>
</div>

<section class="code">
	<h3>The code this page is running</h3>
	<p>
		Upgrade inside <code>handle</code> with the Kit platform, then export the Bun handler. The live
		echo still sends the raw string (so tests and this chat stay honest); the right-hand column is an
		extra JSON log frame.
	</p>
	<div class="pair">
		<pre><code>{upgradeSample}</code></pre>
		<pre><code>{websocketSample}</code></pre>
	</div>
</section>

<style>
	.intro,
	.code {
		margin-bottom: 1.2rem;
	}

	.intro h2,
	.code h3 {
		margin: 0.25rem 0 0.55rem;
		letter-spacing: -0.03em;
	}

	.intro p,
	.code p {
		color: var(--muted);
		max-width: 46rem;
	}

	.kicker {
		margin: 0;
		font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.bench {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem;
		min-height: 28rem;
	}

	.pane {
		display: flex;
		flex-direction: column;
		min-height: 28rem;
		border: 1px solid var(--line);
		box-shadow: var(--shadow);
		background: var(--card);
	}

	.pane header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.7rem 0.9rem;
		border-bottom: 1px solid var(--line);
	}

	.pane h3 {
		margin: 0;
		font-size: 1.05rem;
	}

	.lamp {
		font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.lamp.on {
		color: var(--accent-2);
	}

	.client .lamp.on {
		color: var(--accent);
	}

	.scroll {
		flex: 1;
		overflow: auto;
		padding: 0.9rem;
		min-height: 16rem;
	}

	.rack .scroll {
		background: #10160f;
		color: var(--server);
		font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace;
		font-size: 0.8rem;
	}

	.empty {
		margin: 0;
		color: var(--muted);
	}

	.bubble {
		margin: 0 0 0.65rem;
		max-width: 92%;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--line);
	}

	.bubble span {
		display: block;
		font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace;
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
		margin-bottom: 0.2rem;
	}

	.bubble.you {
		margin-left: auto;
		background: rgba(232, 161, 58, 0.12);
	}

	.bubble.server {
		background: rgba(127, 208, 165, 0.08);
	}

	.event {
		margin: 0 0 0.7rem;
		display: grid;
		grid-template-columns: 5.6rem 5.2rem 1fr;
		gap: 0.45rem;
	}

	.event time,
	.event strong {
		color: #6f9a7c;
		font-weight: 500;
	}

	form {
		display: flex;
		gap: 0.4rem;
		padding: 0.7rem;
		border-top: 1px solid var(--line);
	}

	input {
		flex: 1;
		min-width: 0;
		background: var(--bg);
		color: var(--fg);
		border: 1px solid var(--line);
		padding: 0.45rem 0.6rem;
	}

	button {
		background: var(--bg);
		color: var(--fg);
		border: 1px solid var(--accent);
		padding: 0.45rem 0.65rem;
	}

	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem;
	}

	pre {
		margin: 0;
		padding: 1rem;
		overflow: auto;
		background: #120e0a;
		border: 1px solid var(--line);
		font-size: 0.75rem;
		line-height: 1.55;
		color: #e8d3b0;
	}

	@media (max-width: 840px) {
		.bench,
		.pair {
			grid-template-columns: 1fr;
		}

		.event {
			grid-template-columns: 1fr;
			gap: 0.15rem;
		}
	}
</style>
