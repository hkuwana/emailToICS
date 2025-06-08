import OpenAI from 'openai';
// import PDFParser from 'pdf2json';
import { OPENAI_API_KEY, OPENAI_TEXT_MODEL, OPENAI_VISION_MODEL } from '$env/static/private';

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
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

export async function extractEventsWithAI(emailData: EmailData): Promise<AIResponse> {
	const mainContent: string = emailData.textBody || '';
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
			}
			/*
			else if (attachment.ContentType === 'application/pdf' && attachment.Content) {
				try {
					const pdfParser = new PDFParser();
					const pdfBuffer = Buffer.from(attachment.Content, 'base64');

					console.log(`Starting to parse PDF attachment: ${attachment.Name}`);
					const pdfText = await new Promise<string>((resolve, reject) => {
						pdfParser.on('pdfParser_dataError', (errData) => {
							console.error(`Error parsing PDF ${attachment.Name}:`, errData.parserError);
							reject(errData.parserError);
						});
						pdfParser.on('pdfParser_dataReady', () => {
							try {
								const textContent = pdfParser.getRawTextContent();
								console.log(`Successfully parsed PDF attachment: ${attachment.Name}`);
								resolve(textContent);
							} catch (e) {
								console.error(`Error getting raw text content from PDF ${attachment.Name}:`, e);
								reject(e);
							}
						});
						pdfParser.parseBuffer(pdfBuffer);
					});

					mainContent += `\n\n--- PDF Attachment Content: ${attachment.Name} ---\n${pdfText}`;
					console.log(`Extracted text from PDF attachment: ${attachment.Name}`);
				} catch (pdfError) {
					console.error(`Failed to process PDF attachment ${attachment.Name}:`, pdfError);
					mainContent += `\n\n--- Failed to process PDF Attachment: ${attachment.Name} ---`;
				}
			}
			*/
		}
	}

	const userMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
	let modelToUse: string = OPENAI_TEXT_MODEL;

	if (imagePayloads.length > 0) {
		modelToUse = OPENAI_VISION_MODEL;
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

		console.log('OpenAI API call successful.');

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
		console.error('Error calling OpenAI API or parsing response:', error);
		return { events: [] };
	}
}
