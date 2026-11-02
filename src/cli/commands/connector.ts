import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { connectorManager } from '../../core/connectors/index.js';
import { icons } from '../../utils/icons.js';

export const connectorCommand = new Command('connector')
  .description('Manage external service connectors (Slack, GitHub, Web Search, etc.)')
  .addCommand(new Command('list')
    .description('List all available connectors and their status')
    .action(async () => {
      const spinner = ora(`${icons.list} Loading connectors...`).start();
      try {
        const connectors = await Promise.all(connectorManager.listConnectors().map(async c => ({
          ...c,
          status: await c.status
        })));
        spinner.stop();

        console.log(chalk.blue.bold(`\n${icons.list} Available Connectors\n`));
        console.log(chalk.gray('─'.repeat(80)));

        for (const c of connectors) {
          const statusIcon = c.status === 'connected' ? chalk.green(icons.check) : 
                             c.status === 'error' ? chalk.red(icons.x) : chalk.yellow(icons.warning);
          
          console.log(`${statusIcon} ${chalk.bold(c.name)} ${chalk.gray(`(${c.id})`)}`);
          console.log(chalk.gray(`   ${c.description}`));
          console.log(chalk.gray(`   Status: ${c.status}`));
          console.log('');
        }
        console.log(chalk.gray('─'.repeat(80)));
        console.log(chalk.white(`Tip: Use ${chalk.cyan('hulool connector auth <id>')} to configure a connector.\n`));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to load connectors`);
      }
    })
  )
  .addCommand(new Command('auth')
    .description('Authenticate and configure a connector')
    .argument('<id>', 'Connector ID (e.g., slack, web-search)')
    .action(async (id) => {
      const connector = connectorManager.getConnector(id);
      if (!connector) {
        console.error(chalk.red(`${icons.x} Connector "${id}" not found.`));
        process.exit(1);
      }

      console.log(chalk.blue.bold(`\n🔐 Configure ${connector.name}\n`));
      console.log(chalk.gray(`Required credentials: ${connector.requiredEnvVars.join(', ')}\n`));

      const credentials: Record<string, string> = {};
      for (const envVar of connector.requiredEnvVars) {
        const answer = await inquirer.prompt([{
          type: 'password',
          name: 'value',
          message: `Enter ${envVar}:`,
          validate: (input) => input.length > 0 || 'Value cannot be empty'
        }]);
        credentials[envVar] = answer.value;
      }

      const spinner = ora(`${icons.refresh} Authenticating...`).start();
      try {
        const success = await connectorManager.configure(id, credentials);
        if (success) {
          spinner.succeed(`${icons.check} Connector "${id}" configured and authenticated successfully!`);
        } else {
          spinner.fail(`${icons.x} Authentication failed. Please check your credentials.`);
        }
      } catch (error) {
        spinner.fail(`${icons.x} Configuration failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('test')
    .description('Test a connector execution')
    .argument('<id>', 'Connector ID')
    .argument('<action>', 'Action to test (e.g., search, send_message)')
    .option('-p, --params <json>', 'JSON parameters for the action', '{}')
    .action(async (id, action, options) => {
      const spinner = ora(`${icons.refresh} Testing connector "${id}"...`).start();
      try {
        let params = {};
        try {
          params = JSON.parse(options.params);
        } catch {
          throw new Error('Invalid JSON in --params');
        }

        const result = await connectorManager.execute(id, action, params);
        
        if (result.success) {
          spinner.succeed(`${icons.check} Execution successful!`);
          console.log(chalk.gray('\n' + '─'.repeat(60)));
          console.log(chalk.cyan(JSON.stringify(result.data, null, 2)));
          console.log(chalk.gray('─'.repeat(60) + '\n'));
        } else {
          spinner.fail(`${icons.x} Execution failed`);
          console.error(chalk.red(`Error: ${result.error}\n`));
        }
      } catch (error) {
        spinner.fail(`${icons.x} Test failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  );
