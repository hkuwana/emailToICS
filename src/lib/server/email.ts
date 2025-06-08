import { extractEventsWithAI } from './ai.js';
import { generateICS } from './calendar.js';
import { sendResponseEmail } from './postmark.js';
import { v4 as uuidv4 } from 'uuid';
// Define types locally since they're not in a shared types file
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
	status: string;
}
import type {
	PostmarkWebhookPayload,
	PostmarkAttachment as WebhookPostmarkAttachment
} from '$lib/types/postmark';

// Define a more specific type for the data passed to AI, based on PostmarkWebhookPayload
interface EmailDataForAI {
	id: string;
	from: string; // Ensure this is always a string
	subject?: string;
	textBody?: string;
	htmlBody?: string;
	attachments?: WebhookPostmarkAttachment[]; // Use the imported type
	receivedAt: string;
	messageId?: string;
}

export async function processInboundEmail(
	postmarkPayload: PostmarkWebhookPayload
): Promise<EventRecord | void> {
	// Ensure 'from' email is available
	const fromEmail = postmarkPayload.FromFull?.Email || postmarkPayload.From;
	if (!fromEmail) {
		console.error(
			'No "From" email address found in Postmark payload. Skipping processing.',
			postmarkPayload
		);
		return;
	}
	console.log('Processing inbound email from:', fromEmail);
	console.log('Email subject:', postmarkPayload.Subject);
	console.log('Text body length:', postmarkPayload.TextBody?.length || 0);
	console.log('Attachments count:', postmarkPayload.Attachments?.length || 0);
	const eventId = `evt_${uuidv4()}`;

	const emailData: EmailDataForAI = {
		id: eventId,
		from: fromEmail,
		subject: postmarkPayload.Subject,
		textBody: postmarkPayload.TextBody,
		htmlBody: postmarkPayload.HtmlBody,
		attachments: postmarkPayload.Attachments,
		receivedAt: postmarkPayload.Date || new Date().toISOString(),
		messageId: postmarkPayload.MessageID
	};

	try {
		console.log('About to call extractEventsWithAI...');
		console.log('Email data being passed to AI:', {
			id: emailData.id,
			from: emailData.from,
			subject: emailData.subject,
			textBodyLength: emailData.textBody?.length || 0,
			attachmentCount: emailData.attachments?.length || 0
		});

		const aiResult = await extractEventsWithAI(emailData);
		const extractedEvents: ExtractedEvent[] = aiResult.events;

		if (!extractedEvents || extractedEvents.length === 0) {
			console.log(`No events extracted by AI for ${eventId}.`);
			// Optionally send an email informing the user that no events were found
			return;
		}

		console.log(`AI extracted ${extractedEvents.length} event(s) for ${eventId}.`);

		const icsContent = generateICS(extractedEvents);
		if (!icsContent) {
			console.warn(`ICS generation returned null for ${eventId}.`);
			// Optionally send an email about the failure
			return;
		}

		let emailHtmlResponse = `<p>Hello,</p><p>We've processed your email "${emailData.subject || 'your email'}" and found the following event(s):</p><ul>`;
		extractedEvents.forEach((event) => {
			const googleCalendarLink = new URL('https://www.google.com/calendar/render');
			googleCalendarLink.searchParams.append('action', 'TEMPLATE');
			googleCalendarLink.searchParams.append('text', event.title);
			const startDate = new Date(event.startDate).toISOString().replace(/-|:|\.\d{3}/g, '');
			const endDate = new Date(event.endDate).toISOString().replace(/-|:|\.\d{3}/g, '');
			googleCalendarLink.searchParams.append('dates', `${startDate}/${endDate}`);
			if (event.location) {
				googleCalendarLink.searchParams.append('location', event.location);
			}
			if (event.description) {
				googleCalendarLink.searchParams.append('details', event.description);
			}
			if (event.timezone) {
				googleCalendarLink.searchParams.append('ctz', event.timezone);
			}

			emailHtmlResponse += `<li>
				<b>${event.title}</b>: ${new Date(event.startDate).toLocaleString()} - ${new Date(event.endDate).toLocaleString()}
				<br><a href="${googleCalendarLink.toString()}" target="_blank">Add to Google Calendar</a>
			</li>`;
		});
		emailHtmlResponse += `</ul><p>Please find the .ics calendar file attached.</p><p>Thank you!</p>`;

		await sendResponseEmail(
			emailData.from,
			`Calendar Events from "${emailData.subject || 'your email'}"`,
			emailHtmlResponse,
			icsContent
		);
		console.log(`Response email sent for ${eventId}.`);
	} catch (processingError: unknown) {
		console.error(
			`Error during processing for event ${eventId}:`,
			processingError instanceof Error ? processingError.message : processingError
		);
		// Since there's no database, we can't store the error state.
		// Consider sending an error email to the user.
	}
}

// Consider creating src/lib/types/eventRecord.ts with:
