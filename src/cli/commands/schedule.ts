import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { scheduler } from '../../core/scheduler/scheduler.js';
import { icons } from '../../utils/icons.js';
import type { Schedule } from '../../types/schedule.js';

export const scheduleCommand = new Command('schedule')
  .description('Manage scheduled tasks and workflows')
  .addCommand(new Command('create')
    .description('Create a new schedule')
    .argument('<name>', 'Schedule name')
    .option('-c, --cron <expr>', 'Cron expression (e.g., "0 9 * * *" = daily at 9am)')
    .option('-w, --workflow <id>', 'Workflow ID to run')
    .option('-i, --input <json>', 'Input JSON', '{}')
    .option('-z, --timezone <tz>', 'Timezone', 'UTC')
    .action(async (name, options) => {
      let cron = options.cron;
      if (!cron) {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'preset',
            message: 'Select schedule preset:',
            choices: [
              { name: 'Every hour', value: '0 * * * *' },
              { name: 'Every day at 9 AM', value: '0 9 * * *' },
              { name: 'Every Monday at 9 AM', value: '0 9 * * 1' },
              { name: 'Every 15 minutes', value: '*/15 * * * *' },
              { name: 'Custom', value: 'custom' },
            ],
          },
        ]);
        if (answers.preset === 'custom') {
          const custom = await inquirer.prompt([
            { type: 'input', name: 'cron', message: 'Enter cron expression (5 fields):' },
          ]);
          cron = custom.cron;
        } else {
          cron = answers.preset;
        }
      }

      let workflowId = options.workflow;
      if (!workflowId) {
        const answers = await inquirer.prompt([
          { type: 'input', name: 'workflowId', message: 'Workflow ID to run:' },
        ]);
        workflowId = answers.workflowId;
      }

      const schedule: Schedule = {
        id: `sch-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        description: `Schedule for workflow ${workflowId}`,
        status: 'active',
        cron,
        target: {
          type: 'workflow',
          id: workflowId,
          input: JSON.parse(options.input),
        },
        timezone: options.timezone,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          runCount: 0,
          failureCount: 0,
        },
      };

      const spinner = ora(`${icons.refresh} Creating schedule...`).start();
      try {
        await scheduler.create(schedule);
        spinner.succeed(`${icons.check} Schedule "${name}" created`);
        console.log(chalk.gray(`   ID:      ${schedule.id}`));
        console.log(chalk.gray(`   Cron:    ${cron}`));
        console.log(chalk.gray(`   Next:    ${schedule.nextRunAt}`));
        console.log(chalk.gray(`   Target:  workflow ${workflowId}`));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to create schedule`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('list')
    .description('List all schedules')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora(`${icons.list} Loading schedules...`).start();
      try {
        const schedules = await scheduler.list();
        spinner.stop();

        if (schedules.length === 0) {
          console.log(chalk.yellow('\n⚠️  No schedules found.\n'));
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(schedules, null, 2));
          return;
        }

        console.log(chalk.blue.bold(`\n${icons.list} Schedules (${schedules.length})\n`));
        console.log(chalk.gray('─'.repeat(80)));

        for (const sch of schedules) {
          const statusIcon = sch.status === 'active' ? chalk.green(icons.check) :
                             sch.status === 'paused' ? chalk.yellow(icons.warning) :
                             chalk.gray(icons.refresh);
          
          console.log(`${statusIcon} ${chalk.bold(sch.name)} ${chalk.gray(`[${sch.id}]`)}`);
          console.log(chalk.gray(`   Cron: ${sch.cron} | Next: ${sch.nextRunAt || 'N/A'}`));
          console.log(chalk.gray(`   Target: ${sch.target.type} ${sch.target.id} | Runs: ${sch.metadata.runCount}`));
          console.log('');
        }
        console.log(chalk.gray('─'.repeat(80)));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to list schedules`);
      }
    })
  )
  .addCommand(new Command('run')
    .description('Execute a schedule immediately')
    .argument('<id>', 'Schedule ID')
    .action(async (id) => {
      const spinner = ora(`${icons.refresh} Executing schedule "${id}"...`).start();
      try {
        const run = await scheduler.execute(id);
        if (run.status === 'success') {
          spinner.succeed(`${icons.check} Schedule executed successfully`);
        } else {
          spinner.fail(`${icons.x} Schedule execution failed: ${run.error}`);
        }
      } catch (error) {
        spinner.fail(`${icons.x} Execution failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('pause')
    .description('Pause a schedule')
    .argument('<id>', 'Schedule ID')
    .action(async (id) => {
      const success = await scheduler.pause(id);
      if (success) {
        console.log(chalk.green(`${icons.check} Schedule paused`));
      } else {
        console.log(chalk.red(`${icons.x} Schedule not found`));
      }
    })
  )
  .addCommand(new Command('resume')
    .description('Resume a paused schedule')
    .argument('<id>', 'Schedule ID')
    .action(async (id) => {
      const success = await scheduler.resume(id);
      if (success) {
        console.log(chalk.green(`${icons.check} Schedule resumed`));
      } else {
        console.log(chalk.red(`${icons.x} Schedule not found`));
      }
    })
  )
  .addCommand(new Command('delete')
    .description('Delete a schedule')
    .argument('<id>', 'Schedule ID')
    .action(async (id) => {
      const { confirm } = await inquirer.prompt([
        { type: 'confirm', name: 'confirm', message: `${icons.warning} Delete schedule "${id}"?`, default: false },
      ]);
      if (!confirm) return;

      const deleted = await scheduler.delete(id);
      if (deleted) {
        console.log(chalk.green(`${icons.check} Schedule deleted`));
      } else {
        console.log(chalk.red(`${icons.x} Schedule not found`));
      }
    })
  );
