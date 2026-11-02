import { Command } from 'commander';
import chalk from 'chalk';
import { loadAllTasks } from '../../utils/task-utils.js';

const STATUS_ICONS: Record<string, string> = {
  pending: chalk.gray('○'),
  running: chalk.cyan('●'),
  completed: chalk.green('●'),
  failed: chalk.red('●'),
  cancelled: chalk.yellow('●'),
};

export const taskListCommand = new Command('list')
  .description('List all tasks')
  .option('-a, --agent <agent-id>', 'Filter by agent ID')
  .option('-s, --status <status>', 'Filter by status')
  .option('-p, --priority <priority>', 'Filter by priority')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const tasks = await loadAllTasks();

    if (tasks.length === 0) {
      console.log(chalk.yellow('\n⚠️  No tasks found.'));
      console.log(chalk.gray('   Create one with: hulool task create\n'));
      return;
    }

    let filtered = tasks;
    if (options.agent) {
      filtered = filtered.filter(t => t.agentId === options.agent);
    }
    if (options.status) {
      filtered = filtered.filter(t => t.status === options.status);
    }
    if (options.priority) {
      filtered = filtered.filter(t => t.priority === options.priority);
    }

    if (filtered.length === 0) {
      console.log(chalk.yellow('\n⚠️  No tasks match the filters.'));
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(filtered, null, 2));
      return;
    }

    console.log(chalk.blue.bold('\n📋 Tasks\n'));

    const nameWidth = Math.max(20, ...filtered.map(t => t.description.length)) + 2;
    const agentWidth = Math.max(10, ...filtered.map(t => t.agentId.length)) + 2;
    const priorityWidth = 12;

    const header = [
      'ID'.padEnd(28),
      'Description'.padEnd(nameWidth),
      'Agent'.padEnd(agentWidth),
      'Priority'.padEnd(priorityWidth),
      'Status'.padEnd(10),
      'Cost'
    ].join('');

    console.log(chalk.gray('  ') + chalk.bold(header));
    console.log(chalk.gray('  ' + '─'.repeat(28 + nameWidth + agentWidth + priorityWidth + 25)));

    for (const task of filtered) {
      const statusIcon = STATUS_ICONS[task.status] || chalk.gray('?');
      const priorityColor = getPriorityColor(task.priority);
      const statusColor = getStatusColor(task.status);

      const row = [
        chalk.gray(task.id.padEnd(28)),
        chalk.white(task.description.padEnd(nameWidth)),
        chalk.gray(task.agentId.padEnd(agentWidth)),
        priorityColor(task.priority.padEnd(priorityWidth)),
        statusColor(statusIcon.toString().padEnd(10)),
        chalk.green(`$${task.cost.toFixed(4)}`)
      ].join('');

      console.log('  ' + row);
    }

    console.log('');
    console.log(chalk.gray(`  Total: ${filtered.length} task(s)`));
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

function getStatusColor(status: string): typeof chalk {
  switch (status) {
    case 'pending':
      return chalk.gray;
    case 'running':
      return chalk.cyan;
    case 'completed':
      return chalk.green;
    case 'failed':
      return chalk.red;
    case 'cancelled':
      return chalk.yellow;
    default:
      return chalk.gray;
  }
}
