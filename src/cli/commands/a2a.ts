import { Command } from 'commander';
import { a2aLogsCommand } from './a2a-logs.js';

export const a2aCommand = new Command('a2a')
  .description('Manage Agent-to-Agent protocol')
  .addCommand(a2aLogsCommand);
