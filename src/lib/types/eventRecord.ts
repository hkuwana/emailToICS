export interface ExtractedEvent {
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
	createdAt: string;
	processedAt?: string;
	error?: string | null;
}
