import { json, type RequestHandler } from '@sveltejs/kit';
import { kv } from '@vercel/kv';

// Define the expected structure of an event record stored in KV
interface ExtractedEvent {
	title: string;
	startDate: string;
	endDate: string;
	location?: string;
	description?: string;
	timezone?: string;
}

export interface EventRecord {
	id: string;
	userEmail: string;
	originalEmail?: {
		from: string;
		subject?: string;
		textBody?: string;
		htmlBody?: string;
		receivedAt: string;
		messageId?: string;
	};
	extractedEvents: ExtractedEvent[];
	icsFile: string | null;
	status: string;
	createdAt: string; // ISO date string
	processedAt?: string; // ISO date string
	error?: string | null;
}

// GET /api/events?email=user@example.com
export const GET: RequestHandler = async ({ url }) => {
	const userEmail = url.searchParams.get('email');

	if (!userEmail) {
		return json({ error: 'Email query parameter is required' }, { status: 400 });
	}

	try {
		const eventKeys: string[] = [];
		let cursor: number = 0; // kv.scan's cursor is a number
		do {
			const result: [any, string[]] = await kv.scan(cursor, { match: 'event:*', count: 100 });
			cursor = result[0] as number; // Explicit cast, assuming it's a number despite potential linting confusion
			eventKeys.push(...result[1]);
		} while (cursor !== 0);

		if (eventKeys.length === 0) {
			return json([], { status: 200 });
		}

		const eventsData: (EventRecord | null)[] = await kv.mget(...eventKeys);

		const userEvents: EventRecord[] = eventsData.filter(
			(event): event is EventRecord => event !== null && event.userEmail === userEmail
		);

		userEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		return json(userEvents, { status: 200 });
	} catch (error: any) {
		console.error('Error fetching events:', error);
		return json({ error: 'Failed to retrieve events' }, { status: 500 });
	}
};

// POST /api/events - Placeholder for manual event creation if needed later
// For the MVP, events are created via email webhook.
/*
import { v4 as uuidv4 } from 'uuid';
import { generateICS } from '$lib/server/calendar'; // Ensure this path is correct if moving calendar.js

export const POST: RequestHandler = async ({ request }) => {
  try {
    const eventData = await request.json();
    // Basic validation
    if (!eventData.title || !eventData.startDate || !eventData.userEmail) {
      return json({ error: 'Missing required event fields' }, { status: 400 });
    }

    const eventId = `evt_manual_${uuidv4()}`;
    const newEvent: EventRecord = {
      id: eventId,
      userEmail: eventData.userEmail,
      originalEmail: undefined, // Manually created, no original email
      extractedEvents: [{
        title: eventData.title,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        location: eventData.location || undefined,
        description: eventData.description || undefined,
        timezone: eventData.timezone || undefined
      }],
      icsFile: null, // ICS could be generated here if needed
      status: 'manual_created',
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      error: null
    };
    
    // Generate ICS if primary event data is present
    if (newEvent.extractedEvents[0].title && newEvent.extractedEvents[0].startDate && newEvent.extractedEvents[0].endDate) {
        // Assuming generateICS can be imported and used here; ensure it handles ExtractedEvent[]
        const ics = await generateICS(newEvent.extractedEvents);
        newEvent.icsFile = ics;
    }

    await kv.set(`event:${eventId}`, newEvent);
    return json(newEvent, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return json({ error: 'Failed to create event' }, { status: 500 });
  }
};
*/
