import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import ora from 'ora';
import chalk from 'chalk';
import { getEnvVar } from '../utils/env-manager.js';
import { getSecret } from '../utils/vault.js';
import { icons } from '../utils/icons.js';
import type { Agent } from '../types/agent.js';

export interface RunAgentInput {
  agent: Agent;
  taskDescription: string;
  systemPrompt?: string;
  input?: Record<string, unknown>;
}

export interface RunAgentSuccessResult {
  success: true;
  response: string;
  tokensUsed: number;
  cost: number;
  model: string;
  provider: string;
}

export interface RunAgentFailureResult {
  success: false;
  error: string;
  tokensUsed: number;
  cost: number;
}

export type RunAgentResult = RunAgentSuccessResult | RunAgentFailureResult;

/**
 * تقريب أسعار النماذج (USD لكل 1 مليون توكن: entrada / salida)
 * المصادر: صفحات التسعير الرسمية لـ OpenAI و Anthropic
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 30, output: 60 },
  'gpt-4-turbo-preview': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'claude-3-sonnet-20240229': { input: 3, output: 15 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
};

type LLMProvider = 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'unknown';

/**
 * كشف مزود LLM من اسم الموديل.
 */
function detectProvider(model: string): LLMProvider {
  const lower = model.toLowerCase();
  if (lower.startsWith('gpt-') || lower.startsWith('o1')) return 'openai';
  if (lower.startsWith('claude-')) return 'anthropic';
  if (
    lower.includes('ollama') ||
    lower.startsWith('llama') ||
    lower.startsWith('mistral') ||
    lower.startsWith('codellama')
  ) {
    return 'ollama';
  }
  return 'openrouter'; // fallback للعروض الأخرى عبر OpenRouter
}

const ENV_KEY_MAP: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  qwen: 'QWEN_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  ollama: '',
};

/**
 * الحصول على مفتاح API للمزود.
 * أولاً من متغيرات البيئة، ثم من الخزنة المشفرة (vault).
 */
async function getApiKey(provider: string): Promise<string | null> {
  const envKey = ENV_KEY_MAP[provider];
  if (!envKey) return null;

  const envVal = await getEnvVar(envKey);
  if (envVal) return envVal;

  // محاولة من الخزنة المشفرة كبديل
  const secret = await getSecret(envKey);
  if (secret) return secret;

  return null;
}

/**
 * حساب التكلفة بناءً على عدد التوكنات والموديل.
 */
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || { input: 1, output: 2 };
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * تقدير عدد التوكنات من النص (تقريبي: 1 توكن ≈ 4 أحرف للإنجليزية).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * تنفيذ مهمة باستخدام وكيل الذكاء الاصطناعي.
 * يستدعي مزود LLM المناسب، يحسب التكلفة، ويعيد النتيجة.
 *
 * @param input - بيانات الوكيل والمهمة
 * @return نتيجة التنفيذ تحتوي على الاستجابة والتكلفة والتوكنات المستخدمة
 */
export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const { agent, taskDescription, systemPrompt = agent.systemPrompt, input: taskInput } = input;
  const provider = detectProvider(agent.model);

  const spinner = ora(`${icons.refresh} استدعاء ${agent.model} via ${provider}...`);
  spinner.start();

  try {
    const apiKey = await getApiKey(provider);

    if (!apiKey && provider !== 'ollama') {
      spinner.fail(`مفتاح API غير موجود للمزود: ${provider}`);
      return {
        success: false,
        error: `${provider} API key not found. Run: hulool setup`,
        tokensUsed: 0,
        cost: 0,
      };
    }

    // بناء الرسائل للموديل
    const userContent = taskInput
      ? `${taskDescription}\n\nInput: ${JSON.stringify(taskInput)}`
      : taskDescription;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    let responseText: string;
    let inputTokens: number;
    let outputTokens: number;

    if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: agent.model,
        messages: messages as any,
        temperature: 0.7,
      });
      responseText = completion.choices[0]?.message?.content || '';
      inputTokens = completion.usage?.prompt_tokens ?? estimateTokens(systemPrompt + taskDescription);
      outputTokens = completion.usage?.completion_tokens ?? estimateTokens(responseText);
    } else if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey });
      const systemMsg = messages.find(m => m.role === 'system');
      const userMsgs = messages.filter(m => m.role !== 'system');
      const completion = await anthropic.messages.create({
        model: agent.model,
        max_tokens: 4096,
        system: systemMsg ? (systemMsg.content as string) : '',
        messages: userMsgs as any,
      });
      const contentBlock = completion.content[0];
      responseText = contentBlock.type === 'text' ? contentBlock.text : '';
      inputTokens = completion.usage?.input_tokens ?? estimateTokens(systemPrompt + taskDescription);
      outputTokens = completion.usage?.output_tokens ?? estimateTokens(responseText);
    } else if (provider === 'ollama') {
      const ollama = new OpenAI({ apiKey: 'ollama', baseURL: 'http://localhost:11434/v1' });
      const completion = await ollama.chat.completions.create({
        model: agent.model,
        messages: messages as any,
        temperature: 0.7,
      });
      responseText = completion.choices[0]?.message?.content || '';
      inputTokens = completion.usage?.prompt_tokens ?? estimateTokens(systemPrompt + taskDescription);
      outputTokens = completion.usage?.completion_tokens ?? estimateTokens(responseText);
    } else {
      // openrouter أو أي مزود متوافق مع OpenAI API
      const baseURL = 'https://openrouter.ai/api/v1';
      const openrouter = new OpenAI({ apiKey, baseURL });
      const completion = await openrouter.chat.completions.create({
        model: agent.model,
        messages: messages as any,
        temperature: 0.7,
      });
      responseText = completion.choices[0]?.message?.content || '';
      inputTokens = completion.usage?.prompt_tokens ?? estimateTokens(systemPrompt + taskDescription);
      outputTokens = completion.usage?.completion_tokens ?? estimateTokens(responseText);
    }

    const cost = calculateCost(agent.model, inputTokens, outputTokens);
    const totalTokens = inputTokens + outputTokens;

    spinner.succeed(`تم التنفيذ بنجاح (${totalTokens} توكن، $${cost.toFixed(4)})`);

    return {
      success: true,
      response: responseText,
      tokensUsed: totalTokens,
      cost,
      model: agent.model,
      provider,
    };
  } catch (err: any) {
    spinner.fail(`فشل التنفيذ: ${err.message}`);
    return {
      success: false,
      error: err.message || 'Unknown error',
      tokensUsed: 0,
      cost: 0,
    };
  }
}
