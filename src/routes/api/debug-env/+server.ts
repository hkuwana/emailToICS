import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import {
	OPENAI_API_KEY,
	OPENAI_TEXT_MODEL,
	OPENAI_VISION_MODEL,
	POSTMARK_SERVER_TOKEN,
	SENDER_EMAIL_ADDRESS,
	WEBHOOK_SECRET
} from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	// Only allow in development mode
	if (!dev) {
		throw error(404, 'Not found');
	}

	return json({
		environment: 'development',
		timestamp: new Date().toISOString(),
		variables: {
			// OpenAI
			openai_api_key: OPENAI_API_KEY ? 'SET' : 'NOT SET',
			openai_api_key_length: OPENAI_API_KEY?.length || 0,
			openai_text_model: OPENAI_TEXT_MODEL || 'NOT SET',
			openai_vision_model: OPENAI_VISION_MODEL || 'NOT SET',

			// Postmark
			postmark_server_token: POSTMARK_SERVER_TOKEN ? 'SET' : 'NOT SET',
			postmark_token_length: POSTMARK_SERVER_TOKEN?.length || 0,
			postmark_token_prefix: POSTMARK_SERVER_TOKEN?.substring(0, 8) || 'NONE',
			sender_email: SENDER_EMAIL_ADDRESS || 'NOT SET',
			webhook_secret: WEBHOOK_SECRET ? 'SET' : 'NOT SET',

			// Environment info
			vercel: !!process.env.VERCEL,
			node_env: process.env.NODE_ENV,
			deployment_url: process.env.VERCEL_URL || 'local'
		}
	});
};
