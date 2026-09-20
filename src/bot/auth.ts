import { Context, NextFunction } from 'grammy';
import { config } from '../config/index.js';
import { setTargetChatId } from '../services/proactiveScheduler.js';

export async function authGuard(ctx: Context, next: NextFunction) {
  const fromId = ctx.from?.id ? String(ctx.from.id) : '';

  // Remember active chat ID for proactive notifications
  if (fromId) {
    setTargetChatId(fromId);
  }

  // If ALLOWED_TELEGRAM_USER_ID is set in .env, enforce strict security
  if (config.allowedTelegramUserId && config.allowedTelegramUserId.trim() !== '') {
    if (fromId !== config.allowedTelegramUserId.trim()) {
      console.warn(`🔒 Blocked unauthorized access attempt from Telegram ID: ${fromId}`);
      await ctx.reply('🔒 Access Denied: This JARVIS instance is locked to its owner.');
      return;
    }
  }

  await next();
}
