import { Command } from 'commander';
import chalk from 'chalk';
import { getEnvVar, hasEnvVar } from '../../utils/env-manager.js';
import { loadAllAgents } from '../../utils/agent-utils.js';

export const doctorCommand = new Command('doctor')
  .description('Check system health and configuration')
  .action(async () => {
    console.log(chalk.blue.bold('\n🩺 Hulool OS - System Health Check\n'));

    const checks: Array<{ name: string; status: 'pass' | 'warn' | 'fail'; message: string }> = [];

    // 1. التحقق من ملف .env
    try {
      const provider = await getEnvVar('DEFAULT_LLM_PROVIDER');
      if (provider) {
        checks.push({
          name: 'LLM Provider',
          status: 'pass',
          message: `Configured: ${provider}`
        });
      } else {
        checks.push({
          name: 'LLM Provider',
          status: 'fail',
          message: 'Not configured. Run: hulool setup'
        });
      }
    } catch {
      checks.push({
        name: 'Environment File',
        status: 'fail',
        message: '.env file not found'
      });
    }

    // 2. التحقق من مفاتيح API
    const providers = ['openai', 'anthropic', 'gemini', 'qwen', 'openrouter'];
    const envKeys = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      gemini: 'GEMINI_API_KEY',
      qwen: 'QWEN_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
    };

    const defaultProvider = await getEnvVar('DEFAULT_LLM_PROVIDER');
    if (defaultProvider && defaultProvider !== 'ollama') {
      const envKey = envKeys[defaultProvider as keyof typeof envKeys];
      const hasKey = await hasEnvVar(envKey);
      
      if (hasKey) {
        checks.push({
          name: 'API Key',
          status: 'pass',
          message: `${defaultProvider} API key configured`
        });
      } else {
        checks.push({
          name: 'API Key',
          status: 'fail',
          message: `${envKey} not found. Run: hulool setup`
        });
      }
    }

    // 3. التحقق من النموذج الافتراضي
    const model = await getEnvVar('DEFAULT_LLM_MODEL');
    if (model) {
      checks.push({
        name: 'Default Model',
        status: 'pass',
        message: model
      });
    } else {
      checks.push({
        name: 'Default Model',
        status: 'warn',
        message: 'Not set. Using fallback: gpt-3.5-turbo'
      });
    }

    // 4. التحقق من الوكلاء
    const agents = await loadAllAgents();
    if (agents.length > 0) {
      checks.push({
        name: 'Agents',
        status: 'pass',
        message: `${agents.length} agent(s) found`
      });
    } else {
      checks.push({
        name: 'Agents',
        status: 'warn',
        message: 'No agents created yet. Run: hulool agent create'
      });
    }

    // 5. التحقق من الميزانيات
    const agentsWithBudget = agents.filter(a => a.budget.monthly > 0);
    if (agentsWithBudget.length > 0) {
      checks.push({
        name: 'Budget System',
        status: 'pass',
        message: `${agentsWithBudget.length} agent(s) with budget configured`
      });
    }

    // عرض النتائج
    console.log(chalk.gray('─'.repeat(60)));
    
    for (const check of checks) {
      const icon = check.status === 'pass' ? chalk.green('✓') :
                   check.status === 'warn' ? chalk.yellow('⚠') :
                   chalk.red('✗');
      
      const statusColor = check.status === 'pass' ? chalk.green :
                          check.status === 'warn' ? chalk.yellow :
                          chalk.red;
      
      console.log(`  ${icon} ${chalk.white(check.name.padEnd(20))} ${statusColor(check.message)}`);
    }

    console.log(chalk.gray('─'.repeat(60)));

    // الملخص
    const passCount = checks.filter(c => c.status === 'pass').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;
    const failCount = checks.filter(c => c.status === 'fail').length;

    console.log('');
    console.log(chalk.white('📊 Summary:'));
    console.log(chalk.green(`   ✓ Passed: ${passCount}`));
    if (warnCount > 0) console.log(chalk.yellow(`   ⚠ Warnings: ${warnCount}`));
    if (failCount > 0) console.log(chalk.red(`   ✗ Failed: ${failCount}`));
    console.log('');

    if (failCount > 0) {
      console.log(chalk.red.bold('❌ System has critical issues. Please fix them before proceeding.'));
      console.log(chalk.gray('   Run: hulool setup\n'));
      process.exit(1);
    } else if (warnCount > 0) {
      console.log(chalk.yellow.bold('⚠️  System is ready but has some warnings.'));
      console.log(chalk.gray('   You can proceed, but consider addressing the warnings.\n'));
    } else {
      console.log(chalk.green.bold('✅ All checks passed! System is ready to use.\n'));
    }
  });
