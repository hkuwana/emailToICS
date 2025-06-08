import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractEventsWithAI } from '$lib/server/ai';
import { generateICS } from '$lib/server/calendar';
import { sendResponseEmail, sendNoEventsFoundEmail } from '$lib/server/postmark';
import { OPENAI_API_KEY, OPENAI_TEXT_MODEL } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	// Only allow in development mode
	if (!dev) {
		throw error(404, 'Not found');
	}

	try {
		const body = await request.json();
		const testEmail = body.testEmail; // Get email from request body

		console.log('=== Testing extractEventsWithAI Function ===');
		console.log('OPENAI_API_KEY:', OPENAI_API_KEY ? 'SET' : 'NOT SET');
		console.log('OPENAI_TEXT_MODEL:', OPENAI_TEXT_MODEL || 'NOT SET');
		console.log('Environment is dev:', dev);
		console.log('Test email provided:', testEmail || 'None');

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

		let emailSent = false;
		let emailError = null;
		let icsContent = null;

		// If email is provided and events were found, send email
		if (testEmail && result.events && result.events.length > 0) {
			try {
				console.log('Generating ICS content...');
				icsContent = generateICS(result.events);

				if (icsContent) {
					console.log(`Sending test email to ${testEmail}...`);
					let emailHtmlResponse = `<p>Hello,</p><p>This is a test email from your EmailCal system! We found the following event(s):</p><ul>`;

					result.events.forEach((event) => {
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

						emailHtmlResponse += `<li>
							<b>${event.title}</b>: ${new Date(event.startDate).toLocaleString()} - ${new Date(event.endDate).toLocaleString()}
							<br><a href="${googleCalendarLink.toString()}" target="_blank">Add to Google Calendar</a>
						</li>`;
					});
					emailHtmlResponse += `</ul><p>Please find the .ics calendar file attached.</p><p>This was a test from the development environment!</p>`;

					await sendResponseEmail(
						testEmail,
						'Test: Calendar Events from Sample Data',
						emailHtmlResponse,
						icsContent
					);
					emailSent = true;
					console.log('Test email sent successfully!');
				} else {
					console.warn('ICS generation failed');
				}
			} catch (err) {
				console.error('Failed to send test email:', err);
				emailError = err instanceof Error ? err.message : 'Unknown email error';
			}
		} else if (testEmail && (!result.events || result.events.length === 0)) {
			try {
				console.log(`Sending "no events found" email to ${testEmail}...`);
				await sendNoEventsFoundEmail(testEmail, 'Test: Paris Trip Confirmation');
				emailSent = true;
				console.log('No events found email sent successfully!');
			} catch (err) {
				console.error('Failed to send no events email:', err);
				emailError = err instanceof Error ? err.message : 'Unknown email error';
			}
		}

		console.log('=== Test Completed Successfully ===');

		return json({
			success: true,
			extracted_events: result.events,
			events_count: result.events.length,
			model_used: OPENAI_TEXT_MODEL || 'gpt-4.1',
			timestamp: new Date().toISOString(),
			environment: 'development',
			sample_data: sampleEmailData,
			ai_result: result, // Include the full AI result for debugging
			email_sent: emailSent,
			email_error: emailError,
			ics_generated: !!icsContent,
			test_email: testEmail
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
