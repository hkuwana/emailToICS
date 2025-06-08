import { json, type RequestHandler } from '@sveltejs/kit';
// Ensure .js is used for SvelteKit to resolve imports to other .ts files in $lib/server if not using baseUrl/paths in tsconfig
import { processInboundEmail } from '$lib/server/email';
import { validatePostmarkWebhook } from '$lib/server/postmark';
import type { PostmarkWebhookPayload } from '$lib/types/postmark';

// The Postmark payload can be quite complex. For MVP, using 'any' is pragmatic,
// but for production, you'd define a more precise interface for the expected payload.
// interface PostmarkWebhookPayload { /* ... define expected fields ... */ }

export const POST: RequestHandler = async ({ request, platform }) => {
	console.log('Webhook received');
	try {
		const payload: PostmarkWebhookPayload = await request.json();

		const isValid = validatePostmarkWebhook(payload);
		if (!isValid) {
			console.warn('Invalid Postmark webhook attempt:', payload);
			return json({ error: 'Invalid webhook' }, { status: 401 });
		}

		console.log('Webhook received, processing email...');

		// Always use background processing to avoid timeouts
		// Return immediately to Postmark while processing continues
		if (platform && 'waitUntil' in platform && typeof platform.waitUntil === 'function') {
			console.log('Using background processing with waitUntil');
			platform.waitUntil(
				processInboundEmail(payload)
					.then((result) => {
						if (result) {
							console.log(
								`Background email processing finished for ${result.id}, status: ${result.status}`
							);
						} else {
							console.log('Background email processing finished, but no record was returned.');
						}
					})
					.catch((error) => {
						console.error('Error in background processInboundEmail:', error);
					})
			);
		} else {
			console.log('No waitUntil available, using Promise for background processing');
			// Start processing in background without waiting
			processInboundEmail(payload)
				.then((result) => {
					if (result) {
						console.log(
							`Background email processing finished for ${result.id}, status: ${result.status}`
						);
					} else {
						console.log('Background email processing finished, but no record was returned.');
					}
				})
				.catch((error) => {
					console.error('Error in background processInboundEmail:', error);
				});
		}

		// Always return immediately to avoid timeouts
		return json({ status: 'accepted', message: 'Email queued for processing' }, { status: 200 });
	} catch (error: unknown) {
		console.error(
			'Webhook handler synchronous error:',
			error instanceof Error ? error.message : error
		);
		return json({ error: 'Processing failed' }, { status: 500 });
	}
};
