import path from 'path';
import fs from 'fs';
import { bot } from './instance.js';
import { authGuard } from './auth.js';
import { processUserMessage } from '../agent/brain.js';
import { downloadFile, transcribeAudio, textToSpeech } from '../services/voice.js';
import { config } from '../config/index.js';
import { InputFile } from 'grammy';

const userVoicePreference: Map<number | string, boolean> = new Map();

export function registerHandlers() {
  // Enforce Security Auth Guard on all incoming updates
  bot.use(authGuard);

  // Command: /start
  bot.command('start', async (ctx) => {
    const userId = ctx.from?.id;
    const welcome = `⚡ **${config.botName} Autonomous OS & Vibe-Coding Agent** (Powered by Gemini)

Your User ID: \`${userId}\`

💻 **Remote PC Control & Vibe Coding**: Ask me to run powershell commands, edit code, inspect system health, or build projects remotely!
🎙️ **Voice Notes**: Send voice messages from your iPhone, Android, or Laptop anytime.
📅 **Calendar & Classes**: Ask "What are my classes today?" or "Schedule meeting tomorrow at 2 PM".
⏰ **Proactive Alerts**: I initiate morning briefings and class reminders automatically!

🔊 **Voice Replies**: Use \`/voice on\` or \`/voice off\`.`;
    await ctx.reply(welcome, { parse_mode: 'Markdown' });
  });

  // Command: /myid
  bot.command('myid', async (ctx) => {
    await ctx.reply(`Your Telegram User ID is: \`${ctx.from?.id}\`\nAdd this to ALLOWED_TELEGRAM_USER_ID in .env to lock security!`, { parse_mode: 'Markdown' });
  });

  // Command: /voice
  bot.command('voice', async (ctx) => {
    const arg = ctx.match.trim().toLowerCase();
    const chatId = ctx.chat.id;
    if (arg === 'on') {
      userVoicePreference.set(chatId, true);
      await ctx.reply('🔊 Voice response mode enabled!');
    } else if (arg === 'off') {
      userVoicePreference.set(chatId, false);
      await ctx.reply('🔇 Voice response mode disabled.');
    } else {
      const current = userVoicePreference.get(chatId) ?? config.defaultVoiceMode;
      await ctx.reply(`Voice mode is currently **${current ? 'ON' : 'OFF'}**. Toggle with \`/voice on\` or \`/voice off\`.`, { parse_mode: 'Markdown' });
    }
  });

  // Handle Incoming Voice Notes (from iPhone / Android / Desktop)
  bot.on('message:voice', async (ctx) => {
    const chatId = ctx.chat.id;
    await ctx.replyWithChatAction('typing');

    try {
      const fileId = ctx.message.voice.file_id;
      const file = await ctx.api.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;

      const localOggPath = path.join(config.tempDir, `voice_${Date.now()}.ogg`);
      await downloadFile(fileUrl, localOggPath);

      // Transcribe Audio
      await ctx.reply('🎙️ *Listening to voice note...*', { parse_mode: 'Markdown' });
      const transcribedText = await transcribeAudio(localOggPath);

      await ctx.reply(`💬 *Transcribed:* "${transcribedText}"`, { parse_mode: 'Markdown' });
      await ctx.replyWithChatAction('typing');

      // Process with Gemini AI Agent
      const aiReply = await processUserMessage(chatId, transcribedText);
      await ctx.reply(aiReply);

      // Generate Voice Reply if enabled
      const isVoiceEnabled = userVoicePreference.get(chatId) ?? config.defaultVoiceMode;
      if (isVoiceEnabled) {
        await ctx.replyWithChatAction('record_voice');
        const audioPath = await textToSpeech(aiReply);
        if (audioPath && fs.existsSync(audioPath)) {
          await ctx.replyWithVoice(new InputFile(audioPath));
          fs.unlinkSync(audioPath);
        }
      }

      if (fs.existsSync(localOggPath)) {
        fs.unlinkSync(localOggPath);
      }
    } catch (error: any) {
      console.error('Error processing voice note:', error);
      await ctx.reply(`⚠️ Could not process voice note: ${error.message}`);
    }
  });

  // Handle Text Messages
  bot.on('message:text', async (ctx) => {
    const chatId = ctx.chat.id;
    const userText = ctx.message.text;

    if (userText.startsWith('/')) return;

    await ctx.replyWithChatAction('typing');
    try {
      const aiReply = await processUserMessage(chatId, userText);
      await ctx.reply(aiReply);

      const isVoiceEnabled = userVoicePreference.get(chatId) ?? false;
      if (isVoiceEnabled) {
        await ctx.replyWithChatAction('record_voice');
        const audioPath = await textToSpeech(aiReply);
        if (audioPath && fs.existsSync(audioPath)) {
          await ctx.replyWithVoice(new InputFile(audioPath));
          fs.unlinkSync(audioPath);
        }
      }
    } catch (error: any) {
      console.error('Error processing text message:', error);
      await ctx.reply(`⚠️ Error: ${error.message}`);
    }
  });
}
