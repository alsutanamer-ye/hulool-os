import { Command } from 'commander';
import chalk from 'chalk';
import { loadTask } from '../../utils/task-utils.js';
import { icons } from '../../utils/icons.js';

const SEPARATOR = chalk.gray('─'.repeat(50));

export const taskInfoCommand = new Command('info')
  .description('Show detailed information about a task')
  .argument('<id>', 'Task ID')
  .action(async (id) => {
    const task = await loadTask(id);

    if (!task) {
      console.error(chalk.red(`\n${icons.x} Task "${id}" not found.\n`));
      process.exit(1);
    }

    console.log('');
    console.log(chalk.blue.bold(`📋 Task: ${task.description}`));
    console.log('');
    console.log(SEPARATOR);
    console.log(chalk.white('  🆔 ID:            '), chalk.cyan(task.id));
    console.log(chalk.white('  🤖 Agent ID:      '), chalk.cyan(task.agentId));
    console.log(chalk.white('  📝 Description:   '), chalk.white(task.description));
    console.log(chalk.white('  ⚡ Priority:      '), getPriorityColor(task.priority)(task.priority.toUpperCase()));
    console.log(chalk.white('  📊 Status:        '), getStatusText(task.status));
    console.log(chalk.white('  📅 Created:       '), chalk.gray(new Date(task.createdAt).toLocaleString()));
    console.log(chalk.white('  🔄 Updated:       '), chalk.gray(new Date(task.updatedAt).toLocaleString()));
    console.log(SEPARATOR);

    if (task.goalId) {
      console.log(chalk.white('  🎯 Goal ID:       '), chalk.cyan(task.goalId));
    }

    if (task.input && Object.keys(task.input).length > 0) {
      console.log(SEPARATOR);
      console.log(chalk.white.bold('  📥 Input:'));
      console.log(chalk.gray('  ' + JSON.stringify(task.input, null, 2).replace(/\n/g, '\n  ')));
    }

    if (task.output && Object.keys(task.output).length > 0) {
      console.log(SEPARATOR);
      console.log(chalk.white.bold('  📤 Output:'));
      console.log(chalk.gray('  ' + JSON.stringify(task.output, null, 2).replace(/\n/g, '\n  ')));
    }

    console.log(SEPARATOR);
    console.log(chalk.white.bold('  💰 Cost & Tokens:'));
    console.log(chalk.white('     Tokens Used:  '), chalk.green(task.tokensUsed.toLocaleString()));
    console.log(chalk.white('     Cost:         '), chalk.green(`$${task.cost.toFixed(4)}`));

    if (task.startedAt) {
      console.log(chalk.white('     Started At:   '), chalk.gray(new Date(task.startedAt).toLocaleString()));
    }
    if (task.completedAt) {
      console.log(chalk.white('     Completed At: '), chalk.gray(new Date(task.completedAt).toLocaleString()));
    }

    if (task.errorMessage) {
      console.log(SEPARATOR);
      console.log(chalk.red.bold('  ❌ Error:'));
      console.log(chalk.red('     '), chalk.red(task.errorMessage));
    }

    console.log(SEPARATOR);
    console.log('');
  });

function getPriorityColor(priority: string): typeof chalk {
  switch (priority) {
    case 'low':
      return chalk.gray;
    case 'medium':
      return chalk.blue;
    case 'high':
      return chalk.yellow;
    case 'critical':
      return chalk.red;
    default:
      return chalk.gray;
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return chalk.gray('○ Pending');
    case 'running':
      return chalk.cyan('● Running');
    case 'completed':
      return chalk.green('● Completed');
    case 'failed':
      return chalk.red('● Failed');
    case 'cancelled':
      return chalk.yellow('● Cancelled');
    default:
      return chalk.gray('? Unknown');
  }
}
