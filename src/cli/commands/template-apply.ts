import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { templateManager } from '../../utils/template-manager.js';
import { validateTemplateForAgent } from '../../utils/template-compatibility.js';
import { loadAgent } from '../../utils/agent-utils.js';
import { icons } from '../../utils/icons.js';

export const templateApplyCommand = new Command('apply')
  .description('Apply a prompt template to an existing agent')
  .argument('<template-id>', 'Template ID to apply')
  .argument('<agent-id>', 'Agent ID to update')
  .option('--force', 'Skip compatibility warnings')
  .action(async (templateId, agentId, options) => {
    console.log(chalk.blue.bold(`\n🔧 Applying template "${templateId}" to agent "${agentId}"\n`));

    const spinner = ora(`${icons.refresh} Checking compatibility...`).start();

    try {
      // تحميل القالب والوكيل
      const templates = await templateManager.listTemplates('prompt');
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        spinner.fail(`${icons.x} Template "${templateId}" not found.`);
        process.exit(1);
      }

      const agent = await loadAgent(agentId);
      if (!agent) {
        spinner.fail(`${icons.x} Agent "${agentId}" not found.`);
        process.exit(1);
      }

      // التحقق من التوافق
      const compatibility = validateTemplateForAgent(template, agent);

      if (!compatibility.compatible) {
        spinner.fail(`${icons.x} Template is not compatible with agent.`);
        console.log(chalk.red('\nErrors:'));
        compatibility.errors.forEach(err => console.log(chalk.red(`  • ${err}`)));
        process.exit(1);
      }

      // عرض التحذيرات
      if (compatibility.warnings.length > 0 && !options.force) {
        spinner.warn(`${icons.warning} Compatibility warnings found.`);
        console.log(chalk.yellow('\nWarnings:'));
        compatibility.warnings.forEach(warn => console.log(chalk.yellow(`  • ${warn}`)));

        if (compatibility.suggestions.length > 0) {
          console.log(chalk.blue('\nSuggestions:'));
          compatibility.suggestions.forEach(sug => console.log(chalk.blue(`  • ${sug}`)));
        }

        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Continue anyway?',
            default: false,
          },
        ]);

        if (!proceed) {
          console.log(chalk.yellow('\nOperation cancelled.'));
          return;
        }
      } else {
        spinner.succeed(`${icons.check} Template is compatible with agent.`);
      }

      // تطبيق القالب
      const applySpinner = ora(`${icons.refresh} Applying template...`).start();
      await templateManager.applyTemplateToAgent(templateId, agentId);
      applySpinner.succeed(`${icons.check} Template applied successfully!`);

      console.log(chalk.green.bold('\n✅ Agent updated:'));
      console.log(chalk.gray(`   System Prompt: ${agent.systemPrompt.substring(0, 100)}...`));
      console.log(chalk.gray(`   Model: ${template.config.model || agent.model}`));
      console.log('');
    } catch (error) {
      spinner.fail(`${icons.x} Failed to apply template`);
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });
