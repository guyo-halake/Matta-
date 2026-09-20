import cron from 'node-cron';
import { bot } from '../bot/instance.js';
import { config } from '../config/index.js';
import { getUnifiedSchedule } from './calendar.js';
import { getWeather } from './weather.js';
import { getWindowsSystemHealth } from '../tools/windowsControl.js';

let targetChatId: string | null = null;

export function setTargetChatId(chatId: string | number) {
  targetChatId = String(chatId);
}

export function initProactiveScheduler() {
  console.log(`⏰ Proactive Scheduler active with cron pattern: "${config.proactiveCronSchedule}"`);

  // Daily Morning Briefing
  cron.schedule(config.proactiveCronSchedule, async () => {
    const ownerId = config.allowedTelegramUserId || targetChatId;
    if (!ownerId) {
      console.log('⏰ Morning Briefing skipped (No owner Telegram ID stored yet).');
      return;
    }

    try {
      console.log(`🌅 Generating daily morning briefing for Telegram ID ${ownerId}...`);

      const [schedule, weather, health] = await Promise.all([
        getUnifiedSchedule(),
        getWeather('Nairobi'), // Default city or user city
        getWindowsSystemHealth(),
      ]);

      let scheduleText = 'No scheduled events for today.';
      if (schedule.length > 0) {
        scheduleText = schedule
          .slice(0, 5)
          .map((s) => `• *${s.summary}*: ${s.start}`)
          .join('\n');
      }

      const briefing = `🌅 *Good Morning, ${config.ownerName}!*

Here is your daily autonomous briefing:

🌤️ *Weather Forecast:*
${weather}

📅 *Today's Schedule & Classes:*
${scheduleText}

💻 *Home PC Health:*
${health}

I am online on your laptop and ready to assist or vibe code anytime today!`;

      await bot.api.sendMessage(ownerId, briefing, { parse_mode: 'Markdown' });
    } catch (err: any) {
      console.error('Error sending proactive morning briefing:', err.message);
    }
  });
}
