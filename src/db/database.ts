import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

export interface CustomCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  createdAt: string;
}

export interface DbSchema {
  memory: Record<string, Record<string, string>>; // chatId -> key -> value
  conversationLogs: { id: number; chatId: string; role: string; content: string; timestamp: string }[];
  pomodoroSessions: { id: number; chatId: string; taskName: string; duration: number; breakDuration: number; status: string; startedAt: string }[];
  reminders: { id: number; chatId: string; message: string; remindAt: string; isSent: boolean }[];
  customEvents: CustomCalendarEvent[];
}

const dbPath = path.resolve(process.cwd(), 'odin_jarvis_data.json');

let data: DbSchema = {
  memory: {},
  conversationLogs: [],
  pomodoroSessions: [],
  reminders: [],
  customEvents: [],
};

export function initDatabase() {
  if (!fs.existsSync(config.tempDir)) {
    fs.mkdirSync(config.tempDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    try {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      data = JSON.parse(raw);
      if (!data.customEvents) {
        data.customEvents = [];
      }
    } catch (e) {
      console.warn('⚠️ Could not parse existing database file, creating a fresh one.');
    }
  } else {
    saveDb();
  }
  console.log('✅ File-based Database initialized successfully.');
}

export function saveDb() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e: any) {
    console.error('Error saving database:', e.message);
  }
}

export function getDb(): DbSchema {
  return data;
}
