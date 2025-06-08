import * as postmark from 'postmark';
import type { PostmarkWebhookPayload } from '$lib/types/postmark';
import { POSTMARK_SERVER_TOKEN, SENDER_EMAIL_ADDRESS, WEBHOOK_SECRET } from '$env/static/private';

// Initialize Postmark client
// Ensure POSTMARK_SERVER_TOKEN is set in your environment variables
const client = new postmark.ServerClient(POSTMARK_SERVER_TOKEN || '');

export default client;

interface Attachment {
	Name: string;
	Content: string; // Base64 encoded content
	ContentType: string;
	ContentID: string;
}

export async function sendResponseEmail(
	to: string,
	subject: string,
	htmlBody: string,
	icsAttachmentContent: string
): Promise<postmark.Models.MessageSendingResponse> {
	try {
		const message: postmark.Models.Message = {
			From: SENDER_EMAIL_ADDRESS || 'events@voxlify.com', // Ensure this is a registered sender signature
			To: to,
			Subject: subject,
			HtmlBody: htmlBody,
			Attachments: [
				{
					Name: 'event.ics',
					Content: Buffer.from(icsAttachmentContent).toString('base64'), // Buffer.from is fine in Node.js environment
					ContentType: 'text/calendar',
					ContentID: ''
				} as Attachment // Cast to our defined Attachment type or ensure it matches Postmark's expected type
			]
		};

		const result = await client.sendEmail(message);
		console.log('Response email sent successfully:', result);
		return result;
	} catch (error: unknown) {
		console.error('Failed to send response email:', error instanceof Error ? error.message : error);
		// Rethrow or handle as postmark.Errors.PostmarkError if more specific error handling is needed
		throw error;
	}
}

export async function sendNoEventsFoundEmail(
	to: string,
	originalSubject?: string
): Promise<postmark.Models.MessageSendingResponse> {
	try {
		const subject = `Re: ${originalSubject || 'Your email'} - No Events Found`;
		const htmlBody = `
			<p>Hello,</p>
			<p>I processed your email "${originalSubject || 'your email'}" but couldn't find any calendar events to extract.</p>
			<p>This could happen if:</p>
			<ul>
				<li>The email doesn't contain clear date/time information</li>
				<li>The event details are in an unsupported format</li>
				<li>The text is unclear or ambiguous</li>
			</ul>
			<p>Please try:</p>
			<ul>
				<li>Forwarding the original itinerary/confirmation email</li>
				<li>Including clearer date, time, and event information</li>
				<li>Replying to this email with more details</li>
			</ul>
			<p>If you continue having issues, feel free to email me directly for assistance @ hiro@trykaiwa.com .</p>
			<p>Thanks!</p>
		`;

		const message: postmark.Models.Message = {
			From: SENDER_EMAIL_ADDRESS || 'events@voxlify.com',
			To: to,
			Subject: subject,
			HtmlBody: htmlBody
		};

		const result = await client.sendEmail(message);
		console.log('No events found email sent successfully:', result);
		return result;
	} catch (error: unknown) {
		console.error(
			'Failed to send no events found email:',
			error instanceof Error ? error.message : error
		);
		throw error;
	}
}

// Placeholder for webhook validation logic
// Postmark payload can be complex, using 'any' for now for MVP
export function validatePostmarkWebhook(payload: PostmarkWebhookPayload): boolean {
	// Basic validation - log only essential info, not the full payload
	console.log('Webhook validation - payload summary:', {
		from: payload.From,
		subject: payload.Subject,
		messageId: payload.MessageID,
		attachmentCount: payload.Attachments?.length || 0
	});

	// Basic validation for now, can be expanded with signature verification
	// For signature verification, you'd compare a signature in the headers
	// (e.g., X-Postmark-Signature) with a signature you compute using a shared secret.
	// This example assumes a simple shared secret in the payload or a specific header.
	// It's highly recommended to implement proper signature verification for production.
	console.log('Webhook secret from env:', WEBHOOK_SECRET);
	// This is a placeholder. In a real scenario, you'd verify a signature.
	// Example using crypto module (ensure it's imported if used):
	// import crypto from 'crypto';
	// const requestBody = JSON.stringify(payload); // Ensure this is the raw, unmodified body
	// const signature = request.headers.get('x-postmark-signature'); // Or however Postmark sends it
	// const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET || '');
	// const digest = Buffer.from(hmac.update(requestBody).digest('hex'), 'utf8');
	// const calculatedSignature = Buffer.from(signature, 'utf8');
	// if (!crypto.timingSafeEqual(digest, calculatedSignature)) return false;

	return true; // Returning true for MVP purposes. IMPLEMENT PROPER VALIDATION!
}
