<script lang="ts	">
	const emailAddress = '5e3e04a8a8393cb85b47907fcc0290d1@inbound.postmarkapp.com';
	let displayAddress = $state('5e3e04a8a8393cb85b47907fcc0290d1@inbound.postmarkapp.com');
	let copied = $state(false);

	function selectEmail() {
		navigator.clipboard.writeText(emailAddress);
		copied = true;
		displayAddress = 'Copied!';
		setTimeout(() => {
			copied = false;
			displayAddress = emailAddress;
		}, 2000); // Reset after 2 seconds
	}
</script>

<svelte:head>
	<title>EmailCal - Email to Calendar</title>
	<meta name="description" content="Forward your itinerary emails, get calendar files back." />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="container mx-auto max-w-5xl px-6 py-8">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="mb-3 text-4xl font-bold text-gray-900">EmailCal</h1>
			<p class="text-xl text-gray-700">Forward your itinerary email, get a calendar file back.</p>
		</div>

		<div class="grid gap-8 lg:grid-cols-2">
			<!-- Left Side: How it works -->
			<div class="space-y-6">
				<!-- Steps -->
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h2 class="mb-4 text-xl font-semibold text-gray-900">How it works</h2>
					<div class="space-y-3">
						<div class="flex items-center space-x-3">
							<span
								class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800"
								>1</span
							>
							<span class="text-sm text-gray-700">Forward email with itinerary/PDF/images</span>
						</div>
						<div class="flex items-center space-x-3">
							<span
								class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800"
								>2</span
							>
							<span class="text-sm text-gray-700">AI extracts dates, times, locations</span>
						</div>
						<div class="flex items-center space-x-3">
							<span
								class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800"
								>3</span
							>
							<span class="text-sm text-gray-700">Get .ics file + Google Calendar link</span>
						</div>
					</div>
				</div>

				<!-- Email Input -->
				<div class="rounded-lg bg-blue-600 p-6 text-center text-gray-300">
					<h2 class="mb-3 text-lg font-semibold">Send your itinerary to:</h2>
					<div class="bg-opacity-20 mb-3 rounded-lg bg-white p-3">
						<input
							type="text"
							readonly
							bind:value={displayAddress}
							onclick={selectEmail}
							class="w-full cursor-pointer border-none bg-transparent text-center font-mono text-sm text-gray-900 outline-none focus:outline-none"
						/>
					</div>
					<p class="text-xs opacity-90">Click to copy • Works with text, PDFs, images</p>
				</div>
			</div>

			<!-- Right Side: Example -->
			<div class="space-y-6">
				<!-- Example Input -->
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-3 text-lg font-semibold text-gray-900">Example Email</h3>
					<div class="rounded bg-gray-50 p-4 text-sm">
						<div class="mb-2 font-medium text-gray-700">Subject: Paris Trip Confirmation</div>
						<div class="space-y-2 text-gray-600">
							<p>
								<strong>Flight:</strong> UA123 departing LAX March 15th at 2:30 PM, arriving CDG March
								16th at 11:45 AM
							</p>
							<p><strong>Hotel:</strong> Le Marais Hotel check-in March 16th at 3:00 PM</p>
							<p><strong>Tour:</strong> Eiffel Tower guided tour March 17th at 10:00 AM</p>
							<p><strong>Dinner:</strong> Chez Pierre reservation March 17th at 7:30 PM</p>
							<p><strong>Return:</strong> Flight UA456 departing CDG March 19th at 6:15 PM</p>
						</div>
					</div>
				</div>

				<!-- Arrow -->
				<div class="text-center">
					<div class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
						<span class="text-green-600">↓</span>
					</div>
				</div>

				<!-- Example Output -->
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-3 text-lg font-semibold text-gray-900">You Get Back</h3>
					<div class="space-y-2 text-sm">
						<div class="flex items-center space-x-2">
							<span class="text-green-600">✓</span>
							<span>Flight UA123 - March 15, 2:30 PM</span>
						</div>
						<div class="flex items-center space-x-2">
							<span class="text-green-600">✓</span>
							<span>Hotel Check-in - March 16, 3:00 PM</span>
						</div>
						<div class="flex items-center space-x-2">
							<span class="text-green-600">✓</span>
							<span>Eiffel Tower Tour - March 17, 10:00 AM</span>
						</div>
						<div class="flex items-center space-x-2">
							<span class="text-green-600">✓</span>
							<span>Dinner at Chez Pierre - March 17, 7:30 PM</span>
						</div>
						<div class="flex items-center space-x-2">
							<span class="text-green-600">✓</span>
							<span>Return Flight UA456 - March 19, 6:15 PM</span>
						</div>
					</div>
					<div class="mt-4 rounded bg-blue-50 p-3">
						<p class="text-xs text-blue-800">
							<strong>📎 paris-trip.ics</strong> + Google Calendar import link
						</p>
					</div>
				</div>
			</div>
		</div>

		<footer class="mt-8 text-center text-xs text-gray-500">
			<p>Built because I was tired of manual calendar entry</p>
		</footer>
	</div>
</div>
