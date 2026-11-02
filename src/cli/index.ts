#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { loadAllCommands } from './loader.js';
import { icons } from '../utils/icons.js';

const program = new Command();

program
  .name('hulool')
  .description(chalk.blue.bold(`${icons.terminal} Hulool OS - AI Agent Orchestration Platform`))
  .version('1.0.0');

// تحميل جميع الأوامر تلقائياً من مجلد commands
console.log(chalk.gray('\n🔍 Loading modules...'));
await loadAllCommands(program);
console.log(chalk.green('✅ All modules loaded successfully.\n'));

program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (err) {
  if (err instanceof Error && err.message.includes('unknown command')) {
    console.error(chalk.red(`\n${icons.x} Unknown command. Try 'hulool --help'\n`));
  }
  process.exit(1);
}
