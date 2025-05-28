import { extractEventsWithAI } from './ai.js'; // .js extension might be needed for SvelteKit/Vite resolution with TS files
import { generateICS } from './calendar.js';
import { sendResponseEmail } from './postmark.js';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';
import type { EventRecord, ExtractedEvent } from '$lub/types/eventRecord'; // Assuming you might create a central types file
// If not, define interfaces directly or import from ai.ts/calendar.ts if exported and suitable

// Define structure for Postmark attachments (subset of fields we care about)
// This could also be imported from a central types file or from ai.ts if defined there broadly enough
interface PostmarkAttachment {
	Name: string;
	Content: string; // Base64 encoded
	ContentType: string;
	ContentLength: number;
	// Add other fields if necessary from Postmark's actual attachment structure
}

// Define structure for the incoming Postmark payload (subset of fields we use)
interface PostmarkPayload {
	From: string;
	FromFull?: { Email: string; Name?: string };
	Subject?: string;
	TextBody?: string;
	HtmlBody?: string;
	Attachments?: PostmarkAttachment[];
	Date?: string; // ISO Date string
	MessageID?: string;
	// Add other fields as needed
}

// Define a more specific type for the data passed to AI, based on PostmarkPayload
interface EmailDataForAI {
	id: string;
	from: string;
	subject?: string;
	textBody?: string;
	htmlBody?: string;
	attachments?: PostmarkAttachment[];
	receivedAt: string;
	messageId?: string;
}

// Re-define or import ExtractedEvent if not using a central types/eventRecord.ts
// For this example, let's assume it's similar to what ai.ts expects.
// interface ExtractedEvent {
//   title: string;
//   startDate: string;
//   endDate: string;
//   location?: string;
//   description?: string;
//   timezone?: string;
// }

export async function processInboundEmail(
	postmarkPayload: PostmarkPayload
): Promise<EventRecord | void> {
	console.log('Processing inbound email from:', postmarkPayload.From);
	const eventId = `evt_${uuidv4()}`;

	const emailData: EmailDataForAI = {
		id: eventId,
		from: postmarkPayload.FromFull?.Email || postmarkPayload.From,
		subject: postmarkPayload.Subject,
		textBody: postmarkPayload.TextBody,
		htmlBody: postmarkPayload.HtmlBody,
		attachments: postmarkPayload.Attachments,
		receivedAt: postmarkPayload.Date || new Date().toISOString(),
		messageId: postmarkPayload.MessageID
	};

	const initialRecord: EventRecord = {
		id: eventId,
		userEmail: emailData.from,
		originalEmail: {
			from: emailData.from,
			subject: emailData.subject,
			textBody: emailData.textBody,
			htmlBody: emailData.htmlBody,
			receivedAt: emailData.receivedAt,
			messageId: emailData.messageId
		},
		extractedEvents: [],
		icsFile: null,
		status: 'pending',
		createdAt: new Date().toISOString(),
		error: null
	};

	try {
		await kv.set(`event:${eventId}`, initialRecord);
		console.log(`Initial event record ${eventId} stored.`);
	} catch (dbError: any) {
		console.error(`Failed to store initial event record ${eventId}:`, dbError);
	}

	try {
		const aiResult = await extractEventsWithAI(emailData); // ai.ts expects EmailData (ensure fields match)
		const extractedEvents: ExtractedEvent[] = aiResult.events; // ai.js should return { events: [...] }

		if (!extractedEvents || extractedEvents.length === 0) {
			console.log(`No events extracted by AI for ${eventId}.`);
			await kv.patch(`event:${eventId}`, {
				status: 'processed_no_events',
				processedAt: new Date().toISOString(),
				extractedEvents: []
			});
			return {
				...initialRecord,
				status: 'processed_no_events',
				processedAt: new Date().toISOString(),
				extractedEvents: []
			};
		}

		console.log(`AI extracted ${extractedEvents.length} event(s) for ${eventId}.`);

		const icsContent = await generateICS(extractedEvents); // calendar.ts expects CalendarAppEvent[]
		if (!icsContent) {
			console.warn(`ICS generation returned null for ${eventId}.`);
			const errorState: Partial<EventRecord> = {
				status: 'error_ics_generation',
				processedAt: new Date().toISOString(),
				extractedEvents,
				error: 'ICS generation failed or produced no content'
			};
			await kv.patch(`event:${eventId}`, errorState);
			// Consider returning the record with error state
			return { ...initialRecord, ...errorState, extractedEvents } as EventRecord;
		}

		const finalEventRecord: EventRecord = {
			...initialRecord,
			extractedEvents,
			icsFile: icsContent,
			status: 'processed',
			processedAt: new Date().toISOString()
		};
		await kv.set(`event:${eventId}`, finalEventRecord);
		console.log(`Event record ${eventId} updated with processed data.`);

		let emailHtmlResponse = `<p>Hello,</p><p>We've processed your email "${emailData.subject || 'your email'}" and found the following event(s):</p><ul>`;
		extractedEvents.forEach((event) => {
			emailHtmlResponse += `<li><b>${event.title}</b>: ${new Date(event.startDate).toLocaleString()} - ${new Date(event.endDate).toLocaleString()}</li>`;
		});
		emailHtmlResponse += `</ul><p>Please find the .ics calendar file attached.</p><p>Thank you!</p>`;

		await sendResponseEmail(
			emailData.from,
			`Calendar Events from "${emailData.subject || 'your email'}"`,
			emailHtmlResponse,
			icsContent
		);
		console.log(`Response email sent for ${eventId}.`);

		return finalEventRecord;
	} catch (processingError: any) {
		console.error(`Error during processing for event ${eventId}:`, processingError);
		const errorDetails: Partial<EventRecord> = {
			status: 'error',
			error: processingError.message || 'Unknown processing error',
			processedAt: new Date().toISOString()
		};
		try {
			await kv.patch(`event:${eventId}`, errorDetails);
		} catch (dbUpdateError: any) {
			console.error(`Failed to update event record ${eventId} with error status:`, dbUpdateError);
		}
		// For the caller (webhook), we might not want to re-throw and cause a non-200 response to Postmark
		// Instead, log it and let the webhook return 200. The error is stored in KV.
		// However, if the error is critical before KV update, throwing might be needed.
		// For now, it does not re-throw, implying the webhook will still return 200 if this point is reached.
		return { ...initialRecord, ...errorDetails } as EventRecord; // Return the record with error status
	}
}

// Consider creating src/lib/types/eventRecord.ts with:

