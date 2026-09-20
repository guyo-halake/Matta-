import { google } from 'googleapis';
import ical from 'node-ical';
import { config } from '../config/index.js';

export interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

/**
 * Google Calendar Integration
 */
function getGoogleCalendarClient() {
  if (!config.google.clientId || !config.google.clientSecret || !config.google.refreshToken) {
    return null;
  }

  const auth = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );

  auth.setCredentials({ refresh_token: config.google.refreshToken });
  return google.calendar({ version: 'v3', auth });
}

export async function getGoogleCalendarEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
  const calendar = getGoogleCalendarClient();
  if (!calendar) return [];

  const timeMin = (startDate || new Date()).toISOString();
  const timeMax = (endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).toISOString();

  try {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (res.data.items || []).map((item: any) => ({
      summary: item.summary || 'Untitled Event',
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      location: item.location || undefined,
      description: item.description || undefined,
    }));
  } catch (err: any) {
    console.error('Error fetching Google Calendar events:', err.message);
    return [];
  }
}

export async function createGoogleCalendarEvent(summary: string, startTimeIso: string, endTimeIso: string, description?: string): Promise<boolean> {
  const calendar = getGoogleCalendarClient();
  if (!calendar) return false;

  try {
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        start: { dateTime: startTimeIso },
        end: { dateTime: endTimeIso },
      },
    });
    return true;
  } catch (err: any) {
    console.error('Error creating Google Calendar event:', err.message);
    return false;
  }
}

/**
 * Apple iCal Integration (Webcal ICS feed)
 */
export async function getAppleIcalEvents(): Promise<CalendarEvent[]> {
  if (!config.appleIcalUrl) return [];

  try {
    const webcalUrl = config.appleIcalUrl.replace('webcal://', 'https://');
    const events = await ical.async.fromURL(webcalUrl);
    const result: CalendarEvent[] = [];

    const now = new Date();
    const futureLimit = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    for (const key of Object.keys(events)) {
      const ev: any = events[key];
      if (ev.type === 'VEVENT' && ev.start) {
        const start = new Date(ev.start);
        if (start >= now && start <= futureLimit) {
          result.push({
            summary: ev.summary || 'Untitled Event',
            start: start.toISOString(),
            end: ev.end ? new Date(ev.end).toISOString() : start.toISOString(),
            location: ev.location,
            description: ev.description,
          });
        }
      }
    }

    return result.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  } catch (err: any) {
    console.error('Error fetching Apple iCal events:', err.message);
    return [];
  }
}

/**
 * Unified Schedule Query
 */
export async function getUnifiedSchedule(): Promise<CalendarEvent[]> {
  const [googleEvents, appleEvents] = await Promise.all([
    getGoogleCalendarEvents(),
    getAppleIcalEvents(),
  ]);

  const combined = [...googleEvents, ...appleEvents];
  return combined.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
