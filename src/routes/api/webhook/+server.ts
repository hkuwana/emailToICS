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

		// For production: Use waitUntil for background processing to avoid timeouts
		// For now: Process synchronously to ensure completion
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
			return json({ status: 'accepted', message: 'Email queued for processing' }, { status: 200 });
		} else {
			console.log('No waitUntil available, processing synchronously');
			// Wait for processing to complete before responding
			// This ensures the function doesn't get terminated by Vercel
			try {
				const result = await processInboundEmail(payload);
				if (result) {
					console.log(`Email processing finished for ${result.id}, status: ${result.status}`);
					return json(
						{ status: 'accepted', message: 'Email processed successfully' },
						{ status: 200 }
					);
				} else {
					console.log('Email processing finished, but no record was returned.');
					return json(
						{ status: 'accepted', message: 'Email processed but no events found' },
						{ status: 200 }
					);
				}
			} catch (processingError) {
				console.error('Error in processInboundEmail from webhook:', processingError);
				// Still return 200 to Postmark so they don't retry
				return json(
					{ status: 'error', message: 'Processing failed but webhook accepted' },
					{ status: 200 }
				);
			}
		}
	} catch (error: unknown) {
		console.error(
			'Webhook handler synchronous error:',
			error instanceof Error ? error.message : error
		);
		return json({ error: 'Processing failed' }, { status: 500 });
	}
};
