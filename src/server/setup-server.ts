import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveEnvVars, getEnvVar, hasEnvVar } from '../utils/env-manager.js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Schema للتحقق من صحة طلب إعداد المزود
 */
const ConfigureSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini', 'qwen', 'openrouter', 'ollama']),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

/**
 * Schema للتحقق من صحة طلب اختبار الاتصال
 */
const TestConnectionSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini', 'qwen', 'openrouter', 'ollama']),
  apiKey: z.string(),
});

type ConfigureInput = z.infer<typeof ConfigureSchema>;
type TestConnectionInput = z.infer<typeof TestConnectionSchema>;

export async function startSetupServer(port: number = 3333): Promise<void> {
  console.log(chalk.gray('  ├─ Initializing Fastify server...'));
  const fastify = Fastify({ logger: false });

  console.log(chalk.gray('  ├─ Registering CORS and Static files...'));
  await fastify.register(cors, { origin: true });

  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../setup-ui'),
    prefix: '/',
  });

  console.log(chalk.gray('  ├─ Registering API routes...'));

  fastify.get('/api/status', async () => {
    return {
      configured: !!(await getEnvVar('DEFAULT_LLM_PROVIDER')),
      providers: {
        openai: await hasEnvVar('OPENAI_API_KEY'),
        anthropic: await hasEnvVar('ANTHROPIC_API_KEY'),
        gemini: await hasEnvVar('GEMINI_API_KEY'),
        qwen: await hasEnvVar('QWEN_API_KEY'),
        openrouter: await hasEnvVar('OPENROUTER_API_KEY'),
      },
      defaultProvider: await getEnvVar('DEFAULT_LLM_PROVIDER'),
      defaultModel: await getEnvVar('DEFAULT_LLM_MODEL'),
    };
  });

  fastify.post('/api/configure', async (request, reply) => {
    const parseResult = ConfigureSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid request body',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { provider, apiKey, model } = parseResult.data;
    const envVars: Record<string, string> = {
      DEFAULT_LLM_PROVIDER: provider,
      DEFAULT_LLM_MODEL: model || '',
    };
    if (apiKey && provider !== 'ollama') {
      const envKeyMap: Record<string, string> = {
        openai: 'OPENAI_API_KEY',
        anthropic: 'ANTHROPIC_API_KEY',
        gemini: 'GEMINI_API_KEY',
        qwen: 'QWEN_API_KEY',
        openrouter: 'OPENROUTER_API_KEY',
      };
      envVars[envKeyMap[provider]] = apiKey;
    }
    await saveEnvVars(envVars);
    return { success: true, message: 'Configuration saved successfully' };
  });

  fastify.post('/api/test', async (request, reply) => {
    const parseResult = TestConnectionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid request body',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { provider, apiKey } = parseResult.data;
    try {
      if (provider === 'openai') {
        await new OpenAI({ apiKey }).models.list();
      } else if (provider === 'anthropic') {
        await new Anthropic({ apiKey }).messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        });
      } else if (provider === 'gemini' || provider === 'openrouter') {
        const baseURL = provider === 'gemini'
          ? 'https://generativelanguage.googleapis.com/v1beta/openai/'
          : 'https://openrouter.ai/api/v1';
        await new OpenAI({ apiKey, baseURL }).models.list();
      } else if (provider === 'ollama') {
        await new OpenAI({ apiKey: 'ollama', baseURL: 'http://localhost:11434/v1' }).models.list();
      } else if (provider === 'qwen') {
        await new OpenAI({ apiKey, baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' }).models.list();
      }
      return { success: true, message: `${provider} connection successful` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      return { success: false, message };
    }
  });

  console.log(chalk.gray(`  └─ Attempting to listen on port ${port}...`));
  try {
    // استخدام 0.0.0.0 لضمان العمل داخل proot/containers
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(chalk.green(`\n✅ Setup server is running!`));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`\n❌ Failed to start server on port ${port}:`), message);
    if (err instanceof Error && 'code' in err && err.code === 'EADDRINUSE') {
      console.log(chalk.yellow(`   Port ${port} is already in use. Try killing the process or using a different port.`));
    }
    process.exit(1);
  }
}
