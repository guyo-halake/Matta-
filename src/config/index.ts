import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  allowedTelegramUserId: process.env.ALLOWED_TELEGRAM_USER_ID || '',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
  },
  appleIcalUrl: process.env.APPLE_ICAL_URL || '',
  openweatherApiKey: process.env.OPENWEATHER_API_KEY || '',
  botName: process.env.BOT_NAME || 'Astra',
  ownerName: process.env.OWNER_NAME || 'Razak',
  defaultVoiceMode: process.env.DEFAULT_VOICE_MODE === 'true',
  proactiveCronSchedule: process.env.PROACTIVE_CRON_SCHEDULE || '0 6 * * *',
  dbPath: path.resolve(process.cwd(), 'odin_jarvis_data.json'),
  tempDir: path.resolve(process.cwd(), 'temp'),
  workspaceDir: process.cwd(),
};
