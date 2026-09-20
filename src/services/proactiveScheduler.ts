import cron from 'node-cron';
import { bot } from '../bot/instance.js';
import { config } from '../config/index.js';
import { getUnifiedSchedule, getTodayClasses } from './calendar.js';
import { getWeather } from './weather.js';
import { getWindowsSystemHealth } from '../tools/windowsControl.js';

let targetChatId: string | null = null;
const sentReminders = new Set<string>();

export function setTargetChatId(chatId: string | number) {
  targetChatId = String(chatId);
}

export function initProactiveScheduler() {
  console.log(`⏰ Proactive Scheduler active with cron pattern: "${config.proactiveCronSchedule}"`);

  // 1. Daily Morning Briefing (Default 06:00 AM)
  cron.schedule(config.proactiveCronSchedule, async () => {
    const ownerId = config.allowedTelegramUserId || targetChatId;
    if (!ownerId) {
      console.log('⏰ Morning Briefing skipped (No owner Telegram ID stored yet).');
      return;
    }

    try {
      console.log(`🌅 Generating daily morning briefing for Telegram ID ${ownerId}...`);

      const [todayClasses, weather, health] = await Promise.all([
        getTodayClasses(),
        getWeather('Nairobi'),
        getWindowsSystemHealth(),
      ]);

      let scheduleText = '🎉 No classes or events scheduled for today!';
      if (todayClasses.length > 0) {
        scheduleText = todayClasses
          .map((s) => {
            const timeStr = new Date(s.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `• *${s.summary}*: ${timeStr} ${s.location ? `(${s.location})` : ''}`;
          })
          .join('\n');
      }

      const briefing = `🌅 *Good Morning, ${config.ownerName}!*

Here is your daily autonomous briefing:

🌤️ *Weather Forecast:*
${weather}

📚 *Today's Class & Event Schedule:*
${scheduleText}

💻 *System Health:*
${health}

I am active on your PC and ready to assist you today!`;

      await bot.api.sendMessage(ownerId, briefing, { parse_mode: 'Markdown' });
    } catch (err: any) {
      console.error('Error sending proactive morning briefing:', err.message);
    }
  });

  // 2. Proactive Class & Event Reminders (Checks every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    const ownerId = config.allowedTelegramUserId || targetChatId;
    if (!ownerId) return;

    try {
      const now = new Date();
      // Look ahead 25 minutes
      const lookAheadWindow = new Date(now.getTime() + 25 * 60 * 1000);

      const events = await getUnifiedSchedule(now, lookAheadWindow);

      for (const ev of events) {
        const eventStart = new Date(ev.start);
        const minutesUntilStart = Math.round((eventStart.getTime() - now.getTime()) / 60000);

        const reminderKey = `${ev.summary}_${ev.start}`;

        if (minutesUntilStart > 0 && minutesUntilStart <= 25 && !sentReminders.has(reminderKey)) {
          sentReminders.add(reminderKey);

          const timeStr = eventStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const reminderMsg = `🔔 *Class & Event Reminder!*

📚 *Subject:* *${ev.summary}*
⏰ *Starts in:* ~${minutesUntilStart} mins (at ${timeStr})
${ev.location ? `📍 *Location:* ${ev.location}\n` : ''}${ev.description ? `📝 *Details:* ${ev.description}\n` : ''}
Good luck with your class! Astra is here if you need any study help or notes!`;

          await bot.api.sendMessage(ownerId, reminderMsg, { parse_mode: 'Markdown' });
          console.log(`⏰ Class reminder sent for "${ev.summary}" to Telegram ID ${ownerId}`);
        }
      }
    } catch (err: any) {
      console.error('Error checking class reminders:', err.message);
    }
  });
}
