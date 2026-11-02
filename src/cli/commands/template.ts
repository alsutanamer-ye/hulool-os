import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { templateManager } from '../../utils/template-manager.js';
import { icons } from '../../utils/icons.js';
import type { TemplateType } from '../../types/template.js';

export const templateCommand = new Command('template')
  .description('Manage unified template library (prompts, tools, skills, plugins, modules)')
  .addCommand(new Command('list')
    .description('List all available templates')
    .option('-t, --type <type>', 'Filter by type (prompt, tool, skill, plugin, module)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora(`${icons.list} Loading templates...`).start();
      
      try {
        const templates = await templateManager.listTemplates(options.type);
        spinner.stop();

        if (templates.length === 0) {
          console.log(chalk.yellow('\n⚠️  No templates found.\n'));
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(templates, null, 2));
          return;
        }

        console.log(chalk.blue.bold(`\n${icons.list} Template Library (${templates.length} templates)\n`));
        console.log(chalk.gray('─'.repeat(80)));

        // تجميع حسب النوع
        const grouped = templates.reduce((acc, t) => {
          if (!acc[t.type]) acc[t.type] = [];
          acc[t.type].push(t);
          return acc;
        }, {} as Record<string, typeof templates>);

        for (const [type, typeTemplates] of Object.entries(grouped)) {
          console.log(chalk.cyan.bold(`\n📦 ${type.toUpperCase()}S (${typeTemplates.length})`));
          console.log(chalk.gray('─'.repeat(80)));

          for (const template of typeTemplates) {
            console.log(chalk.white(`  ${icons.check} ${chalk.bold(template.name)} ${chalk.gray(`v${template.metadata.version}`)}`));
            console.log(chalk.gray(`    ${template.description}`));
            console.log(chalk.gray(`    Tags: ${template.tags.join(', ')}`));
            console.log(chalk.gray(`    Downloads: ${template.metadata.downloads}`));
          }
        }

        console.log(chalk.gray('\n' + '─'.repeat(80)));
        console.log(chalk.white(`Total: ${chalk.cyan(templates.length)} template(s)\n`));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to load templates`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('search')
    .description('Search templates by name, description, or tags')
    .argument('<query>', 'Search query')
    .option('-t, --type <type>', 'Filter by type')
    .action(async (query, options) => {
      const spinner = ora(`${icons.refresh} Searching...`).start();
      
      try {
        const results = await templateManager.searchTemplates(query, options.type);
        spinner.stop();

        if (results.length === 0) {
          console.log(chalk.yellow(`\n⚠️  No templates found for "${query}".\n`));
          return;
        }

        console.log(chalk.blue.bold(`\n🔍 Search Results for "${query}" (${results.length} found)\n`));

        for (const template of results) {
          console.log(chalk.white(`  ${icons.check} ${chalk.bold(template.name)} ${chalk.gray(`[${template.type}]`)}`));
          console.log(chalk.gray(`    ${template.description}`));
        }

        console.log('');
      } catch (error) {
        spinner.fail(`${icons.x} Search failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('install')
    .description('Install a template from a file or URL')
    .argument('<path-or-url>', 'Path to template JSON file or URL')
    .option('--force', 'Overwrite if exists')
    .action(async (pathOrUrl, options) => {
      const spinner = ora(`${icons.refresh} Installing template...`).start();
      
      try {
        // تحميل القالب من الملف
        let templateData;
        
        if (pathOrUrl.startsWith('http')) {
          // تحميل من URL (مستقبلاً)
          throw new Error('URL installation not yet implemented. Use local file path.');
        } else {
          const content = await import('fs/promises').then(fs => fs.readFile(pathOrUrl, 'utf-8'));
          templateData = JSON.parse(content);
        }

        await templateManager.installTemplate(templateData);
        spinner.succeed(`${icons.check} Template "${templateData.name}" installed successfully!`);
      } catch (error) {
        spinner.fail(`${icons.x} Installation failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('uninstall')
    .description('Remove a template')
    .argument('<id>', 'Template ID')
    .option('-t, --type <type>', 'Template type')
    .action(async (id, options) => {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `${icons.warning} Uninstall template "${id}"?`,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Cancelled.'));
        return;
      }

      const spinner = ora(`${icons.trash} Uninstalling...`).start();
      
      try {
        await templateManager.uninstallTemplate(id, options.type);
        spinner.succeed(`${icons.check} Template "${id}" uninstalled.`);
      } catch (error) {
        spinner.fail(`${icons.x} Uninstall failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('create')
    .description('Create a new template interactively')
    .action(async () => {
      console.log(chalk.blue.bold('\n📝 Create New Template\n'));

      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: 'Select template type:',
          choices: [
            { name: '📝 Prompt', value: 'prompt' },
            { name: '🔧 Tool', value: 'tool' },
            { name: '💡 Skill', value: 'skill' },
            { name: '🔌 Plugin', value: 'plugin' },
            { name: '📦 Module', value: 'module' },
          ],
        },
        {
          type: 'input',
          name: 'name',
          message: 'Template name:',
          validate: (input) => input.length > 0 || 'Name is required',
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description:',
        },
        {
          type: 'input',
          name: 'tags',
          message: 'Tags (comma-separated):',
        },
      ]);

      // إنشاء القالب بناءً على النوع
      let config = {};

      if (answers.type === 'prompt') {
        const promptAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'systemPrompt',
            message: 'System prompt:',
            validate: (input) => input.length > 0 || 'System prompt is required',
          },
          {
            type: 'list',
            name: 'model',
            message: 'Default model:',
            choices: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'],
          },
        ]);
        config = promptAnswers;
      }

      const template = {
        id: `${answers.type}-${answers.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: answers.name,
        type: answers.type,
        description: answers.description,
        tags: answers.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        config,
        dependencies: [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          author: 'user',
          license: 'MIT',
          downloads: 0,
        },
      };

      const spinner = ora(`${icons.refresh} Creating template...`).start();
      
      try {
        await templateManager.installTemplate(template);
        spinner.succeed(`${icons.check} Template "${template.name}" created successfully!`);
        console.log(chalk.gray(`   ID: ${template.id}`));
      } catch (error) {
        spinner.fail(`${icons.x} Creation failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('export')
    .description('Export an agent as a prompt template')
    .argument('<agent-id>', 'Agent ID to export')
    .action(async (agentId) => {
      const spinner = ora(`${icons.refresh} Exporting agent as template...`).start();
      
      try {
        const template = await templateManager.createTemplateFromAgent(agentId);
        await templateManager.installTemplate(template);
        spinner.succeed(`${icons.check} Agent "${agentId}" exported as template "${template.id}"`);
      } catch (error) {
        spinner.fail(`${icons.x} Export failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  );

// إضافة أوامر apply و create-agent
import { templateApplyCommand } from './template-apply.js';
import { templateCreateAgentCommand } from './template-create-agent.js';

templateCommand.addCommand(templateApplyCommand);
templateCommand.addCommand(templateCreateAgentCommand);
