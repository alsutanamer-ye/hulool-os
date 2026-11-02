import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { saveEnvVars, getEnvVar } from '../../utils/env-manager.js';
import { startSetupServer } from '../../server/setup-server.js';
import { exec } from 'child_process';

const LLM_PROVIDERS = [
  { name: '🟢 OpenAI (GPT-4, GPT-3.5)', value: 'openai', envKey: 'OPENAI_API_KEY', getUrl: 'https://platform.openai.com/api-keys' },
  { name: '🟠 Anthropic (Claude 3)', value: 'anthropic', envKey: 'ANTHROPIC_API_KEY', getUrl: 'https://console.anthropic.com/settings/keys' },
  { name: '🔵 Google Gemini', value: 'gemini', envKey: 'GEMINI_API_KEY', getUrl: 'https://makersuite.google.com/app/apikey' },
  { name: '🟣 Qwen (Alibaba)', value: 'qwen', envKey: 'QWEN_API_KEY', getUrl: 'https://dashscope.console.aliyun.com/apiKey' },
  { name: '🌐 OpenRouter (All models)', value: 'openrouter', envKey: 'OPENROUTER_API_KEY', getUrl: 'https://openrouter.ai/keys' },
  { name: '🏠 Ollama (Local)', value: 'ollama', envKey: '', getUrl: '' },
];

async function startWebSetup() {
  console.log(chalk.blue.bold('\n🌐 Starting Web Setup Wizard...\n'));
  const port = 3333;
  const url = `http://localhost:${port}`;

  try {
    await startSetupServer(port);
    
    console.log(chalk.yellow.bold('\n👉 Please open this URL in your browser:'));
    console.log(chalk.cyan.underline(`   ${url}\n`));
    
    console.log(chalk.gray('Attempting to open browser automatically (this may fail in proot, which is OK)...'));
    
    // فتح المتصفح في الخلفية بدون انتظار (non-blocking)
    const platform = process.platform;
    let command = platform === 'win32' ? `start ${url}` : 
                  platform === 'darwin' ? `open ${url}` : 
                  `xdg-open ${url} 2>/dev/null`;
                  
    exec(command, (error) => {
      if (error) {
        console.log(chalk.gray('   (Auto-open failed, please open the URL manually)'));
      }
    });

    console.log(chalk.gray('\n   Press Ctrl+C to stop the server and return to CLI\n'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error starting setup server:'), error);
    process.exit(1);
  }
}

async function runCLISetup(options: { reset?: boolean }) {
  console.log(chalk.blue.bold('\n🔧 Hulool OS - CLI Setup Wizard\n'));
  
  if (options.reset) {
    const { confirm } = await inquirer.prompt([{ type: 'confirm', name: 'confirm', message: '⚠️ Delete all saved API keys?', default: false }]);
    if (!confirm) return;
    await saveEnvVars({ OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', GEMINI_API_KEY: '', QWEN_API_KEY: '', OPENROUTER_API_KEY: '', DEFAULT_LLM_PROVIDER: '', DEFAULT_LLM_MODEL: '' });
    console.log(chalk.green('✅ Reset complete.'));
    return;
  }

  const { primaryProvider } = await inquirer.prompt([{ type: 'list', name: 'primaryProvider', message: '🎯 Select primary LLM provider:', choices: LLM_PROVIDERS }]);
  const provider = LLM_PROVIDERS.find(p => p.value === primaryProvider)!;

  let apiKey = '';
  if (provider.value !== 'ollada') {
    console.log(chalk.gray(`\n📝 Get API key from: ${chalk.cyan(provider.getUrl)}`));
    const { key } = await inquirer.prompt([{ type: 'password', name: 'key', message: `🔑 Enter ${provider.name} API key:`, validate: (i: string) => i.length > 10 || 'Too short' }]);
    apiKey = key;
  }

  const models: Record<string, string[]> = {
    openai: ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    gemini: ['gemini-pro', 'gemini-pro-vision'],
    qwen: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    openrouter: ['openai/gpt-4', 'anthropic/claude-3-opus', 'google/gemini-pro'],
    ollama: ['llama2', 'codellama', 'mistral'],
  };

  const { defaultModel } = await inquirer.prompt([{ type: 'list', name: 'defaultModel', message: '🧠 Select default model:', choices: models[provider.value] }]);

  const spinner = ora('Saving configuration...').start();
  const envVars: Record<string, string> = { DEFAULT_LLM_PROVIDER: provider.value, DEFAULT_LLM_MODEL: defaultModel };
  if (apiKey) envVars[provider.envKey] = apiKey;
  
  await saveEnvVars(envVars);
  spinner.succeed('Configuration saved!');

  console.log(chalk.green.bold('\n✅ Setup Complete!'));
  console.log(chalk.gray(`   Provider: ${provider.name}`));
  console.log(chalk.gray(`   Model: ${defaultModel}\n`));
}

export const setupCommand = new Command('setup')
  .description('Configure LLM providers and API keys')
  .option('--web', 'Open web-based setup wizard')
  .option('--ui', 'Alias for --web')
  .option('--reset', 'Reset all configurations')
  .action(async (options: any) => {
    if (options.web || options.ui) {
      await startWebSetup();
    } else {
      await runCLISetup(options);
    }
  });
