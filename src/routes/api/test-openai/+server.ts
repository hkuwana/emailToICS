import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractEventsWithAI } from '$lib/server/ai';
import { OPENAI_API_KEY, OPENAI_TEXT_MODEL } from '$env/static/private';

export const POST: RequestHandler = async () => {
	// Only allow in development mode
	if (!dev) {
		throw error(404, 'Not found');
	}

	try {
		console.log('=== Testing extractEventsWithAI Function ===');
		console.log('OPENAI_API_KEY:', OPENAI_API_KEY ? 'SET' : 'NOT SET');
		console.log('OPENAI_TEXT_MODEL:', OPENAI_TEXT_MODEL || 'NOT SET');
		console.log('Environment is dev:', dev);

		if (!OPENAI_API_KEY) {
			console.error('OpenAI API key is missing');
			return json({ error: 'OpenAI API key is not configured' }, { status: 500 });
		}

		// Create sample email data similar to what Postmark would send
		const sampleEmailData = {
			subject: 'Paris Trip Confirmation',
			textBody: `
Hello! Here are your travel details:

Flight: UA123 departing LAX on March 15th at 2:30 PM, arriving CDG March 16th at 11:45 AM
Hotel: Le Marais Hotel check-in March 16th at 3:00 PM  
Tour: Eiffel Tower guided tour March 17th at 10:00 AM
Dinner: Chez Pierre reservation March 17th at 7:30 PM
Return: Flight UA456 departing CDG March 19th at 6:15 PM

Have a great trip!
			`.trim(),
			attachments: []
		};

		console.log('About to call extractEventsWithAI...');
		console.log('Sample email data:', sampleEmailData);

		const result = await extractEventsWithAI(sampleEmailData);

		console.log('extractEventsWithAI completed successfully!');
		console.log('Extracted events:', result);

		console.log('=== Test Completed Successfully ===');

		return json({
			success: true,
			extracted_events: result.events,
			events_count: result.events.length,
			model_used: OPENAI_TEXT_MODEL || 'gpt-3.5-turbo',
			timestamp: new Date().toISOString(),
			environment: 'development',
			sample_data: sampleEmailData
		});
	} catch (err: unknown) {
		console.error('=== extractEventsWithAI Test Failed ===');
		console.error('Error type:', (err as Error).constructor.name);
		console.error('Error message:', (err as Error).message);
		console.error('Full error:', err);

		return json(
			{
				error: (err as Error).message || 'Unknown error occurred',
				error_type: (err as Error).constructor.name,
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};
