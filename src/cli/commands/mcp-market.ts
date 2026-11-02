import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { mcpMarketplaceManager } from '../../utils/mcp-marketplace.js';
import { icons } from '../../utils/icons.js';

export const mcpMarketCommand = new Command('market')
  .description('Manage MCP Tools Marketplace')
  .addCommand(new Command('list')
    .description('List all available tools in the marketplace')
    .option('--installed', 'Show only installed tools')
    .action(async (options) => {
      const spinner = ora(`${icons.list} Loading marketplace...`).start();
      try {
        let tools;
        if (options.installed) {
          tools = await mcpMarketplaceManager.getInstalledTools();
        } else {
          tools = await mcpMarketplaceManager.getAvailableTools();
        }
        spinner.stop();

        if (tools.length === 0) {
          console.log(chalk.yellow(`\n⚠️  No tools found.\n`));
          return;
        }

        console.log(chalk.blue.bold(`\n${icons.list} MCP Marketplace (${tools.length} tools)\n`));
        console.log(chalk.gray('─'.repeat(80)));

        for (const tool of tools) {
          const isInstalled = 'installedAt' in tool;
          const statusIcon = isInstalled 
            ? chalk.green(icons.check) 
            : chalk.gray(icons.refresh);
          
          console.log(`${statusIcon} ${chalk.bold(tool.name)} ${chalk.gray(`[${tool.category}] v${tool.version}`)}`);
          console.log(chalk.gray(`   ${tool.description}`));
          if (tool.envVars && tool.envVars.length > 0) {
            console.log(chalk.yellow(`   Requires: ${tool.envVars.join(', ')}`));
          }
          console.log('');
        }
        console.log(chalk.gray('─'.repeat(80)));
        console.log(chalk.white(`Tip: Use ${chalk.cyan('hulool mcp market install <id>')} to install a tool.\n`));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to load marketplace`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('install')
    .description('Install an MCP tool from the marketplace')
    .argument('<id>', 'Tool ID to install')
    .action(async (id) => {
      const spinner = ora(`${icons.refresh} Installing tool "${id}"...`).start();
      try {
        const tool = await mcpMarketplaceManager.installTool(id);
        spinner.succeed(`${icons.check} Tool "${tool.name}" installed successfully!`);
        
        if (tool.envVars && tool.envVars.length > 0) {
          console.log(chalk.yellow(`\n⚠️  This tool requires the following environment variables:`));
          tool.envVars.forEach(env => console.log(chalk.gray(`   • ${env}`)));
          console.log(chalk.gray(`   Please set them before using the tool.\n`));
        }
      } catch (error) {
        spinner.fail(`${icons.x} Installation failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('uninstall')
    .description('Uninstall an MCP tool')
    .argument('<id>', 'Tool ID to uninstall')
    .action(async (id) => {
      const spinner = ora(`${icons.trash} Uninstalling tool "${id}"...`).start();
      try {
        await mcpMarketplaceManager.uninstallTool(id);
        spinner.succeed(`${icons.check} Tool "${id}" uninstalled successfully.`);
      } catch (error) {
        spinner.fail(`${icons.x} Uninstallation failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('config')
    .description('Generate MCP client configuration (e.g., for Claude Desktop)')
    .action(async () => {
      const spinner = ora(`${icons.refresh} Generating configuration...`).start();
      try {
        const config = await mcpMarketplaceManager.generateMcpClientConfig();
        spinner.stop();

        console.log(chalk.blue.bold('\n📋 MCP Client Configuration\n'));
        console.log(chalk.gray('Add this to your Claude Desktop config or MCP client:'));
        console.log(chalk.gray('─'.repeat(80)));
        console.log(chalk.cyan(JSON.stringify(config, null, 2)));
        console.log(chalk.gray('─'.repeat(80)));
        console.log(chalk.yellow('\n⚠️  Remember to replace "YOUR_..._HERE" with your actual API keys.\n'));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to generate config`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  );
