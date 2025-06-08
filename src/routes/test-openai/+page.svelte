<script lang="ts">
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';

	let isLoading = $state(false);
	let result = $state('');
	let error = $state('');
	let testEmail = $state(TEST_EMAIL);

	// Redirect to homepage if not in development
	onMount(() => {
		if (!dev) {
			window.location.href = '/';
		}
	});

	async function testOpenAI() {
		if (!dev) return;

		isLoading = true;
		result = '';
		error = '';

		try {
			const response = await fetch('/api/test-openai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					testEmail: testEmail.trim() || undefined
				})
			});

			const data = await response.json();

			if (response.ok) {
				result = JSON.stringify(data, null, 2);
			} else {
				error = data.error || 'Unknown error occurred';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Network error occurred';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>OpenAI Test - Development Only</title>
</svelte:head>

{#if dev}
	<div class="container">
		<h1>extractEventsWithAI Test (Development Only)</h1>
		<p class="warning">
			This page tests the actual AI function used in production. Only available in development mode.
		</p>

		<div class="form-section">
			<label for="email">Test Email (optional):</label>
			<input
				id="email"
				type="email"
				bind:value={testEmail}
				placeholder="your-email@example.com"
				class="email-input"
			/>
			<p class="help-text">
				If provided, the system will send you the actual email with ICS file (if events are found) or a "no events found" email.
			</p>
		</div>

		<button on:click={testOpenAI} disabled={isLoading} class="test-button">
			{#if isLoading}
				Testing extractEventsWithAI...
			{:else}
				Test extractEventsWithAI Function
			{/if}
		</button>

		{#if result}
			<div class="result-section">
				<h3>✅ Success!</h3>
				<pre class="result">{result}</pre>
			</div>
		{/if}

		{#if error}
			<div class="error-section">
				<h3>❌ Error</h3>
				<pre class="error">{error}</pre>
			</div>
		{/if}
	</div>
{:else}
	<div class="container">
		<h1>404 - Page Not Found</h1>
		<p>This page is only available in development mode.</p>
		<a href="/">← Back to Home</a>
	</div>
{/if}

<style>
	.container {
		max-width: 800px;
		margin: 2rem auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.warning {
		background: #fef3cd;
		border: 1px solid #faebcc;
		color: #8a6d3b;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 2rem;
	}

	.form-section {
		margin-bottom: 2rem;
	}

	.form-section label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: #333;
	}

	.email-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
		margin-bottom: 0.5rem;
	}

	.email-input:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
	}

	.help-text {
		color: #666;
		font-size: 0.9rem;
		margin: 0;
	}

	.test-button {
		background: #007bff;
		color: white;
		border: none;
		padding: 1rem 2rem;
		font-size: 1rem;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.test-button:hover:not(:disabled) {
		background: #0056b3;
	}

	.test-button:disabled {
		background: #6c757d;
		cursor: not-allowed;
	}

	.result-section,
	.error-section {
		margin-top: 2rem;
		padding: 1rem;
		border-radius: 4px;
	}

	.result-section {
		background: #d4edda;
		border: 1px solid #c3e6cb;
	}

	.error-section {
		background: #f8d7da;
		border: 1px solid #f5c6cb;
	}

	.result,
	.error {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		white-space: pre-wrap;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
		margin: 0.5rem 0 0 0;
	}

	h1 {
		color: #333;
		margin-bottom: 1rem;
	}

	h3 {
		margin: 0 0 0.5rem 0;
	}
</style>
