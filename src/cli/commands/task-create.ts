import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import {
  generateTaskId,
  saveTask,
  taskExists,
} from '../../utils/task-utils.js';
import { loadAgent, agentExists } from '../../utils/agent-utils.js';
import type { Task } from '../../types/task.js';
import { TASK_PRIORITIES } from '../../types/task.js';
import { icons } from '../../utils/icons.js';

export const taskCreateCommand = new Command('create')
  .description('Create a new task')
  .option('-a, --agent <id>', 'Agent ID to execute the task')
  .option('-d, --description <text>', 'Task description')
  .option('-g, --goal <id>', 'Associated goal ID')
  .option('-i, --input <json>', 'Task input as JSON string')
  .option('-p, --priority <level>', 'Priority: low, medium, high, critical', 'medium')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n📋 Create New Task\n'));

    let agentId: string;
    let description: string;
    let goalId: string | undefined;
    let priority: 'low' | 'medium' | 'high' | 'critical';
    let input: Record<string, unknown> | undefined;

    if (options.agent && options.description && options.yes) {
      agentId = options.agent;
      description = options.description;
      goalId = options.goal || undefined;
      priority = (options.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium';
      input = options.input ? parseJsonInput(options.input) : undefined;
    } else {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'agentId',
          message: '🤖 Agent ID:',
          default: options.agent,
          validate: (input) => input.length > 0 || 'Agent ID is required',
        },
        {
          type: 'input',
          name: 'description',
          message: '📝 Task description:',
          default: options.description,
          validate: (input) => input.length > 0 || 'Description is required',
        },
        {
          type: 'input',
          name: 'goalId',
          message: '🎯 Goal ID (optional):',
          default: options.goal,
        },
        {
          type: 'list',
          name: 'priority',
          message: '⚡ Priority:',
          choices: Object.entries(TASK_PRIORITIES as Record<string, { label: string; color: string }>).map(
            ([key, val]) => ({
              name: `${val.label} (${key})`,
              value: key,
            }),
          ),
          default: 'medium',
        },
        {
          type: 'input',
          name: 'input',
          message: '📥 Input JSON (optional):',
          default: options.input,
        },
      ]);

      agentId = answers.agentId;
      description = answers.description;
      goalId = answers.goalId || undefined;
      priority = answers.priority as 'low' | 'medium' | 'high' | 'critical';
      input = answers.input ? parseJsonInput(answers.input) : undefined;
    }

    const id = generateTaskId(description);
    const spinner = ora('Creating task...').start();

    try {
      // التحقق من وجود المهمة مسبقاً
      if (await taskExists(id)) {
        spinner.fail(`Task with id "${id}" already exists`);
        process.exit(1);
      }

      // التحقق من وجود الوكيل
      const agentExistsResult = await agentExists(agentId);
      if (!agentExistsResult) {
        spinner.fail(`Agent "${agentId}" not found`);
        console.error(chalk.red(`\n💡 Create the agent first: hulool agent create --name "${agentId}"\n`));
        process.exit(1);
      }

      // تحميل الوكيل للتحقق من الحالة والميزانية
      const agent = await loadAgent(agentId);
      if (!agent) {
        spinner.fail(`Failed to load agent "${agentId}"`);
        process.exit(1);
      }

      // التحقق من أن الوكيل نشط
      if (agent.status !== 'active') {
        spinner.fail(`Agent "${agentId}" is not active (status: ${agent.status})`);
        console.error(chalk.red(`\n💡 Activate the agent first: hulool agent info ${agentId}\n`));
        process.exit(1);
      }

      // التحقق من الميزانية المتبقية
      const budgetRemaining = agent.budget.monthly - agent.budget.used;
      if (budgetRemaining <= 0) {
        spinner.fail(`Agent "${agentId}" has no budget remaining`);
        console.error(
          chalk.red(
            `\n💡 Budget exhausted: $${agent.budget.used.toFixed(2)} / $${agent.budget.monthly.toFixed(2)}\n   Increase the budget or delete some tasks.\n`,
          ),
        );
        process.exit(1);
      }

      const now = new Date().toISOString();
      const task: Task = {
        id,
        agentId,
        goalId,
        description,
        input,
        status: 'pending',
        priority,
        tokensUsed: 0,
        cost: 0,
        createdAt: now,
        updatedAt: now,
      };

      const filePath = await saveTask(task);
      spinner.succeed('Task created successfully!');

      console.log(chalk.green.bold('\n✅ Task Details:\n'));
      console.log(chalk.white('   🆔 ID:        '), chalk.cyan(task.id));
      console.log(chalk.white('   🤖 Agent:     '), chalk.cyan(agentId));
      console.log(chalk.white('   📝 Description:'), chalk.white(task.description));
      console.log(chalk.white('   ⚡ Priority:  '), getPriorityColor(priority)(priority.toUpperCase()));
      console.log(chalk.white('   📊 Status:    '), chalk.gray('pending'));
      console.log(chalk.white('   💰 Cost:      '), chalk.green(`$${task.cost.toFixed(4)}`));
      console.log(chalk.white('   📁 Saved to:  '), chalk.gray(filePath));
      console.log('');
    } catch (err) {
      spinner.fail('Failed to create task');
      console.error(chalk.red('Error:'), err);
      process.exit(1);
    }
  });

function parseJsonInput(input: string): Record<string, unknown> {
  try {
    return JSON.parse(input);
  } catch {
    return { raw: input };
  }
}

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
