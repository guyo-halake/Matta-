import fs from 'fs';
import path from 'path';
import axios from 'axios';
import OpenAI from 'openai';
import { config } from '../config/index.js';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!config.openaiApiKey) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openaiClient;
}

/**
 * Downloads audio file from Telegram URL and saves to local disk
 */
export async function downloadFile(fileUrl: string, destPath: string): Promise<string> {
  const response = await axios({
    method: 'GET',
    url: fileUrl,
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(destPath));
    writer.on('error', reject);
  });
}

/**
 * Transcribes audio using OpenAI Whisper API
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    return '[Audio received, but OPENAI_API_KEY is not configured for Whisper transcription]';
  }

  try {
    const fileStream = fs.createReadStream(filePath);
    const transcription = await client.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
    });
    return transcription.text;
  } catch (error: any) {
    console.error('Error in Whisper transcription:', error.message);
    throw new Error(`Whisper transcription failed: ${error.message}`);
  }
}

/**
 * Generates audio file from text using OpenAI TTS API
 */
export async function textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'onyx'): Promise<string | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const outputFilename = `tts_${Date.now()}.mp3`;
    const outputPath = path.join(config.tempDir, outputFilename);

    const mp3 = await client.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text.slice(0, 4000), // OpenAI limit
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(outputPath, buffer);

    return outputPath;
  } catch (error: any) {
    console.error('Error in TTS generation:', error.message);
    return null;
  }
}
