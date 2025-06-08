import { createEvents, type EventAttributes } from 'ics';
import type { ExtractedEvent } from '$lib/types/eventRecord';

/**
 * Converts a Date object into a date-time array format required by the 'ics' package.
 * @param date The date to convert.
 * @returns An array of numbers: [year, month, day, hour, minute].
 */
function dateToArray(date: Date): [number, number, number, number, number] {
	return [
		date.getUTCFullYear(),
		date.getUTCMonth() + 1,
		date.getUTCDate(),
		date.getUTCHours(),
		date.getUTCMinutes()
	];
}

/**
 * Generates an iCalendar (.ics) file content string from an array of event objects.
 * @param events An array of events extracted from an email.
 * @returns A string containing the .ics file content, or null if no valid events were provided.
 * @throws Will throw an error if the 'ics' package fails to generate the calendar data.
 */
export function generateICS(events: ExtractedEvent[]): string | null {
	if (!events || events.length === 0) {
		console.log('No events provided to generateICS, returning null.');
		return null;
	}

	const icsEvents: EventAttributes[] = events
		.map((event) => {
			const startDate = new Date(event.startDate);
			const endDate = new Date(event.endDate);

			if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
				console.warn(
					`Skipping event with invalid date: "${event.title}" (Start: ${event.startDate}, End: ${event.endDate})`
				);
				return null;
			}

			const icsEvent: EventAttributes = {
				title: event.title,
				start: dateToArray(startDate),
				end: dateToArray(endDate),
				startInputType: 'utc',
				endInputType: 'utc',
				location: event.location,
				description: event.description,
				status: 'CONFIRMED'
			};

			if (event.timezone) {
				icsEvent.tzid = event.timezone;
			}

			return icsEvent;
		})
		.filter((e): e is EventAttributes => e !== null);

	if (icsEvents.length === 0) {
		console.log('All provided events had invalid dates. No ICS file will be generated.');
		return null;
	}

	const { error, value } = createEvents(icsEvents);

	if (error) {
		console.error('Failed to create ICS file:', error);
		throw error;
	}

	return value || null;
}
