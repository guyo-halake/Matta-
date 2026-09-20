import { google } from 'googleapis';
import ical from 'node-ical';
import { config } from '../config/index.js';
import { getDb, saveDb, CustomCalendarEvent } from '../db/database.js';

export interface CalendarEvent {
  id?: string;
  summary: string;
  start: string; // ISO string
  end: string;   // ISO string
  location?: string;
  description?: string;
  source: 'apple' | 'google' | 'local';
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
      id: item.id,
      summary: item.summary || 'Untitled Event',
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      location: item.location || undefined,
      description: item.description || undefined,
      source: 'google' as const,
    }));
  } catch (err: any) {
    console.error('Error fetching Google Calendar events:', err.message);
    return [];
  }
}

export async function createGoogleCalendarEvent(
  summary: string,
  startTimeIso: string,
  endTimeIso: string,
  description?: string,
  location?: string
): Promise<string | null> {
  const calendar = getGoogleCalendarClient();
  if (!calendar) return null;

  try {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        location,
        start: { dateTime: startTimeIso },
        end: { dateTime: endTimeIso },
      },
    });
    return res.data.id || 'created';
  } catch (err: any) {
    console.error('Error creating Google Calendar event:', err.message);
    return null;
  }
}

/**
 * Apple iCal Integration (Webcal ICS feed with RRULE recurrence expansion)
 */
export async function getAppleIcalEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
  if (!config.appleIcalUrl) return [];

  try {
    const webcalUrl = config.appleIcalUrl.replace('webcal://', 'https://');
    const events = await ical.async.fromURL(webcalUrl);
    const result: CalendarEvent[] = [];

    const startWindow = startDate || new Date();
    const endWindow = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    for (const key of Object.keys(events)) {
      const ev: any = events[key];
      if (ev.type === 'VEVENT' && ev.start) {
        const eventStart = new Date(ev.start);
        const duration = ev.end ? new Date(ev.end).getTime() - eventStart.getTime() : 3600000;

        if (ev.rrule) {
          try {
            const dates = ev.rrule.between(startWindow, endWindow, true);
            for (const d of dates) {
              const dateObj = new Date(d);
              // Handle exdate (exceptions)
              let isExcluded = false;
              if (ev.exdate) {
                for (const exKey of Object.keys(ev.exdate)) {
                  const exDate = new Date(ev.exdate[exKey]);
                  if (exDate.getTime() === dateObj.getTime()) {
                    isExcluded = true;
                    break;
                  }
                }
              }
              if (!isExcluded) {
                const occurrenceEnd = new Date(dateObj.getTime() + duration);
                result.push({
                  id: `${ev.uid || key}_${dateObj.getTime()}`,
                  summary: ev.summary || 'Untitled Event',
                  start: dateObj.toISOString(),
                  end: occurrenceEnd.toISOString(),
                  location: ev.location || undefined,
                  description: ev.description || undefined,
                  source: 'apple',
                });
              }
            }
          } catch (rruleErr: any) {
            console.warn(`RRule parsing warning for "${ev.summary}":`, rruleErr.message);
          }
        } else {
          // Single non-recurring event
          if (eventStart >= startWindow && eventStart <= endWindow) {
            const occurrenceEnd = ev.end ? new Date(ev.end) : new Date(eventStart.getTime() + duration);
            result.push({
              id: ev.uid || key,
              summary: ev.summary || 'Untitled Event',
              start: eventStart.toISOString(),
              end: occurrenceEnd.toISOString(),
              location: ev.location || undefined,
              description: ev.description || undefined,
              source: 'apple',
            });
          }
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
 * Local Custom Calendar Events Store
 */
export function getLocalEvents(startDate?: Date, endDate?: Date): CalendarEvent[] {
  const db = getDb();
  const startWindow = startDate || new Date();
  const endWindow = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (db.customEvents || [])
    .filter((e) => {
      const s = new Date(e.start);
      return s >= startWindow && s <= endWindow;
    })
    .map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start,
      end: e.end,
      location: e.location,
      description: e.description,
      source: 'local' as const,
    }));
}

export function createLocalEvent(
  summary: string,
  startTimeIso: string,
  endTimeIso: string,
  description?: string,
  location?: string
): CalendarEvent {
  const db = getDb();
  if (!db.customEvents) db.customEvents = [];

  const newEvent: CustomCalendarEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    summary,
    start: startTimeIso,
    end: endTimeIso,
    description,
    location,
    createdAt: new Date().toISOString(),
  };

  db.customEvents.push(newEvent);
  saveDb();

  return {
    ...newEvent,
    source: 'local',
  };
}

