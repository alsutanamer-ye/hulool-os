import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { globalA2ARouter } from '../../core/a2a/router.js';
import { icons } from '../../utils/icons.js';

export const a2aLogsCommand = new Command('logs')
  .description('View A2A message history')
  .option('-n, --limit <number>', 'Number of messages to show', '20')
  .option('--json', 'Output as JSON')
  .option('--clear', 'Clear A2A message log')
  .action(async (options: { limit: string; json?: boolean; clear?: boolean }) => {
    if (options.clear) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `${icons.warning} Clear A2A logs?`,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Cancelled.'));
        return;
      }

      await globalA2ARouter.clearLogs();
      console.log(chalk.green(`${icons.check} A2A logs cleared.`));
      return;
    }

    const logs = await globalA2ARouter.getLogs();
    const limit = Number(options.limit) || 20;
    const recentLogs = logs.slice(-limit);

    if (options.json) {
      console.log(JSON.stringify(recentLogs, null, 2));
      return;
    }

    if (recentLogs.length === 0) {
      console.log(chalk.yellow(`\n${icons.warning} No A2A messages found.\n`));
      return;
    }

    console.log(chalk.blue.bold(`\n${icons.list} A2A Message Log - Last ${recentLogs.length}\n`));
    console.log(chalk.gray('─'.repeat(80)));

    for (const msg of recentLogs) {
      const icon =
        msg.intent === 'response'
          ? icons.check
          : msg.intent === 'error'
            ? icons.x
            : icons.refresh;

      const color =
        msg.intent === 'response'
          ? chalk.green
          : msg.intent === 'error'
            ? chalk.red
            : chalk.blue;

      console.log(color(`${icon} ${msg.timestamp}`));
      console.log(chalk.white(`   Action: ${chalk.cyan(msg.action)}`));
      console.log(chalk.white(`   Route:  ${msg.senderId} → ${msg.receiverId}`));
      console.log(chalk.white(`   Intent: ${msg.intent}`));

      if (msg.payload !== undefined) {
        const preview = JSON.stringify(msg.payload).slice(0, 160);
        console.log(chalk.gray(`   Payload: ${preview}${preview.length >= 160 ? '...' : ''}`));
      }

      console.log('');
    }

    console.log(chalk.gray('─'.repeat(80)));
    console.log(chalk.white(`Total messages: ${chalk.cyan(String(logs.length))}\n`));
  });
