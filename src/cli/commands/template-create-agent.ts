import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { templateManager } from '../../utils/template-manager.js';
import { icons } from '../../utils/icons.js';

export const templateCreateAgentCommand = new Command('create-agent')
  .description('Create a new agent from a prompt template')
  .argument('<template-id>', 'Template ID to use')
  .argument('<agent-name>', 'Name for the new agent')
  .option('-b, --budget <budget>', 'Monthly budget in USD', '100')
  .action(async (templateId, agentName, options) => {
    console.log(chalk.blue.bold(`\n🤖 Creating agent "${agentName}" from template "${templateId}"\n`));

    const spinner = ora(`${icons.refresh} Creating agent...`).start();

    try {
      const agentId = await templateManager.createAgentFromTemplate(templateId, agentName);
      
      // تحديث الميزانية إذا تم تحديدها
      if (options.budget) {
        const { loadAgent, saveAgent } = await import('../../utils/agent-utils.js');
        const agent = await loadAgent(agentId);
        if (agent) {
          agent.budget.monthly = parseFloat(options.budget);
          await saveAgent(agent);
        }
      }

      spinner.succeed(`${icons.check} Agent created successfully!`);

      console.log(chalk.green.bold('\n✅ Agent Details:'));
      console.log(chalk.gray(`   ID: ${agentId}`));
      console.log(chalk.gray(`   Name: ${agentName}`));
      console.log(chalk.gray(`   Template: ${templateId}`));
      console.log(chalk.gray(`   Budget: $${options.budget}/month`));
      console.log('');
      console.log(chalk.yellow('📝 Next steps:'));
      console.log(chalk.gray(`   hulool agent info ${agentId}`));
      console.log(chalk.gray(`   hulool agent start ${agentId}`));
      console.log('');
    } catch (error) {
      spinner.fail(`${icons.x} Failed to create agent`);
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });
