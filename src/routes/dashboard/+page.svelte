<script lang="ts">
	import { onMount } from 'svelte';

	// Define a basic type for our event structure
	interface ExtractedEvent {
		title: string;
		startDate: string;
		endDate: string;
		location?: string;
		description?: string;
		timezone?: string;
	}

	interface EventRecord {
		id: string;
		userEmail: string;
		originalEmail?: {
			subject?: string;
		};
		extractedEvents: ExtractedEvent[];
		icsFile: string | null;
		status: string;
		createdAt: string;
		processedAt?: string;
		error?: string | null;
	}

	let events: EventRecord[] = [];
	let isLoading: boolean = true;
	let errorMessage: string = '';
	let userEmailForQuery: string = 'test@example.com'; // Hardcoded for MVP

	onMount(async () => {
		await fetchEvents();
	});

	async function fetchEvents(): Promise<void> {
		isLoading = true;
		errorMessage = '';
		try {
			if (!userEmailForQuery) {
				errorMessage = 'User email not available. Cannot fetch events.';
				isLoading = false;
				return;
			}
			const response = await fetch(`/api/events?email=${encodeURIComponent(userEmailForQuery)}`);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
			}
			const jsonData = await response.json();
			// Type assertion for the fetched data
			if (Array.isArray(jsonData)) {
				events = jsonData as EventRecord[];
			} else {
				// Handle cases where the API might not return an array as expected
				console.warn('API did not return an array for events:', jsonData);
				events = []; // Default to an empty array
				errorMessage = 'Received unexpected data format from server.';
			}
		} catch (err: any) {
			// Use 'any' for error type or be more specific if possible
			console.error('Failed to fetch events:', err);
			errorMessage = err.message || 'Could not load events.';
			events = []; // Ensure events is an empty array on error
		} finally {
			isLoading = false;
		}
	}

	function formatEventDate(dateString: string | undefined | null): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleString();
	}

	function downloadICS(icsContent: string | null, filename: string = 'event.ics'): void {
		if (!icsContent) {
			alert('No ICS content available to download for this event.');
			return;
		}
		const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>Events Dashboard</title>
</svelte:head>

<div class="container mx-auto p-8">
	<h1 class="mb-6 text-3xl font-bold">Processed Events Dashboard</h1>

	<div class="mb-4">
		<label for="emailQuery" class="mr-2">Displaying events for:</label>
		<input
			id="emailQuery"
			type="email"
			bind:value={userEmailForQuery}
			class="rounded border p-1"
			placeholder="Enter email to view events"
		/>
		<button
			on:click={fetchEvents}
			class="ml-2 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
		>
			Refresh Events
		</button>
	</div>

	{#if isLoading}
		<p>Loading events...</p>
	{:else if errorMessage}
		<p class="text-red-500">Error: {errorMessage}</p>
	{:else if events.length === 0}
		<p>No events found for this email address.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="min-w-full rounded-lg bg-white shadow-md">
				<thead class="bg-gray-200">
					<tr>
						<th class="px-4 py-3 text-left">Event ID</th>
						<th class="px-4 py-3 text-left">Original Subject</th>
						<th class="px-4 py-3 text-left">Status</th>
						<th class="px-4 py-3 text-left">Created At</th>
						<th class="px-4 py-3 text-left">Processed At</th>
						<th class="px-4 py-3 text-left">Extracted Events</th>
						<th class="px-4 py-3 text-left">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each events as event (event.id)}
						<tr class="border-b hover:bg-gray-50">
							<td class="px-4 py-3">{event.id}</td>
							<td class="px-4 py-3">{event.originalEmail?.subject || 'N/A'}</td>
							<td class="px-4 py-3">
								<span
									class="rounded-full px-2 py-1 text-xs font-semibold
                  {event.status === 'processed'
										? 'bg-green-200 text-green-800'
										: event.status === 'pending'
											? 'bg-yellow-200 text-yellow-800'
											: event.status && event.status.startsWith('error')
												? 'bg-red-200 text-red-800'
												: 'bg-gray-200 text-gray-800'}"
								>
									{event.status}
								</span>
							</td>
							<td class="px-4 py-3">{formatEventDate(event.createdAt)}</td>
							<td class="px-4 py-3">{formatEventDate(event.processedAt)}</td>
							<td class="px-4 py-3">
								{#if event.extractedEvents && event.extractedEvents.length > 0}
									<ul>
										{#each event.extractedEvents as extractedEvt}
											<li>{extractedEvt.title} ({formatEventDate(extractedEvt.startDate)})</li>
										{/each}
									</ul>
								{:else}
									No events extracted
								{/if}
							</td>
							<td class="px-4 py-3">
								{#if event.icsFile}
									<button
										on:click={() =>
											downloadICS(event.icsFile, `${event.originalEmail?.subject || 'event'}.ics`)}
										class="rounded bg-blue-500 px-2 py-1 text-sm font-bold text-white hover:bg-blue-700"
									>
										Download ICS
									</button>
								{:else}
									No ICS
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
