import { extractEventsWithAI } from './ai.js';
import { generateICS } from './calendar.js';
import { sendResponseEmail } from './postmark.js';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';
import type { EventRecord, ExtractedEvent } from '$lib/types/eventRecord';
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
	} catch (dbError: unknown) {
		console.error(
			`Failed to store initial event record ${eventId}:`,
			dbError instanceof Error ? dbError.message : dbError
		);
		return;
	}

	try {
		const aiResult = await extractEventsWithAI(emailData);
		const extractedEvents: ExtractedEvent[] = aiResult.events;

		const currentRecord = (await kv.get(`event:${eventId}`)) as EventRecord | null;
		if (!currentRecord) {
			console.error(`Event record ${eventId} not found after initial set. This should not happen.`);
			return; // Critical error, stop processing
		}

		if (!extractedEvents || extractedEvents.length === 0) {
			console.log(`No events extracted by AI for ${eventId}.`);
			const noEventsUpdate: Partial<EventRecord> = {
				status: 'processed_no_events',
				processedAt: new Date().toISOString(),
				extractedEvents: []
			};
			await kv.set(`event:${eventId}`, { ...currentRecord, ...noEventsUpdate });
			return {
				...currentRecord,
				...noEventsUpdate
			} as EventRecord;
		}

		console.log(`AI extracted ${extractedEvents.length} event(s) for ${eventId}.`);

		const icsContent = generateICS(extractedEvents);
		if (!icsContent) {
			console.warn(`ICS generation returned null for ${eventId}.`);
			const icsErrorUpdate: Partial<EventRecord> = {
				status: 'error_ics_generation',
				processedAt: new Date().toISOString(),
				extractedEvents,
				error: 'ICS generation failed or produced no content'
			};
			const recordForIcsError = (await kv.get(`event:${eventId}`)) as EventRecord | null;
			if (recordForIcsError) {
				await kv.set(`event:${eventId}`, { ...recordForIcsError, ...icsErrorUpdate });
				return { ...recordForIcsError, ...icsErrorUpdate } as EventRecord;
			}
			return { ...initialRecord, ...icsErrorUpdate, extractedEvents } as EventRecord;
		}

		const finalRecordUpdate: Partial<EventRecord> = {
			extractedEvents,
			icsFile: icsContent,
			status: 'processed',
			processedAt: new Date().toISOString()
		};

		const recordBeforeFinalSet = (await kv.get(`event:${eventId}`)) as EventRecord | null;
		if (!recordBeforeFinalSet) {
			console.error(
				`Event record ${eventId} not found before final update. This should not happen.`
			);
			await kv.set(`event:${eventId}`, { ...initialRecord, ...finalRecordUpdate });
			return { ...initialRecord, ...finalRecordUpdate } as EventRecord;
		}

		const finalEventRecord: EventRecord = { ...recordBeforeFinalSet, ...finalRecordUpdate };
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
	} catch (processingError: unknown) {
		console.error(
			`Error during processing for event ${eventId}:`,
			processingError instanceof Error ? processingError.message : processingError
		);
		const errorDetailsUpdate: Partial<EventRecord> = {
			status: 'error',
			error:
				processingError instanceof Error ? processingError.message : 'Unknown processing error',
			processedAt: new Date().toISOString()
		};
		try {
			const recordForErrorUpdate = (await kv.get(`event:${eventId}`)) as EventRecord | null;
			if (recordForErrorUpdate) {
				await kv.set(`event:${eventId}`, { ...recordForErrorUpdate, ...errorDetailsUpdate });
				return { ...recordForErrorUpdate, ...errorDetailsUpdate } as EventRecord;
			}
			return { ...initialRecord, ...errorDetailsUpdate } as EventRecord;
		} catch (dbUpdateError: unknown) {
			console.error(
				`Failed to update event record ${eventId} with error status:`,
				dbUpdateError instanceof Error ? dbUpdateError.message : dbUpdateError
			);
		}
		return { ...initialRecord, ...errorDetailsUpdate } as EventRecord;
	}
}

// Consider creating src/lib/types/eventRecord.ts with:
