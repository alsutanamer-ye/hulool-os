import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { generateAgentId, saveAgent, agentExists } from '../../utils/agent-utils.js';
import { AVAILABLE_MODELS, COMMON_ROLES, type Agent } from '../../types/agent.js';

export const agentCreateCommand = new Command('create')
  .description('Create a new AI agent')
  .option('-n, --name <name>', 'Agent name')
  .option('-r, --role <role>', 'Agent role')
  .option('-m, --model <model>', 'LLM model')
  .option('-b, --budget <budget>', 'Monthly budget in USD', '100')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🤖 Create New AI Agent\n'));

    let name: string;
    let roleValue: string;
    let systemPrompt: string;
    let model: string;
    let budget: number;
    let skills: string[];

    if (options.name && options.role && options.model && options.yes) {
      name = options.name;
      roleValue = options.role;
      systemPrompt = `You are a ${options.role}.`;
      model = options.model;
      budget = parseFloat(options.budget);
      skills = [];
    } else {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: '📛 Agent name:',
          default: options.name,
          validate: (input) => input.length > 0 || 'Name is required',
        },
        {
          type: 'list',
          name: 'rolePreset',
          message: '🎭 Select a role:',
          choices: COMMON_ROLES,
        },
        {
          type: 'input',
          name: 'customPrompt',
          message: '✏️  Custom system prompt:',
          when: (ans) => ans.rolePreset === 'custom',
        },
        {
          type: 'list',
          name: 'model',
          message: '🧠 Select LLM model:',
          choices: AVAILABLE_MODELS,
          default: 'gpt-4',
        },
        {
          type: 'number',
          name: 'budget',
          message: '💰 Monthly budget (USD):',
          default: parseFloat(options.budget) || 100,
          validate: (input) => input > 0 || 'Budget must be greater than 0',
        },
        {
          type: 'input',
          name: 'skills',
          message: '🛠️  Skills (comma-separated):',
        },
      ]);

      name = answers.name;
      roleValue = answers.rolePreset;
      
      if (roleValue === 'custom') {
        systemPrompt = answers.customPrompt || 'You are a helpful assistant.';
      } else {
        const roleObj = COMMON_ROLES.find(r => r.value === roleValue);
        systemPrompt = roleObj?.prompt || `You are a ${roleValue}.`;
      }
      
      model = answers.model;
      budget = answers.budget;
      skills = answers.skills
        ? answers.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
    }

    const id = generateAgentId(name);
    const spinner = ora('Creating agent...').start();

    try {
      if (await agentExists(id)) {
        spinner.fail(`Agent with id "${id}" already exists`);
        process.exit(1);
      }

      const now = new Date().toISOString();
      const agent: Agent = {
        id,
        name,
        role: roleValue,
        model,
        systemPrompt,
        budget: { monthly: budget, used: 0 },
        status: 'inactive',
        skills,
        tools: [],
        maxConcurrentTasks: 2,
        createdAt: now,
        updatedAt: now,
      };

      const filePath = await saveAgent(agent);
      spinner.succeed('Agent created successfully!');

      console.log(chalk.green.bold('\n✅ Agent Details:\n'));
      console.log(chalk.white('   📛 Name:     '), chalk.cyan(agent.name));
      console.log(chalk.white('   🆔 ID:       '), chalk.gray(agent.id));
      console.log(chalk.white('   🎭 Role:     '), chalk.cyan(agent.role));
      console.log(chalk.white('   🧠 Model:    '), chalk.cyan(agent.model));
      console.log(chalk.white('   💰 Budget:   '), chalk.green(`$${agent.budget.monthly}/month`));
      console.log(chalk.white('   📊 Status:   '), chalk.yellow(agent.status));
      console.log(chalk.white('   📁 Saved to: '), chalk.gray(filePath));
      console.log('');
    } catch (err) {
      spinner.fail('Failed to create agent');
      console.error(chalk.red('Error:'), err);
      process.exit(1);
    }
  });
