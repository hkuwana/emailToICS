<script>
	let emailAddress = '5e3e04a8a8393cb85b47907fcc0290d1@inbound.postmarkapp.com';

	function selectEmail() {
		navigator.clipboard.writeText(emailAddress);
	}
</script>

<svelte:head>
	<title>EmailCal - Email to Calendar</title>
	<meta name="description" content="Forward your itinerary emails, get calendar files back." />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="container mx-auto max-w-4xl px-6 py-12">
		<!-- Header -->
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-4xl font-bold text-gray-900">EmailCal</h1>
			<p class="text-xl text-gray-700">Forward your itinerary email, get a calendar file back.</p>
		</div>

		<!-- The Problem -->
		<div class="mb-8 rounded-lg bg-white p-8 shadow-sm">
			<p class="text-lg leading-relaxed text-gray-800">
				I got tired of manually creating calendar events from itinerary emails. Conference
				schedules, multi-city trip bookings, PDF brochures with event times – I was copying and
				pasting dates and times one by one into my calendar. So I built this to do it automatically.
			</p>
		</div>

		<!-- How It Works -->
		<div class="mb-8 rounded-lg bg-white p-8 shadow-sm">
			<h2 class="mb-6 text-2xl font-semibold text-gray-900">How it works</h2>

			<div class="space-y-6">
				<div class="flex items-start space-x-4">
					<span
						class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800"
						>1</span
					>
					<div>
						<h3 class="font-semibold text-gray-900">Forward your email</h3>
						<p class="text-gray-600">
							Send emails with itineraries, PDFs, or images to our processing address
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-4">
					<span
						class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800"
						>2</span
					>
					<div>
						<h3 class="font-semibold text-gray-900">We extract the events</h3>
						<p class="text-gray-600">
							Our system reads text, PDFs, and images to find dates, times, and locations
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-4">
					<span
						class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800"
						>3</span
					>
					<div>
						<h3 class="font-semibold text-gray-900">Get your calendar file</h3>
						<p class="text-gray-600">
							Receive an email with .ics file and Google Calendar import link
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- What I Use It For -->
		<div class="mb-8 rounded-lg bg-white p-8 shadow-sm">
			<h2 class="mb-6 text-2xl font-semibold text-gray-900">What I use it for</h2>

			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<h3 class="mb-2 font-semibold text-gray-900">Multi-city trip itineraries</h3>
					<p class="text-sm text-gray-600">
						Flight bookings, hotel confirmations, restaurant reservations across multiple cities and
						time zones
					</p>
				</div>

				<div>
					<h3 class="mb-2 font-semibold text-gray-900">Conference schedules</h3>
					<p class="text-sm text-gray-600">
						Event programs with multiple sessions, speakers, and networking events
					</p>
				</div>

				<div>
					<h3 class="mb-2 font-semibold text-gray-900">PDF event brochures</h3>
					<p class="text-sm text-gray-600">
						Attached PDF files with detailed schedules and event information
					</p>
				</div>

				<div>
					<h3 class="mb-2 font-semibold text-gray-900">Meeting confirmations</h3>
					<p class="text-sm text-gray-600">
						Email confirmations from booking platforms with dates and locations
					</p>
				</div>
			</div>
		</div>

		<!-- Email Address -->
		<div class="mb-8 rounded-lg bg-blue-600 p-8 text-center text-gray-900">
			<h2 class="mb-4 text-xl font-semibold">Try it with your next itinerary</h2>
			<p class="mb-4">Forward your email to:</p>

			<div class="bg-opacity-20 mb-4 rounded-lg bg-white p-4">
				<input
					type="text"
					readonly
					bind:value={emailAddress}
					on:click={selectEmail}
					class="w-full cursor-pointer border-none bg-transparent text-center font-mono text-xl outline-none focus:outline-none"
				/>
			</div>

			<p class="text-sm opacity-90">
				Works with text emails, PDF attachments, or images of schedules
			</p>
		</div>

		<!-- What You Get -->
		<div class="mb-8 rounded-lg bg-white p-8 shadow-sm">
			<h2 class="mb-6 text-2xl font-semibold text-gray-900">What you get back</h2>

			<ul class="space-y-3">
				<li class="flex items-center space-x-3">
					<span class="text-green-600">✓</span>
					<span>Email with extracted events and details</span>
				</li>
				<li class="flex items-center space-x-3">
					<span class="text-green-600">✓</span>
					<span>.ics calendar file attachment</span>
				</li>
				<li class="flex items-center space-x-3">
					<span class="text-green-600">✓</span>
					<span>Direct Google Calendar import link</span>
				</li>
				<li class="flex items-center space-x-3">
					<span class="text-green-600">✓</span>
					<span>Times converted to your local timezone</span>
				</li>
			</ul>
		</div>

		<!-- Example -->
		<div class="mb-8 rounded-lg bg-gray-100 p-6">
			<h3 class="mb-3 font-semibold text-gray-900">Example</h3>
			<p class="text-sm text-gray-700">
				Forward a travel confirmation email with "Flight UA123 departing LAX at 2:30 PM on March
				15th, Hotel check-in at 4:00 PM, dinner reservation at Chez Pierre at 7:30 PM Confirmation
				code - XDJRD" → Get back 3 calendar events ready to import with the confirmation code in the
				details.
			</p>
		</div>

		<footer class="text-center text-sm text-gray-500">
			<p>Built because I was tired of manual calendar entry</p>
		</footer>
	</div>
</div>
