import { bot } from './bot/instance.js';
import { registerHandlers } from './bot/handlers.js';
import { initDatabase } from './db/database.js';
import { initProactiveScheduler } from './services/proactiveScheduler.js';
import { initAutoCommitScheduler } from './services/autoCommit.js';
import { config } from './config/index.js';

async function main() {
  console.log('🤖 Initializing Astra AI Personal Assistant System (Gemini Engine)...');

  // 1. Initialize Database
  initDatabase();

  // 2. Register Bot Handlers & Auth Security Guard
  registerHandlers();

  // 3. Initialize Autonomous Proactive Scheduler (Daily Briefings & Alerts)
  initProactiveScheduler();

  // 4. Initialize Automated Daily GitHub Commit Daemon
  initAutoCommitScheduler();

  if (!config.telegramToken || config.telegramToken === 'DUMMY_TOKEN_PLACEHOLDER') {
    console.log('\n------------------------------------------------------------');
    console.log('⚠️ TELEGRAM_BOT_TOKEN is missing in .env.');
    console.log('👉 Add your TELEGRAM_BOT_TOKEN to .env to connect Telegram.');
    console.log('------------------------------------------------------------\n');
    return;
  }

  try {
    console.log(`🚀 Starting ${config.botName} (Gemini AI Engine)...`);
    await bot.start({
      onStart: (botInfo) => {
        console.log(`✅ ${config.botName} is live as @${botInfo.username}!`);
        console.log('📱 Ready to receive voice/text messages & execute remote commands across iPhone, Android, and Laptop.');
      },
    });
  } catch (error: any) {
    console.error('❌ Error starting Telegram bot listener:', error.message);
  }
}

main();
