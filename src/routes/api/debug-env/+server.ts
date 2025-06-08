import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY, OPENAI_TEXT_MODEL, OPENAI_VISION_MODEL } from '$env/static/private';

export const GET: RequestHandler = async () => {
	// Only allow in development mode
	if (!dev) {
		throw error(404, 'Not found');
	}

	return json({
		environment: 'vercel',
		openai_api_key: OPENAI_API_KEY ? `SET (${OPENAI_API_KEY.substring(0, 8)}...)` : 'NOT SET',
		openai_text_model: OPENAI_TEXT_MODEL || 'NOT SET',
		openai_vision_model: OPENAI_VISION_MODEL || 'NOT SET',
		timestamp: new Date().toISOString()
	});
};
