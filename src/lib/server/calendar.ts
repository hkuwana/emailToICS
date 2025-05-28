import { createEvents, EventAttributes } from 'ics';

// Define a more specific type for the events we expect to process
interface CalendarAppEvent {
	title: string;
	startDate: string; // Expecting ISO string or a format Date constructor can parse
	endDate: string; // Expecting ISO string or a format Date constructor can parse
	location?: string;
	description?: string;
	// We can add other ICS-specific fields here if needed, like timezone
}

export async function generateICS(events: CalendarAppEvent[]): Promise<string | null> {
	if (!events || events.length === 0) {
		console.log('No events provided to generateICS, returning null.');
		return null;
	}

	const icsEvents: EventAttributes[] = events
		.map((event) => {
			const startDate = new Date(event.startDate);
			const endDate = new Date(event.endDate);

			// Basic validation for dates
			if (isNaN(startDate.valueOf()) || isNaN(endDate.valueOf())) {
				console.warn(`Invalid date for event: ${event.title}. Skipping this event.`);
				return null; // Skip invalid events
			}

			return {
				title: event.title,
				start: dateToArray(startDate),
				end: dateToArray(endDate),
				location: event.location,
				description: event.description,
				status: 'CONFIRMED'
				// alarms: [
				//   { action: 'display', description: 'Reminder', trigger: { hours: 2, before: true } }
				// ]
			};
		})
		.filter((event): event is EventAttributes => event !== null); // Filter out nulls from invalid dates

	if (icsEvents.length === 0) {
		console.log('No valid events to generate ICS, returning null.');
		return null;
	}

	const { error, value } = createEvents(icsEvents);

	if (error) {
		console.error('ICS generation failed:', error);
		// error can be an Error object or string, ensure we access message safely
		const errorMessage = typeof error === 'string' ? error : (error as Error).message;
		throw new Error(`ICS generation failed: ${errorMessage}`);
	}

	return value || null; // Ensure we return null if value is undefined
}

// Returns a tuple [year, month, day, hour, minute]
function dateToArray(date: Date): [number, number, number, number, number] {
	// The previous version already handled invalid dates passed to it by creating a 'now'
	// but it's better to ensure valid dates before calling this utility.
	return [
		date.getFullYear(),
		date.getMonth() + 1,
		date.getDate(),
		date.getHours(),
		date.getMinutes()
	];
}
