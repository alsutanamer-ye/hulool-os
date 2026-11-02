import { Command } from 'commander';
import { taskCreateCommand } from './task-create.js';
import { taskListCommand } from './task-list.js';
import { taskInfoCommand } from './task-info.js';
import { taskRunCommand } from './task-run.js';

export const taskCommand = new Command('task')
  .description('Manage AI tasks')
  .addCommand(taskCreateCommand)
  .addCommand(taskListCommand)
  .addCommand(taskInfoCommand)
  .addCommand(taskRunCommand);
