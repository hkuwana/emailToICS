import { json, type RequestHandler } from '@sveltejs/kit';

// GET /api/events?email=user@example.com
export const GET: RequestHandler = async ({ url }) => {
	const userEmail = url.searchParams.get('email');

	if (!userEmail) {
		return json({ error: 'Email query parameter is required' }, { status: 400 });
	}

	// Since we are no longer storing events, we return an empty array.
	// This is for MVP purposes to simplify the architecture.
	return json([], { status: 200 });
};
