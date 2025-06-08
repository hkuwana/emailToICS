import OpenAI from 'openai';
// import PDFParser from 'pdf2json';
import { OPENAI_API_KEY, OPENAI_TEXT_MODEL, OPENAI_VISION_MODEL } from '$env/static/private';

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY,
	timeout: 45000 // 45 seconds timeout for OpenAI calls
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
	rawResponse?: string; // For debugging
	model?: string; // For debugging
	timing?: number; // For debugging
}

// Helper function to check if model is an o1 variant
function isO1Model(modelName: string): boolean {
	return modelName.includes('o1') || modelName.includes('o4-mini');
}

export async function extractEventsWithAI(emailData: EmailData): Promise<AIResponse> {
	try {
		console.log('=== extractEventsWithAI function started ===');
		console.log('Email data received:', {
			hasTextBody: !!emailData.textBody,
			subject: emailData.subject,
			attachmentCount: emailData.attachments?.length || 0
		});

		const mainContent: string = emailData.textBody || '';
		const imagePayloads: OpenAI.Chat.Completions.ChatCompletionContentPartImage[] = [];

		console.log('Main content length:', mainContent.length);

		console.log('Starting attachment processing...');
		if (emailData.attachments && emailData.attachments.length > 0) {
			console.log(`Processing ${emailData.attachments.length} attachments`);
			for (const attachment of emailData.attachments) {
				console.log(`Processing attachment: ${attachment.Name}, type: ${attachment.ContentType}`);
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
		} else {
			console.log('No attachments to process');
		}
		console.log('Attachment processing completed');

		const userMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
		let modelToUse: string = OPENAI_TEXT_MODEL;

		// Fallback to more reliable model if the configured one seems problematic
		if (!modelToUse || modelToUse === 'gpt-4.1') {
			console.log('Using fallback model gpt-4-turbo instead of', modelToUse);
			modelToUse = 'gpt-4-turbo';
		}

		console.log('Model selection and message building...');
		console.log('OPENAI_TEXT_MODEL:', OPENAI_TEXT_MODEL);
		console.log('OPENAI_VISION_MODEL:', OPENAI_VISION_MODEL);
		console.log('Final model to use:', modelToUse);
		console.log('Image payloads count:', imagePayloads.length);

		if (imagePayloads.length > 0) {
			console.log('Using vision model due to image attachments');
			// Use vision model, with fallback if needed
			let visionModel = OPENAI_VISION_MODEL;
			if (!visionModel || visionModel === 'gpt-4.1') {
				console.log('Using fallback vision model gpt-4-turbo instead of', visionModel);
				visionModel = 'gpt-4-turbo';
			}
			modelToUse = visionModel;

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
			console.log('Using text model for text-only processing');

			// Truncate very long content to improve performance
			const maxContentLength = 4000; // Reasonable limit for API efficiency
			let processedContent = mainContent;
			if (mainContent.length > maxContentLength) {
				console.log(
					`Content too long (${mainContent.length} chars), truncating to ${maxContentLength} chars`
				);
				processedContent =
					mainContent.substring(0, maxContentLength) +
					'\n\n[Content truncated for processing efficiency]';
			}

			const prompt = `Extract calendar events from this email. Return JSON with "events" array.

Each event needs:
- title (string)  
- startDate (ISO 8601: YYYY-MM-DDTHH:mm:ssZ)
- endDate (ISO 8601: YYYY-MM-DDTHH:mm:ssZ)
- location (optional)
- description (optional)

Current time for relative dates: ${new Date().toISOString()}

Subject: ${emailData.subject || 'N/A'}

Content:
${processedContent}`;

			userMessages.push({ role: 'user', content: prompt });
			console.log(`Using text model ${modelToUse} for text processing.`);
		}

		console.log('Messages prepared, about to start OpenAI API call...');
		console.log('Final model to use:', modelToUse);
		console.log('User messages length:', userMessages.length);

		try {
			console.log('Starting OpenAI API call with timeout...');
			console.log('Environment check - running on Vercel:', !!process.env.VERCEL);
			console.log('Available memory:', process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || 'unknown');
			const startTime = Date.now();

			// Add a timeout wrapper for additional safety - increased for complex emails
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Custom timeout after 90 seconds')), 90000);
			});

			// Prepare the request parameters
			const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
				model: modelToUse,
				messages: userMessages,
				response_format: { type: 'json_object' },
				max_completion_tokens: 4000 // Reasonable limit for event extraction
			};

			// Only add temperature for non-o1 models
			if (!isO1Model(modelToUse)) {
				requestParams.temperature = 0.1; // Lower temperature for more consistent results
			}

			const apiCallPromise = openai.chat.completions.create(requestParams);
			const response = (await Promise.race([
				apiCallPromise,
				timeoutPromise
			])) as OpenAI.Chat.Completions.ChatCompletion;

			const endTime = Date.now();
			console.log(`OpenAI API call completed in ${endTime - startTime}ms`);

			console.log('OpenAI API call successful.');

			// Log the full response structure for debugging
			console.log('Full OpenAI response structure:', {
				id: response.id,
				object: response.object,
				model: response.model,
				usage: response.usage,
				choices_length: response.choices?.length,
				first_choice: response.choices?.[0]
					? {
							index: response.choices[0].index,
							message_role: response.choices[0].message?.role,
							message_content_length: response.choices[0].message?.content?.length,
							message_content_preview: response.choices[0].message?.content?.substring(0, 100),
							finish_reason: response.choices[0].finish_reason
						}
					: 'No first choice'
			});

			const message = response.choices[0].message;
			let messageContent = message.content;

			// Check if the response is in the refusal field (common with some models)
			if (!messageContent && message.refusal) {
				console.log('Response found in refusal field, using that instead');
				messageContent = message.refusal;
			}

			if (!messageContent) {
				console.error(
					'OpenAI response content is null or empty in both content and refusal fields.'
				);
				console.error('Full message object:', message);
				return { events: [] };
			}

			console.log('Raw AI response (full):', messageContent);
			const parsedJson = JSON.parse(messageContent);

			const debugInfo = {
				rawResponse: messageContent,
				model: modelToUse,
				timing: endTime - startTime
			};

			if (Array.isArray(parsedJson)) {
				console.log('extractEventsWithAI completed successfully!');
				return { events: parsedJson as ExtractedEvent[], ...debugInfo };
			} else if (parsedJson && Array.isArray(parsedJson.events)) {
				console.log('extractEventsWithAI completed successfully!');
				return { events: parsedJson.events as ExtractedEvent[], ...debugInfo };
			} else {
				console.warn(
					'AI response was not an array of events or an object with an events array. Attempting to use as single event if valid.',
					parsedJson
				);
				if (parsedJson && parsedJson.title && parsedJson.startDate) {
					console.log('extractEventsWithAI completed successfully!');
					return { events: [parsedJson as ExtractedEvent], ...debugInfo };
				}
				console.log('extractEventsWithAI completed successfully!');
				return { events: [], ...debugInfo };
			}
		} catch (error: unknown) {
			console.error('Error calling OpenAI API or parsing response:', error);

			// Check if it's a timeout error
			if (error instanceof Error) {
				if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
					console.error(
						'OpenAI API call timed out - consider increasing timeout or optimizing prompt'
					);
				}
				console.error('Error details:', {
					name: error.name,
					message: error.message,
					stack: error.stack?.split('\n').slice(0, 3) // First 3 lines of stack trace
				});
			}

			return { events: [] };
		}
	} catch (outerError: unknown) {
		console.error('Error in extractEventsWithAI function before API call:', outerError);
		if (outerError instanceof Error) {
			console.error('Outer error details:', {
				name: outerError.name,
				message: outerError.message,
				stack: outerError.stack?.split('\n').slice(0, 5) // First 5 lines of stack trace
			});
		}
		return { events: [] };
	}
}
