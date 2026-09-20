import { Bot } from 'grammy';
import { config } from '../config/index.js';

if (!config.telegramToken) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN is not defined in .env. Bot polling will wait for token configuration.');
}

export const bot = new Bot(config.telegramToken || 'DUMMY_TOKEN_PLACEHOLDER');
