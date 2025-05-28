<script>
	let testEmailAddress = 'your-unique-email@yourdomain.com'; // Replace with your actual Postmark inbound email
	let infoMessage =
		'Send an email with event details (text, PDF, or image) to the address above to generate a calendar event!';

	// Example: If you set up Postmark to forward to something like inbound@yourapp.emailcal.com
	// and have a rule to process emails for test-user@yourdomain.com
	// then testEmailAddress would be test-user@yourdomain.com or whatever you configure for Postmark to receive.
	// For the MVP, the Postmark inbound webhook URL is what receives the data, not a specific email address you send TO directly in the app UI,
	// rather an email address Postmark is configured to watch.

	// The email address displayed should be the one users send *to*, which Postmark then forwards to your webhook.
</script>

<svelte:head>
	<title>EmailCal</title>
	<meta name="description" content="Convert emails to calendar events automatically" />
</svelte:head>

<div class="container mx-auto p-8 text-center">
	<h1 class="mb-6 text-4xl font-bold">EmailCal</h1>

	<p class="mb-4">
		Welcome to EmailCal! This service automatically extracts event information from your emails
		(including text, attached PDFs, or images) and sends you back an ICS calendar file.
	</p>

	<div class="mb-8 rounded-lg bg-gray-100 p-6 shadow-md">
		<h2 class="mb-3 text-2xl font-semibold">How to Use</h2>
		<p class="mb-2">
			1. Configure your Postmark account to send inbound emails to the webhook URL provided by this
			application deployment (usually `https:/api/webhook`).
		</p>
		<p class="mb-2">
			2. Send an email containing event details to the email address you've configured in Postmark
			for inbound processing.
		</p>
		<p class="mb-2">
			Example: If you set up `events@yourdomain.com` in Postmark to forward to the webhook, send
			your event emails to `events@yourdomain.com`.
		</p>
		<p class="text-sm text-gray-600">
			(The input field below is a placeholder for where you might display such an email address if
			it were static or user-specific in a full app. For this MVP, the key is your Postmark setup.)
		</p>
		<input
			type="text"
			readonly
			value={testEmailAddress}
			class="mx-auto mt-2 w-full cursor-not-allowed rounded border bg-gray-50 p-2 text-center md:w-1/2"
			title="This is a placeholder. Configure your inbound email address in Postmark."
		/>
	</div>

	<p class="mb-4 text-lg">
		{infoMessage}
	</p>

	<div class="mt-8">
		<h3 class="mb-2 text-xl font-semibold">Features:</h3>
		<ul class="inline-block list-inside list-disc text-left">
			<li>Automatic event extraction from email body.</li>
			<li>Text extraction from PDF attachments.</li>
			<li>Event detail extraction from image attachments (via OpenAI Vision).</li>
			<li>ICS calendar file generation.</li>
			<li>Email notification with ICS attachment.</li>
		</ul>
	</div>

	<footer class="mt-12 text-sm text-gray-500">
		<p>Powered by SvelteKit, Vercel, Postmark, and OpenAI.</p>
	</footer>
</div>
