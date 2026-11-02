import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { workflowEngine } from '../../core/workflow/engine.js';
import { icons } from '../../utils/icons.js';
import type { Workflow, WorkflowStep, StepType, TriggerType } from '../../types/workflow.js';

export const workflowCommand = new Command('workflow')
  .description('Manage AI agent workflows')
  .addCommand(new Command('create')
    .description('Create a new workflow')
    .argument('<name>', 'Workflow name')
    .option('-d, --description <text>', 'Description')
    .option('-t, --trigger <type>', 'Trigger type (manual, scheduled, webhook, event)', 'manual')
    .option('--cron <expr>', 'Cron expression for scheduled trigger')
    .action(async (name, options) => {
      console.log(chalk.blue.bold(`\n${icons.plus} Creating workflow: ${name}\n`));

      // جمع الخطوات تفاعلياً
      const steps: WorkflowStep[] = [];
      let addMore = true;
      let stepIndex = 1;

      while (addMore) {
        const stepAnswers = await inquirer.prompt([
          {
            type: 'list',
            name: 'type',
            message: `Step ${stepIndex} - Select type:`,
            choices: [
              { name: '🤖 Agent (run agent with prompt)', value: 'agent' },
              { name: '⏱️ Delay (wait for N ms)', value: 'delay' },
              { name: '❓ Condition (if/else)', value: 'condition' },
              { name: '📨 A2A (delegate to another agent)', value: 'a2a' },
            ],
          },
        ]);

        const step: WorkflowStep = {
          id: `step-${stepIndex}`,
          name: `Step ${stepIndex}`,
          type: stepAnswers.type as StepType,
          onError: 'abort',
        };

        if (stepAnswers.type === 'agent') {
          const agentAnswers = await inquirer.prompt([
            { type: 'input', name: 'agentId', message: 'Agent ID:' },
            { type: 'input', name: 'prompt', message: 'Prompt (use {{var}} for variables):' },
          ]);
          step.agentId = agentAnswers.agentId;
          step.prompt = agentAnswers.prompt;
          step.name = `Run ${agentAnswers.agentId}`;
        } else if (stepAnswers.type === 'delay') {
          const delayAnswers = await inquirer.prompt([
            { type: 'number', name: 'delayMs', message: 'Delay (ms):', default: 1000 },
          ]);
          step.delayMs = delayAnswers.delayMs;
          step.name = `Wait ${delayAnswers.delayMs}ms`;
        } else if (stepAnswers.type === 'condition') {
          const condAnswers = await inquirer.prompt([
            { type: 'input', name: 'condition', message: 'Condition (JS expression):' },
          ]);
          step.condition = condAnswers.condition;
          step.name = `If ${condAnswers.condition}`;
        } else if (stepAnswers.type === 'a2a') {
          const a2aAnswers = await inquirer.prompt([
            { type: 'input', name: 'agentId', message: 'Target agent ID:' },
            { 
              type: 'list', 
              name: 'action', 
              message: 'A2A action:',
              choices: ['research', 'write', 'review', 'summarize']
            },
          ]);
          step.agentId = a2aAnswers.agentId;
          step.a2aAction = a2aAnswers.action;
          step.name = `A2A ${a2aAnswers.action} → ${a2aAnswers.agentId}`;
        }

        steps.push(step);
        stepIndex++;

        const { more } = await inquirer.prompt([
          { type: 'confirm', name: 'more', message: 'Add another step?', default: false },
        ]);
        addMore = more;
      }

      const workflow: Workflow = {
        id: `wf-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        description: options.description || '',
        status: 'active',
        steps,
        trigger: {
          type: options.trigger as TriggerType,
          cron: options.cron,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          runCount: 0,
          successRate: 0,
          avgDurationMs: 0,
        },
      };

      const spinner = ora(`${icons.refresh} Creating workflow...`).start();
      try {
        await workflowEngine.create(workflow);
        spinner.succeed(`${icons.check} Workflow "${name}" created with ${steps.length} step(s)`);
        console.log(chalk.gray(`   ID: ${workflow.id}`));
        console.log(chalk.gray(`   Trigger: ${options.trigger}`));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to create workflow`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('list')
    .description('List all workflows')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora(`${icons.list} Loading workflows...`).start();
      try {
        const workflows = await workflowEngine.list();
        spinner.stop();

        if (workflows.length === 0) {
          console.log(chalk.yellow('\n⚠️  No workflows found.\n'));
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(workflows, null, 2));
          return;
        }

        console.log(chalk.blue.bold(`\n${icons.list} Workflows (${workflows.length})\n`));
        console.log(chalk.gray('─'.repeat(80)));

        for (const wf of workflows) {
          const statusIcon = wf.status === 'active' ? chalk.green(icons.check) :
                             wf.status === 'paused' ? chalk.yellow(icons.warning) :
                             chalk.gray(icons.refresh);
          
          console.log(`${statusIcon} ${chalk.bold(wf.name)} ${chalk.gray(`[${wf.id}]`)}`);
          console.log(chalk.gray(`   Steps: ${wf.steps.length} | Trigger: ${wf.trigger.type} | Runs: ${wf.metadata.runCount}`));
          console.log(chalk.gray(`   Success Rate: ${wf.metadata.successRate.toFixed(1)}% | Avg: ${wf.metadata.avgDurationMs.toFixed(0)}ms`));
          console.log('');
        }
        console.log(chalk.gray('─'.repeat(80)));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to list workflows`);
      }
    })
  )
  .addCommand(new Command('run')
    .description('Execute a workflow')
    .argument('<id>', 'Workflow ID')
    .option('-i, --input <json>', 'Input variables as JSON', '{}')
    .action(async (id, options) => {
      const spinner = ora(`${icons.refresh} Running workflow "${id}"...`).start();
      try {
        let input = {};
        try {
          input = JSON.parse(options.input);
        } catch {
          spinner.fail(`${icons.x} Invalid JSON input`);
          process.exit(1);
        }

        const run = await workflowEngine.run(id, input);
        
        if (run.status === 'completed') {
          spinner.succeed(`${icons.check} Workflow completed successfully!`);
        } else {
          spinner.fail(`${icons.x} Workflow ${run.status}`);
        }

        console.log(chalk.gray('\n' + '─'.repeat(60)));
        console.log(chalk.white.bold('Run Details:'));
        console.log(chalk.gray(`   Run ID:      ${run.id}`));
        console.log(chalk.gray(`   Status:      ${run.status}`));
        console.log(chalk.gray(`   Duration:    ${new Date(run.completedAt || '').getTime() - new Date(run.startedAt).getTime()}ms`));
        console.log(chalk.gray(`   Cost:        $${run.totalCost.toFixed(4)}`));
        console.log(chalk.gray(`   Tokens:      ${run.totalTokens}`));
        console.log(chalk.gray(`   Steps:       ${run.stepResults.length}`));
        console.log(chalk.gray('─'.repeat(60)));

        console.log(chalk.white.bold('\nStep Results:'));
        for (const step of run.stepResults) {
          const icon = step.status === 'completed' ? chalk.green(icons.check) :
                       step.status === 'failed' ? chalk.red(icons.x) :
                       step.status === 'skipped' ? chalk.yellow(icons.warning) :
                       icons.refresh;
          console.log(`  ${icon} ${step.stepId}: ${step.status}`);
          if (step.error) console.log(chalk.red(`     Error: ${step.error}`));
        }
        console.log('');
      } catch (error) {
        spinner.fail(`${icons.x} Workflow execution failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('info')
    .description('Show workflow details')
    .argument('<id>', 'Workflow ID')
    .action(async (id) => {
      const workflow = await workflowEngine.get(id);
      if (!workflow) {
        console.error(chalk.red(`${icons.x} Workflow "${id}" not found`));
        process.exit(1);
      }

      console.log(chalk.blue.bold(`\n${icons.info} Workflow: ${workflow.name}\n`));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.white(`   ID:          ${workflow.id}`));
      console.log(chalk.white(`   Status:      ${workflow.status}`));
      console.log(chalk.white(`   Trigger:     ${workflow.trigger.type}`));
      console.log(chalk.white(`   Steps:       ${workflow.steps.length}`));
      console.log(chalk.white(`   Runs:        ${workflow.metadata.runCount}`));
      console.log(chalk.white(`   Success:     ${workflow.metadata.successRate.toFixed(1)}%`));
      console.log(chalk.white(`   Avg Time:    ${workflow.metadata.avgDurationMs.toFixed(0)}ms`));
      console.log(chalk.gray('─'.repeat(60)));
      
      console.log(chalk.white.bold('\nSteps:'));
      workflow.steps.forEach((step, idx) => {
        console.log(chalk.gray(`  ${idx + 1}. [${step.type}] ${step.name}`));
      });
      console.log('');
    })
  )
  .addCommand(new Command('delete')
    .description('Delete a workflow')
    .argument('<id>', 'Workflow ID')
    .action(async (id) => {
      const { confirm } = await inquirer.prompt([
        { type: 'confirm', name: 'confirm', message: `${icons.warning} Delete workflow "${id}"?`, default: false },
      ]);
      if (!confirm) return;

      const deleted = await workflowEngine.delete(id);
      if (deleted) {
        console.log(chalk.green(`${icons.check} Workflow deleted`));
      } else {
        console.log(chalk.red(`${icons.x} Workflow not found`));
      }
    })
  );
