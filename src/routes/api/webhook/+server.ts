import { json, type RequestHandler } from '@sveltejs/kit';
// Ensure .js is used for SvelteKit to resolve imports to other .ts files in $lib/server if not using baseUrl/paths in tsconfig
import { processInboundEmail } from '$lib/server/email';
import { validatePostmarkWebhook } from '$lib/server/postmark';
import type { PostmarkWebhookPayload } from '$lib/types/postmark';

// The Postmark payload can be quite complex. For MVP, using 'any' is pragmatic,
// but for production, you'd define a more precise interface for the expected payload.
// interface PostmarkWebhookPayload { /* ... define expected fields ... */ }

export const POST: RequestHandler = async ({ request, platform }) => {
	const startTime = Date.now();
	console.log('Webhook received at:', new Date().toISOString());

	try {
		console.log('Starting JSON parsing...');
		const jsonStartTime = Date.now();
		const payload: PostmarkWebhookPayload = await request.json();
		const jsonEndTime = Date.now();
		console.log(`JSON parsing completed in ${jsonEndTime - jsonStartTime}ms`);
		console.log('Payload size info:', {
			attachmentCount: payload.Attachments?.length || 0,
			textBodyLength: payload.TextBody?.length || 0,
			htmlBodyLength: payload.HtmlBody?.length || 0
		});

		console.log('Starting webhook validation...');
		const validationStartTime = Date.now();
		const isValid = validatePostmarkWebhook(payload);
		const validationEndTime = Date.now();
		console.log(`Webhook validation completed in ${validationEndTime - validationStartTime}ms`);

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
		const totalTime = Date.now() - startTime;
		console.log(`Webhook returning response after ${totalTime}ms`);
		return json({ status: 'accepted', message: 'Email queued for processing' }, { status: 200 });
	} catch (error: unknown) {
		const totalTime = Date.now() - startTime;
		console.error(
			`Webhook handler synchronous error after ${totalTime}ms:`,
			error instanceof Error ? error.message : error
		);
		return json({ error: 'Processing failed' }, { status: 500 });
	}
};
