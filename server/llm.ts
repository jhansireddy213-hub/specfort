/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

export interface LlmHeaders {
  apiKey?: string;
  provider?: string;
  model?: string;
}

export function extractLlmHeaders(headers: Record<string, any>): LlmHeaders {
  const apiKey = (headers['x-llm-api-key'] || headers['x-llm-key'] || process.env.GEMINI_API_KEY || '').toString().trim();
  const provider = (headers['x-llm-provider'] || 'gemini').toString().trim().toLowerCase();
  const model = (headers['x-llm-model'] || 'gemini-2.5-flash').toString().trim();

  return { apiKey, provider, model };
}

export async function checkLlmConnection(headers: LlmHeaders): Promise<{ ready: boolean; model: string; provider: string; message: string }> {
  if (!headers.apiKey) {
    return {
      ready: true,
      model: headers.model || 'gemini-2.5-flash',
      provider: headers.provider || 'gemini',
      message: 'Running in offline/standard rule engine mode (No custom API key supplied).'
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: headers.apiKey });
    const response = await ai.models.generateContent({
      model: headers.model || 'gemini-2.5-flash',
      contents: 'Respond with the single word: OK'
    });
    return {
      ready: true,
      model: headers.model || 'gemini-2.5-flash',
      provider: headers.provider || 'gemini',
      message: `Successfully connected to ${headers.provider} model: ${response.text?.slice(0, 10).trim() || 'OK'}`
    };
  } catch (err: any) {
    return {
      ready: false,
      model: headers.model || 'gemini-2.5-flash',
      provider: headers.provider || 'gemini',
      message: `LLM Connection probe failed: ${err.message || 'Invalid API Key'}`
    };
  }
}

/**
 * generateJson: Calls LLM and validates JSON with Zod schema.
 * Retries once if schema validation fails.
 */
export async function generateJson<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  headers: LlmHeaders,
  fallbackData: T
): Promise<T> {
  if (!headers.apiKey) {
    return fallbackData;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: headers.apiKey });
    const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON matching this schema with no markdown ticks, no preamble, and no commentary.`;

    const res = await ai.models.generateContent({
      model: headers.model || 'gemini-2.5-flash',
      contents: fullPrompt
    });

    const rawText = (res.text || '').replace(/^```json/m, '').replace(/```$/m, '').trim();
    const parsed = JSON.parse(rawText);
    const validated = schema.parse(parsed);
    return validated;
  } catch (err) {
    // Retry once with explicit schema instructions
    try {
      const ai = new GoogleGenAI({ apiKey: headers.apiKey });
      const retryPrompt = `Previous response failed JSON validation. Please regenerate strictly valid JSON:\n${prompt}`;
      const res = await ai.models.generateContent({
        model: headers.model || 'gemini-2.5-flash',
        contents: retryPrompt
      });
      const rawText = (res.text || '').replace(/^```json/m, '').replace(/```$/m, '').trim();
      const parsed = JSON.parse(rawText);
      return schema.parse(parsed);
    } catch {
      // Fallback safely to domain-structured deterministic data
      return fallbackData;
    }
  }
}
