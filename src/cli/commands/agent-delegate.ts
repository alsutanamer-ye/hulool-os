import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { globalA2ARouter } from '../../core/a2a/router.js';
import { loadAgent } from '../../utils/agent-utils.js';
import { icons } from '../../utils/icons.js';
import '../../core/a2a/handlers.js';

function parsePayload(payloadText: string): unknown {
  try {
    return JSON.parse(payloadText);
  } catch {
    throw new Error('Invalid JSON payload');
  }
}

function formatDuration(startTimestamp: string): string {
  const diffMs = Date.now() - new Date(startTimestamp).getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export const agentDelegateCommand = new Command('delegate')
  .description('Delegate a task from one agent to another via A2A protocol')
  .argument('<from>', 'Sender agent ID')
  .argument('<to>', 'Receiver agent ID')
  .argument('<action>', 'Action to perform: research, write, review, summarize')
  .option('-p, --payload <json>', 'JSON payload for the action', '{}')
  .option('--no-wait', 'Send without waiting for response')
  .option('--ttl <seconds>', 'Time to live in seconds', '300')
  .action(async (from: string, to: string, action: string, options: { payload: string; wait: boolean; ttl: string }) => {
    console.log(chalk.blue.bold(`\n${icons.terminal} A2A Delegation: ${from} → ${to}\n`));

    const sender = await loadAgent(from);
    if (!sender) {
      console.error(chalk.red(`${icons.x} Sender agent "${from}" not found.`));
      console.error(chalk.gray(`   Run: hulool agent list\n`));
      process.exit(1);
    }

    const receiver = await loadAgent(to);
    if (!receiver) {
      console.error(chalk.red(`${icons.x} Receiver agent "${to}" not found.`));
      console.error(chalk.gray(`   Run: hulool agent list\n`));
      process.exit(1);
    }

    let payload: unknown;

    try {
      payload = parsePayload(options.payload);
    } catch (error) {
      console.error(chalk.red(`${icons.x} Invalid JSON payload`));
      process.exit(1);
    }

    const spinner = ora(`${icons.refresh} Sending A2A message...`).start();
    const startedAt = new Date().toISOString();

    try {
      const message = await globalA2ARouter.sendMessage({
        senderId: from,
        receiverId: to,
        intent: 'request',
        action,
        payload,
        requiresResponse: options.wait !== false,
        ttl: Number(options.ttl) || 300,
      });

      if (message.intent === 'response') {
        spinner.succeed(`${icons.check} Response received`);

        console.log(chalk.gray('\n' + '─'.repeat(60)));
        console.log(chalk.white.bold('Response:'));
        console.log(chalk.cyan(JSON.stringify(message.payload, null, 2)));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.white.bold('Metrics:'));
        console.log(chalk.gray(`   Action:   ${action}`));
        console.log(chalk.gray(`   From:     ${from}`));
        console.log(chalk.gray(`   To:       ${to}`));
        console.log(chalk.gray(`   Duration: ${formatDuration(startedAt)}`));
        console.log(chalk.gray('─'.repeat(60) + '\n'));
        return;
      }

      if (message.intent === 'error') {
        spinner.fail(`${icons.x} A2A error`);
        console.error(chalk.red(JSON.stringify(message.payload, null, 2)));
        process.exit(1);
      }

      spinner.succeed(`${icons.check} Message sent`);
    } catch (error) {
      spinner.fail(`${icons.x} Delegation failed`);
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });
