#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { agentCommand } from './commands/agent.js';
import { setupCommand } from './commands/setup.js';
import { doctorCommand } from './commands/doctor.js';
import { secretsCommand } from './commands/secrets.js';
import { mcpCommand } from './commands/mcp.js';
import { a2aCommand } from './commands/a2a.js';
import { templateCommand } from './commands/template.js';
import { icons } from '../utils/icons.js';

const program = new Command();

program
  .name('hulool')
  .description(chalk.blue.bold(`${icons.terminal} Hulool OS - AI Agent Orchestration Platform`))
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(agentCommand);
program.addCommand(setupCommand);
program.addCommand(doctorCommand);
program.addCommand(secretsCommand);
program.addCommand(mcpCommand);
program.addCommand(a2aCommand);
program.addCommand(templateCommand);

program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (err) {
  if (err instanceof Error && err.message.includes('unknown command')) {
    console.error(chalk.red(`\n${icons.x} Unknown command\n`));
    program.help();
  }
  process.exit(1);
}
