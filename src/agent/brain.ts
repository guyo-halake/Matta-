import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { config } from '../config/index.js';
import { getSystemPrompt } from './systemPrompt.js';
import { saveMessage, getRecentHistory, getUserFacts } from './memory.js';
import { geminiTools, agentTools, executeToolCall } from '../tools/index.js';

let genAI: GoogleGenerativeAI | null = null;
let openaiClient: OpenAI | null = null;

function getGenAI(): GoogleGenerativeAI | null {
  if (!config.geminiApiKey) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

function getOpenAI(): OpenAI | null {
  if (!config.openaiApiKey) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openaiClient;
}

export async function processUserMessage(
  chatId: string | number,
  userPrompt: string
): Promise<string> {
  // Save incoming user message
  saveMessage(chatId, 'user', userPrompt);

  const userFacts = getUserFacts(chatId);
  const systemInstruction = getSystemPrompt(userFacts);
  const recentHistory = getRecentHistory(chatId, 12);

  const candidateGeminiModels = [
    config.geminiModel || 'gemini-3.6-flash',
    'gemini-3.6-flash',
  ];

  const rawHistory = recentHistory.slice(0, -1).map((h) => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.content }],
  }));

  let firstUserIdx = rawHistory.findIndex((h) => h.role === 'user');
  let history = firstUserIdx !== -1 ? rawHistory.slice(firstUserIdx) : [];

  const cleanHistory: { role: string; parts: { text: string }[] }[] = [];
  for (const item of history) {
    if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === item.role) {
      cleanHistory[cleanHistory.length - 1].parts[0].text += '\n' + item.parts[0].text;
    } else {
      cleanHistory.push({ role: item.role, parts: [{ text: item.parts[0].text }] });
    }
  }

  // 1. Execute Gemini Engine
  const ai = getGenAI();
  if (ai) {
    for (const modelName of candidateGeminiModels) {
      try {
        console.log(`🤖 Executing Gemini Engine (${modelName})...`);
        const model = ai.getGenerativeModel({
          model: modelName,
          systemInstruction,
          tools: [{ functionDeclarations: geminiTools }],
        });

        const chat = model.startChat({ history: cleanHistory });

        let result = await chat.sendMessage(userPrompt);
        let response = await result.response;

        let functionCalls = response.functionCalls();
        let loopCount = 0;

        while (functionCalls && functionCalls.length > 0 && loopCount < 5) {
          loopCount++;
          const call = functionCalls[0];
          const functionName = call.name;
          const functionArgs = call.args;

          console.log(`🛠️ [Gemini Tool Executed]: ${functionName}`, functionArgs);
          const toolResult = await executeToolCall(chatId, functionName, functionArgs);

          try {
            result = await chat.sendMessage([
              {
                functionResponse: {
                  name: functionName,
                  response: { output: toolResult },
                },
              },
            ]);
            response = await result.response;
            functionCalls = response.functionCalls();
          } catch (toolError: any) {
            console.warn(`⚠️ Tool response error for ${functionName}:`, toolError.message);
            // Return direct tool result if secondary message fails
            const formattedResult = `[Tool Executed (${functionName})]:\n${toolResult}`;
            saveMessage(chatId, 'assistant', formattedResult);
            return formattedResult;
          }
        }

        const finalAnswer = response.text() || 'At your service, Razak.';
        saveMessage(chatId, 'assistant', finalAnswer);
        return finalAnswer;
      } catch (error: any) {
        console.warn(`⚠️ Gemini model "${modelName}" error: ${error.message.slice(0, 150)}`);
      }
    }
  }

  // 2. Fallback to OpenAI if configured
  const openai = getOpenAI();
  if (openai) {
    try {
      console.log('🔄 Switching to OpenAI Fallback Engine...');
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemInstruction },
        ...recentHistory.slice(0, -1).map((h) => ({
          role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: h.content,
        })),
        { role: 'user', content: userPrompt },
      ];

      let response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: agentTools,
        tool_choice: 'auto',
      });

      let responseMessage = response.choices[0].message;

      while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        messages.push(responseMessage);
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          let functionArgs = {};
          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
          } catch (e) {}

          console.log(`🛠️ [OpenAI Tool Executed]: ${functionName}`, functionArgs);
          const toolResult = await executeToolCall(chatId, functionName, functionArgs);

          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: toolResult,
          });
        }

        response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
        });

        responseMessage = response.choices[0].message;
      }

      const finalAnswer = responseMessage.content || 'At your service, Razak.';
      saveMessage(chatId, 'assistant', finalAnswer);
      return finalAnswer;
    } catch (error: any) {
      console.error('Error in OpenAI fallback:', error.message);
    }
  }

  const fallback = `Sorry Razak, that feature or request encountered an error. Please verify configuration in .env.`;
  saveMessage(chatId, 'assistant', fallback);
  return fallback;
}