export function updateLocalEvent(
  idOrSummary: string,
  updates: { summary?: string; startTimeIso?: string; endTimeIso?: string; description?: string; location?: string }
): boolean {
  const db = getDb();
  if (!db.customEvents) return false;

  const target = db.customEvents.find(
    (e) => e.id === idOrSummary || e.summary.toLowerCase().includes(idOrSummary.toLowerCase())
  );

  if (!target) return false;

  if (updates.summary) target.summary = updates.summary;
  if (updates.startTimeIso) target.start = updates.startTimeIso;
  if (updates.endTimeIso) target.end = updates.endTimeIso;
  if (updates.description !== undefined) target.description = updates.description;
  if (updates.location !== undefined) target.location = updates.location;

  saveDb();
  return true;
}

export function deleteLocalEvent(idOrSummary: string): boolean {
  const db = getDb();
  if (!db.customEvents) return false;

  const initialLength = db.customEvents.length;
  db.customEvents = db.customEvents.filter(
    (e) => e.id !== idOrSummary && !e.summary.toLowerCase().includes(idOrSummary.toLowerCase())
  );

  if (db.customEvents.length < initialLength) {
    saveDb();
    return true;
  }
  return false;
}

/**
 * Unified Schedule Query across Apple iCal, Google Calendar, and Local Storage
 */
export async function getUnifiedSchedule(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
  const start = startDate || new Date();
  const end = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [googleEvents, appleEvents] = await Promise.all([
    getGoogleCalendarEvents(start, end),
    getAppleIcalEvents(start, end),
  ]);

  const localEvents = getLocalEvents(start, end);

  const combined = [...appleEvents, ...googleEvents, ...localEvents];
  return combined.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Unified Event Creation
 */
export async function createCalendarEvent(
  summary: string,
  startTimeIso: string,
  endTimeIso: string,
  description?: string,
  location?: string
): Promise<{ success: boolean; message: string; event: CalendarEvent }> {
  // Create locally
  const localEv = createLocalEvent(summary, startTimeIso, endTimeIso, description, location);

  // Attempt Google Calendar creation if available
  const googleId = await createGoogleCalendarEvent(summary, startTimeIso, endTimeIso, description, location);
  
  if (googleId) {
    return {
      success: true,
      message: `Event "${summary}" successfully scheduled on Google Calendar and local schedule!`,
      event: localEv,
    };
  }

  return {
    success: true,
    message: `Event "${summary}" successfully saved to your active schedule!`,
    event: localEv,
  };
}

/**
 * Unified Event Update / Edit
 */
export async function editCalendarEvent(
  idOrSummary: string,
  updates: { summary?: string; startTimeIso?: string; endTimeIso?: string; description?: string; location?: string }
): Promise<{ success: boolean; message: string }> {
  const updatedLocal = updateLocalEvent(idOrSummary, updates);

  if (updatedLocal) {
    return {
      success: true,
      message: `Event matching "${idOrSummary}" was updated successfully in your schedule.`,
    };
  }

  return {
    success: false,
    message: `No editable local event found matching "${idOrSummary}". Note: Published iCal feed events from iCloud are read-only feeds. Custom created events can be edited anytime.`,
  };
}

/**
 * Unified Event Deletion
 */
export async function deleteCalendarEvent(idOrSummary: string): Promise<{ success: boolean; message: string }> {
  const deletedLocal = deleteLocalEvent(idOrSummary);

  if (deletedLocal) {
    return {
      success: true,
      message: `Event matching "${idOrSummary}" has been deleted from your active schedule.`,
    };
  }

  return {
    success: false,
    message: `No custom event found matching "${idOrSummary}". Note: Published iCal feed events from iCloud are read-only feeds. Local and Google events can be deleted anytime.`,
  };
}

/**
 * Get Today's Classes & Events Specifically
 */
export async function getTodayClasses(): Promise<CalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const schedule = await getUnifiedSchedule(startOfDay, endOfDay);
  return schedule;
}
