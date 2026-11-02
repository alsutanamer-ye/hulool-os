import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { icons } from '../../utils/icons.js';
import type { PluginManifest } from '../../types/plugin.js';

const PLUGINS_DIR = path.join(process.cwd(), '.hulool', 'plugins-marketplace');

export const pluginCommand = new Command('plugin')
  .description('Manage Hulool OS plugins (create, verify, publish)')
  .addCommand(new Command('create')
    .description('Scaffold a new plugin project')
    .action(async () => {
      console.log(chalk.blue.bold('\n🛠️  Create New Plugin\n'));

      const answers = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Plugin Name:', validate: i => i.length > 0 },
        { type: 'input', name: 'id', message: 'Plugin ID (e.g., com.mycompany.plugin):', validate: i => i.includes('.') },
        { type: 'input', name: 'description', message: 'Description:' },
        { type: 'input', name: 'version', message: 'Version:', default: '1.0.0' },
        { type: 'input', name: 'authorName', message: 'Author Name:' },
        { type: 'input', name: 'authorEmail', message: 'Author Email:' },
        { 
          type: 'list', 
          name: 'category', 
          message: 'Category:', 
          choices: ['utility', 'integration', 'ai', 'analytics', 'security'] 
        },
        { type: 'input', name: 'icon', message: 'Icon (Lucide name):', default: 'plug' },
      ]);

      const manifest: PluginManifest = {
        id: answers.id,
        name: answers.name,
        description: answers.description,
        version: answers.version,
        author: { name: answers.authorName, email: answers.authorEmail },
        icon: answers.icon,
        category: answers.category as any,
        entryPoint: 'index.js',
        dependencies: {},
        minHuloolVersion: '1.0.0',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const pluginDir = path.join(process.cwd(), answers.id);
      await fs.mkdir(pluginDir, { recursive: true });
      
      // إنشاء ملف manifest.json
      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      // إنشاء ملف index.js فارغ
      await fs.writeFile(
        path.join(pluginDir, 'index.js'),
        `// Entry point for ${answers.name}\nexport function init(config) {\n  console.log('${answers.name} initialized');\n}\n`
      );

      console.log(chalk.green(`\n✅ Plugin scaffolded in ./\${answers.id}`));
      console.log(chalk.gray('   Next steps:'));
      console.log(chalk.gray(`   1. cd ${answers.id}`));
      console.log(chalk.gray('   2. Implement your logic in index.js'));
      console.log(chalk.gray('   3. Run: hulool plugin verify'));
    })
  )
  .addCommand(new Command('verify')
    .description('Verify plugin manifest and structure')
    .action(async () => {
      const spinner = ora(`${icons.refresh} Verifying plugin...`).start();
      
      try {
        const manifestPath = path.join(process.cwd(), 'manifest.json');
        if (!await fs.access(manifestPath).then(() => true).catch(() => false)) {
          throw new Error('manifest.json not found in current directory');
        }

        const content = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(content) as PluginManifest;

        // فحوصات أساسية
        if (!manifest.id || !manifest.name || !manifest.version) {
          throw new Error('Missing required fields: id, name, version');
        }
        
        if (!manifest.author?.email) {
          throw new Error('Missing author email');
        }

        // تحديث الحالة
        manifest.status = 'verified';
        manifest.updatedAt = new Date().toISOString();
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

        spinner.succeed(`${icons.check} Plugin verified successfully!`);
        console.log(chalk.gray(`   ID:      ${manifest.id}`));
        console.log(chalk.gray(`   Version: ${manifest.version}`));
        console.log(chalk.gray(`   Status:  ${manifest.status}`));
      } catch (error: any) {
        spinner.fail(`${icons.x} Verification failed`);
        console.error(chalk.red(error.message));
      }
    })
  )
  .addCommand(new Command('publish')
    .description('Publish plugin to local marketplace for installation')
    .action(async () => {
      const spinner = ora(`${icons.refresh} Publishing to marketplace...`).start();
      
      try {
        const manifestPath = path.join(process.cwd(), 'manifest.json');
        if (!await fs.access(manifestPath).then(() => true).catch(() => false)) {
          throw new Error('Run this command inside a plugin directory with manifest.json');
        }

        const content = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(content) as PluginManifest;

        if (manifest.status !== 'verified') {
          throw new Error('Plugin must be verified before publishing. Run: hulool plugin verify');
        }

        // نسخ إلى مجلد السوق المحلي
        await fs.mkdir(PLUGINS_DIR, { recursive: true });
        const targetDir = path.join(PLUGINS_DIR, manifest.id);
        
        // نسخ الملفات
        await fs.cp(process.cwd(), targetDir, { recursive: true });
        
        // تحديث الحالة إلى published
        manifest.status = 'published';
        await fs.writeFile(
          path.join(targetDir, 'manifest.json'),
          JSON.stringify(manifest, null, 2)
        );

        spinner.succeed(`${icons.check} Plugin published to local marketplace!`);
        console.log(chalk.gray(`   Location: ${targetDir}`));
        console.log(chalk.yellow('\n   Note: In production, this would upload to a central registry.'));
      } catch (error: any) {
        spinner.fail(`${icons.x} Publish failed`);
        console.error(chalk.red(error.message));
      }
    })
  );

// إضافة أوامر التثبيت والإدارة
import { pluginLoader } from '../../core/plugins/loader.js';

pluginCommand
  .addCommand(new Command('install')
    .description('Install a plugin from marketplace')
    .argument('<id>', 'Plugin ID')
    .action(async (id) => {
      const spinner = ora(`${icons.refresh} Installing plugin "${id}"...`).start();
      try {
        await pluginLoader.install(id);
        spinner.succeed(`${icons.check} Plugin "${id}" installed successfully`);
        console.log(chalk.yellow('   Note: Plugin is disabled by default. Configure and activate it in Dashboard.'));
      } catch (error: any) {
        spinner.fail(`${icons.x} Installation failed`);
        console.error(chalk.red(error.message));
      }
    })
  )
  .addCommand(new Command('list')
    .description('List available or installed plugins')
    .option('--installed', 'Show only installed plugins')
    .action(async (options) => {
      if (options.installed) {
        const installed = await pluginLoader.getInstalled();
        console.log(chalk.blue.bold('\n📦 Installed Plugins\n'));
        if (installed.length === 0) {
          console.log(chalk.yellow('   No plugins installed.'));
        } else {
          installed.forEach(p => {
            const status = p.isActive ? chalk.green('Active') : chalk.gray('Disabled');
            console.log(`   ${icons.check} ${p.name} (${p.id}) - v${p.version} [${status}]`);
          });
        }
      } else {
        // عرض السوق المحلي
        const marketplaceDir = path.join(process.cwd(), '.hulool', 'plugins-marketplace');
        try {
          const dirs = await fs.readdir(marketplaceDir);
          console.log(chalk.blue.bold('\n🏪 Local Marketplace\n'));
          if (dirs.length === 0) {
            console.log(chalk.yellow('   No plugins published yet.'));
          } else {
            for (const dir of dirs) {
              const manifestPath = path.join(marketplaceDir, dir, 'manifest.json');
              const content = await fs.readFile(manifestPath, 'utf-8');
              const m = JSON.parse(content) as PluginManifest;
              console.log(`   ${icons.plus} ${m.name} (${m.id}) - v${m.version}`);
              console.log(chalk.gray(`      ${m.description}`));
            }
          }
        } catch {
          console.log(chalk.yellow('   Marketplace not initialized.'));
        }
      }
    })
  );
