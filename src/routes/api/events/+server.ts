import { json, type RequestHandler } from '@sveltejs/kit';
import { kv } from '@vercel/kv';
import type { EventRecord } from '$lib/types/eventRecord';

// GET /api/events?email=user@example.com
export const GET: RequestHandler = async ({ url }) => {
	const userEmail = url.searchParams.get('email');

	if (!userEmail) {
		return json({ error: 'Email query parameter is required' }, { status: 400 });
	}

	try {
		const eventKeys: string[] = [];
		let cursor: number = 0;
		do {
			// Note: The type for the scan result from '@vercel/kv' is [string, string[]], but since we're using a number cursor it should be [number, string[]].
			// We cast the cursor to 'any' then to 'number' to work around potential type mismatches in different versions.
			const result: [any, string[]] = await kv.scan(cursor, { match: 'event:*', count: 100 });
			cursor = result[0] as number;
			eventKeys.push(...result[1]);
		} while (cursor !== 0);

		if (eventKeys.length === 0) {
			return json([], { status: 200 });
		}

		// Filter out null values which can occur if a key expired between SCAN and MGET
		const eventsData: (EventRecord | null)[] = await kv.mget(...eventKeys);

		const userEvents: EventRecord[] = eventsData.filter(
			(event): event is EventRecord => event !== null && event.userEmail === userEmail
		);

		// Sort events by creation date, descending
		userEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		return json(userEvents, { status: 200 });
	} catch (error: any) {
		console.error('Error fetching events:', error);
		return json({ error: 'Failed to retrieve events' }, { status: 500 });
	}
};
