import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { notifier } from '../../core/notifications/notifier.js';
import { icons } from '../../utils/icons.js';
import type { NotificationChannel, NotificationLevel } from '../../types/notification.js';

export const notifyCommand = new Command('notify')
  .description('Manage notifications across multiple channels')
  .addCommand(new Command('send')
    .description('Send a notification')
    .argument('<title>', 'Notification title')
    .argument('<message>', 'Notification message')
    .option('-c, --channel <channel>', 'Channel (console, webhook, telegram, slack)', 'console')
    .option('-l, --level <level>', 'Level (info, success, warning, error)', 'info')
    .option('-m, --metadata <json>', 'Metadata JSON', '{}')
    .action(async (title, message, options) => {
      const spinner = ora(`${icons.refresh} Sending notification...`).start();
      try {
        const metadata = JSON.parse(options.metadata);
        const result = await notifier.send(
          options.channel as NotificationChannel,
          options.level as NotificationLevel,
          title,
          message,
          metadata
        );

        if (result.status === 'sent') {
          spinner.succeed(`${icons.check} Notification sent via ${options.channel}`);
        } else {
          spinner.fail(`${icons.x} Notification failed: ${result.error}`);
        }
      } catch (error) {
        spinner.fail(`${icons.x} Failed to send notification`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('broadcast')
    .description('Send notification to all enabled channels')
    .argument('<title>', 'Notification title')
    .argument('<message>', 'Notification message')
    .option('-l, --level <level>', 'Level', 'info')
    .action(async (title, message, options) => {
      const spinner = ora(`${icons.refresh} Broadcasting notification...`).start();
      try {
        const results = await notifier.sendToAll(
          options.level as NotificationLevel,
          title,
          message
        );

        const sent = results.filter(r => r.status === 'sent').length;
        const failed = results.filter(r => r.status === 'failed').length;

        if (failed === 0) {
          spinner.succeed(`${icons.check} Broadcast successful (${sent} channels)`);
        } else {
          spinner.warn(`${icons.warning} Broadcast partial: ${sent} sent, ${failed} failed`);
        }
      } catch (error) {
        spinner.fail(`${icons.x} Broadcast failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('list')
    .description('List recent notifications')
    .option('-n, --limit <number>', 'Number of notifications', '20')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora(`${icons.list} Loading notifications...`).start();
      try {
        const notifications = await notifier.list(parseInt(options.limit));
        spinner.stop();

        if (notifications.length === 0) {
          console.log(chalk.yellow('\n⚠️  No notifications found.\n'));
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(notifications, null, 2));
          return;
        }

        console.log(chalk.blue.bold(`\n${icons.list} Recent Notifications (${notifications.length})\n`));
        console.log(chalk.gray('─'.repeat(80)));

        for (const notif of notifications) {
          const levelIcon = notif.level === 'error' ? chalk.red('❌') :
                            notif.level === 'warning' ? chalk.yellow('⚠️') :
                            notif.level === 'success' ? chalk.green('✅') :
                            chalk.blue('ℹ️');
          
          const statusIcon = notif.status === 'sent' ? chalk.green(icons.check) :
                             notif.status === 'failed' ? chalk.red(icons.x) :
                             chalk.yellow(icons.refresh);

          console.log(`${levelIcon} ${statusIcon} ${chalk.bold(notif.title)} ${chalk.gray(`[${notif.channel}]`)}`);
          console.log(chalk.gray(`   ${notif.message}`));
          console.log(chalk.gray(`   ${new Date(notif.createdAt).toLocaleString()}`));
          if (notif.error) console.log(chalk.red(`   Error: ${notif.error}`));
          console.log('');
        }
        console.log(chalk.gray('─'.repeat(80)));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to list notifications`);
      }
    })
  )
  .addCommand(new Command('config')
    .description('Configure a notification channel')
    .argument('<channel>', 'Channel name (telegram, slack, webhook)')
    .action(async (channel) => {
      console.log(chalk.blue.bold(`\n🔧 Configure channel: ${channel}\n`));

      let config: Record<string, string> = {};

      if (channel === 'telegram') {
        const answers = await inquirer.prompt([
          { type: 'password', name: 'botToken', message: 'Bot Token:' },
          { type: 'input', name: 'chatId', message: 'Chat ID:' },
        ]);
        config = answers;
      } else if (channel === 'slack') {
        const answers = await inquirer.prompt([
          { type: 'input', name: 'webhookUrl', message: 'Webhook URL:' },
        ]);
        config = answers;
      } else if (channel === 'webhook') {
        const answers = await inquirer.prompt([
          { type: 'input', name: 'webhookUrl', message: 'Webhook URL:' },
        ]);
        config = answers;
      } else {
        console.log(chalk.yellow(`Channel "${channel}" doesn't need configuration`));
        return;
      }

      const spinner = ora(`${icons.refresh} Saving configuration...`).start();
      try {
        await notifier.configureChannel(channel as NotificationChannel, config);
        spinner.succeed(`${icons.check} Channel "${channel}" configured`);
      } catch (error) {
        spinner.fail(`${icons.x} Failed to configure channel`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('test')
    .description('Test a notification channel')
    .argument('<channel>', 'Channel name')
    .action(async (channel) => {
      const spinner = ora(`${icons.refresh} Testing channel "${channel}"...`).start();
      try {
        const result = await notifier.send(
          channel as NotificationChannel,
          'info',
          'Test Notification',
          `This is a test notification from Hulool OS at ${new Date().toISOString()}`
        );

        if (result.status === 'sent') {
          spinner.succeed(`${icons.check} Channel "${channel}" is working`);
        } else {
          spinner.fail(`${icons.x} Channel test failed: ${result.error}`);
        }
      } catch (error) {
        spinner.fail(`${icons.x} Test failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  );
