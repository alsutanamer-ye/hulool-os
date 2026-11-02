import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';

export const initCommand = new Command('init')
  .description('Initialize a new Hulool OS project')
  .argument('<name>', 'Project name')
  .option('-t, --template <template>', 'Template to use (default, startup, content)', 'default')
  .option('-y, --yes', 'Skip prompts and use defaults', false)
  .action(async (name: string, options: { template: string; yes: boolean }) => {
    console.log(chalk.blue.bold('\n🚀 Initializing Hulool OS Project\n'));

    const projectPath = path.join(process.cwd(), name);
    const spinner = ora('Creating project structure...').start();

    try {
      // التحقق من وجود المجلد
      try {
        await fs.access(projectPath);
        spinner.fail(`Directory "${name}" already exists`);
        process.exit(1);
      } catch {
        // المجلد غير موجود، جيد
      }

      // إنشاء المجلدات
      spinner.text = 'Creating directories...';
      await fs.mkdir(projectPath, { recursive: true });
      await fs.mkdir(path.join(projectPath, 'agents'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'workflows'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'logs'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'output'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });

      // إنشاء hulool.config.json
      spinner.text = 'Creating configuration...';
      const config = {
        name,
        version: '0.1.0',
        template: options.template,
        llm: {
          provider: 'openai',
          model: 'gpt-4',
        },
        budget: {
          monthly: 100,
          alertThreshold: 80,
        },
        agents: {
          directory: './agents',
          autoStart: true,
        },
        workflows: {
          directory: './workflows',
        },
        logging: {
          level: 'info',
          directory: './logs',
        },
      };

      await fs.writeFile(
        path.join(projectPath, 'hulool.config.json'),
        JSON.stringify(config, null, 2)
      );

      // إنشاء .env
      spinner.text = 'Setting up environment...';
      const envContent = `# Hulool OS - Environment Variables
# Get your API keys from https://supabase.com

# Supabase Configuration
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DATABASE_URL=

# LLM Provider Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Node Environment
NODE_ENV=development
`;

      await fs.writeFile(path.join(projectPath, '.env'), envContent);

      // إنشاء .gitignore
      const gitignoreContent = `node_modules/
dist/
.env
.env.local
logs/
output/
*.db
*.sqlite
.DS_Store
`;

      await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);

      // إنشاء README.md
      const readmeContent = `# ${name}

AI-powered company built with Hulool OS.

## Getting Started

1. Configure your environment:
   \`\`\`bash
   nano .env
   \`\`\`

2. Create your first agent:
   \`\`\`bash
   hulool agent create
   \`\`\`

3. Start the server:
   \`\`\`bash
   hulool start
   \`\`\`

## Project Structure

\`\`\`
${name}/
├── agents/          # Agent definitions
├── workflows/       # Workflow definitions
├── logs/            # Execution logs
├── output/          # Task outputs
├── hulool.config.json  # Project configuration
└── .env             # Environment variables
\`\`\`
`;

      await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent);

      // إنشاء package.json
      const packageJson = {
        name,
        version: '1.0.0',
        description: `AI-powered company built with Hulool OS`,
        type: 'module',
        scripts: {
          start: 'hulool start',
          dev: 'hulool start --watch',
          'agent:create': 'hulool agent create',
          'agent:list': 'hulool agent list',
        },
        keywords: ['hulool', 'ai', 'agents'],
        author: '',
        license: 'MIT',
      };

      await fs.writeFile(
        path.join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      spinner.succeed('Project created successfully!');

      console.log(chalk.green.bold('\n✅ Project initialized successfully!\n'));
      console.log(chalk.white('📁 Project location:'), chalk.cyan(projectPath));
      console.log(chalk.white('📦 Template:'), chalk.cyan(options.template));
      console.log('');
      console.log(chalk.yellow('📝 Next steps:'));
      console.log(chalk.gray(`   1. cd ${name}`));
      console.log(chalk.gray('   2. Edit .env and add your API keys'));
      console.log(chalk.gray('   3. hulool agent create'));
      console.log(chalk.gray('   4. hulool start'));
      console.log('');
    } catch (err) {
      spinner.fail('Failed to create project');
      console.error(chalk.red('Error:'), err);
      process.exit(1);
    }
  });
