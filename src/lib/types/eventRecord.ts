export interface ExtractedEvent {
	title: string;
	startDate: string; // ISO date string
	endDate: string; // ISO date string
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
		receivedAt: string; // ISO date string
		messageId?: string;
	};
	extractedEvents: ExtractedEvent[];
	icsFile: string | null;
	status: string; // e.g., 'pending', 'processed', 'processed_no_events', 'error', 'error_ics_generation'
	createdAt: string; // ISO date string
	processedAt?: string; // ISO date string
	error?: string | null;
}
