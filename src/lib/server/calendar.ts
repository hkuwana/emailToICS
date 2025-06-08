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
		.map((event): EventAttributes | null => {
			const startDate = new Date(event.startDate);
			const endDate = new Date(event.endDate);

			if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
				console.warn(
					`Skipping event with invalid date: "${event.title}" (Start: ${event.startDate}, End: ${event.endDate})`
				);
				return null;
			}

			let description = event.description || '';
			if (event.timezone) {
				const options: Intl.DateTimeFormatOptions = {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
					hour12: true,
					timeZone: event.timezone,
					timeZoneName: 'short'
				};
				const formatter = new Intl.DateTimeFormat('en-US', options);
				const startString = formatter.format(startDate);

				const tzInfo = `\n\n(Event time is specified in ${event.timezone}: ${startString})`;
				description += tzInfo;
			}

			const icsEvent: EventAttributes = {
				title: event.title,
				start: dateToArray(startDate),
				startInputType: 'utc',
				end: dateToArray(endDate),
				endInputType: 'utc',
				location: event.location,
				description: description,
				status: 'CONFIRMED'
			};

			return icsEvent;
		})
		.filter((e): e is EventAttributes => e !== null);

	if (icsEvents.length === 0) {
		console.log('All provided events had invalid dates. No ICS file will be generated.');
		return null;
	}

	console.log(`Generating ICS file with ${icsEvents.length} events.`);
	const { error, value } = createEvents(icsEvents);

	if (error) {
		console.error('Failed to create ICS file:', error);
		throw error;
	}

	console.log('Successfully generated ICS file content.');
	return value || null;
}
