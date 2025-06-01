import OpenAI from 'openai';
// import pdfParse from 'pdf-parse'; // Remove pdf-parse
import * as PDFJS from 'pdfjs-dist/legacy/build/pdf.mjs'; // Import pdfjs-dist
import { Buffer } from 'buffer';

// Set workerSrc for Node.js environment.
// The 'legacy' build is often more straightforward for CJS/ESM interop in Node.
// We might need to adjust this path based on your project structure or how pdfjs-dist is bundled.
// A common pattern is to also import the worker file itself to get its path.
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
PDFJS.GlobalWorkerOptions.workerSrc = workerSrc;

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY || ''
});

// Define structure for Postmark attachments (subset of fields we care about)
interface PostmarkAttachment {
	Name: string;
	Content: string; // Base64 encoded
	ContentType: string;
	ContentLength: number;
}

// Define structure for the email data we pass around
interface EmailData {
	textBody?: string;
	subject?: string;
	attachments?: PostmarkAttachment[];
	// Add other fields from postmarkPayload if needed by AI, like From, To, Date etc.
}

// Define structure for the events we expect AI to return
interface ExtractedEvent {
	title: string;
	startDate: string; // ISO 8601 format
	endDate: string; // ISO 8601 format
	location?: string;
	description?: string;
	timezone?: string; // IANA timezone name
}

interface AIResponse {
	events: ExtractedEvent[];
}

// Minimal interface for items from getTextContent()
interface PdfTextItem {
	str: string;
	// Other properties like dir, width, height, transform, fontName are available but not used here
}

async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
	const loadingTask = PDFJS.getDocument({ data: new Uint8Array(pdfBuffer) });
	const pdfDocument = await loadingTask.promise;
	let fullText = '';
	for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
		const page = await pdfDocument.getPage(pageNum);
		const textContent = await page.getTextContent();
		const pageText = textContent.items.map((item) => (item as PdfTextItem).str).join(' ');
		fullText += pageText + '\n\n';
		page.cleanup();
	}
	return fullText.trim();
}

export async function extractEventsWithAI(emailData: EmailData): Promise<AIResponse> {
	let mainContent: string = emailData.textBody || '';
	const imagePayloads: OpenAI.Chat.Completions.ChatCompletionContentPartImage[] = [];

	if (emailData.attachments && emailData.attachments.length > 0) {
		for (const attachment of emailData.attachments) {
			if (
				attachment.ContentType &&
				attachment.ContentType.startsWith('image/') &&
				attachment.Content
			) {
				imagePayloads.push({
					type: 'image_url',
					image_url: {
						url: `data:${attachment.ContentType};base64,${attachment.Content}`
					}
				});
				console.log(`Prepared image attachment for AI: ${attachment.Name}`);
			} else if (attachment.ContentType === 'application/pdf' && attachment.Content) {
				try {
					const pdfBuffer: Buffer = Buffer.from(attachment.Content, 'base64');
					// const data = await pdfParse(pdfBuffer); // Old way
					// mainContent += `\n\n--- PDF Attachment: ${attachment.Name} ---\n${data.text}`; // Old way
					const pdfText = await extractTextFromPdf(pdfBuffer);
					mainContent += `\n\n--- PDF Attachment: ${attachment.Name} ---\n${pdfText}`;
					console.log(`Extracted text from PDF attachment: ${attachment.Name}`);
				} catch (error: unknown) {
					console.error(
						`Error parsing PDF ${attachment.Name}:`,
						error instanceof Error ? error.message : error
					);
					mainContent += `\n\n--- Error processing PDF attachment: ${attachment.Name} ---`;
				}
			}
		}
	}

	const userMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
	let modelToUse: string = process.env.OPENAI_TEXT_MODEL || 'gpt-4';

	if (imagePayloads.length > 0) {
		modelToUse = process.env.OPENAI_VISION_MODEL || 'gpt-4o';
		const visionPrompt = `
      Extract calendar events from the provided email content and/or images.
      Focus on identifying event details like title, start date, end date, location, and description.
      Current time context for relative dates (e.g., "tomorrow"): ${new Date().toISOString()}
      Email Subject: ${emailData.subject || 'N/A'}
    `;

		const contentArray: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
			{ type: 'text', text: visionPrompt }
		];
		if (mainContent.trim()) {
			contentArray.push({ type: 'text', text: `Email Body / PDF Text:\n${mainContent}` });
		}
		contentArray.push(...imagePayloads);
		userMessages.push({ role: 'user', content: contentArray });
		console.log(`Using vision model ${modelToUse} for image processing.`);
	} else {
		const prompt = `
      Extract calendar events from this email content.
      Return a JSON array of objects. Each object should represent an event and include these fields: 
      - title (string)
      - startDate (string, ISO 8601 format, e.g., YYYY-MM-DDTHH:mm:ssZ)
      - endDate (string, ISO 8601 format, e.g., YYYY-MM-DDTHH:mm:ssZ)
      - location (string, optional)
      - description (string, optional)
      - timezone (string, IANA timezone name like 'America/New_York', optional, try to infer if possible)

      If you cannot determine a field, omit it or set to null. Ensure dates are fully qualified.
      Current time context for relative dates (e.g., "tomorrow"): ${new Date().toISOString()}
      Email Subject: ${emailData.subject || 'N/A'}
      Email Body / PDF Text:
      ${mainContent}
    `;
		userMessages.push({ role: 'user', content: prompt });
		console.log(`Using text model ${modelToUse} for text processing.`);
	}

	try {
		const response = await openai.chat.completions.create({
			model: modelToUse,
			messages: userMessages,
			response_format: { type: 'json_object' }
		});

		const messageContent = response.choices[0].message.content;
		if (!messageContent) {
			console.error('OpenAI response content is null or empty.');
			return { events: [] };
		}

		console.log('Raw AI response:', messageContent);
		const parsedJson = JSON.parse(messageContent);

		if (Array.isArray(parsedJson)) {
			return { events: parsedJson as ExtractedEvent[] };
		} else if (parsedJson && Array.isArray(parsedJson.events)) {
			return { events: parsedJson.events as ExtractedEvent[] };
		} else {
			console.warn(
				'AI response was not an array of events or an object with an events array. Attempting to use as single event if valid.',
				parsedJson
			);
			if (parsedJson && parsedJson.title && parsedJson.startDate) {
				return { events: [parsedJson as ExtractedEvent] };
			}
			return { events: [] };
		}
	} catch (error: unknown) {
		console.error(
			'Error calling OpenAI API or parsing response:',
			error instanceof Error ? error.message : error
		);
		return { events: [] };
	}
}
