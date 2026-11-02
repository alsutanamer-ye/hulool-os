import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { setSecret, getSecret, listSecrets, deleteSecret } from '../../utils/vault.js';
import { icons, colors } from '../../utils/icons.js';

export const secretsCommand = new Command('secrets')
  .description('Manage encrypted secrets securely')
  .addCommand(new Command('set')
    .description('Add or update an encrypted secret')
    .argument('<key>', 'Secret name (e.g., DATABASE_URL)')
    .option('-v, --value <value>', 'Secret value')
    .action(async (key, options) => {
      let value = options.value;
      if (!value) {
        const answers = await inquirer.prompt([{
          type: 'password',
          name: 'value',
          message: `Enter value for ${chalk.cyan(key)}:`,
          validate: (input) => input.length > 0 || 'Value cannot be empty'
        }]);
        value = answers.value;
      }

      const spinner = ora(`${icons.lock} Encrypting and saving...`).start();
      try {
        await setSecret(key, value);
        spinner.succeed(`${icons.shieldCheck} Secret '${chalk.cyan(key)}' saved securely!`);
      } catch (err) {
        spinner.fail(`${icons.x} Failed to save secret`);
      }
    })
  )
  .addCommand(new Command('get')
    .description('Retrieve a decrypted secret')
    .argument('<key>', 'Secret name')
    .action(async (key) => {
      const spinner = ora(`${icons.unlock} Decrypting...`).start();
      try {
        const value = await getSecret(key);
        if (value) {
          spinner.succeed(`${icons.check} Secret retrieved:`);
          console.log(`\n${colors.info}${key}${colors.reset} = ${chalk.cyan(value)}\n`);
        } else {
          spinner.warn(`${icons.warning} Secret '${chalk.cyan(key)}' not found.`);
        }
      } catch (err) {
        spinner.fail(`${icons.x} Failed to decrypt secret. Check your HULOOl_VAULT_KEY.`);
      }
    })
  )
  .addCommand(new Command('list')
    .description('List all stored secret names (values are hidden)')
    .action(async () => {
      const spinner = ora(`${icons.list} Loading secrets...`).start();
      try {
        const keys = await listSecrets();
        spinner.stop();
        
        if (keys.length === 0) {
          console.log(`\n${icons.info} No secrets stored yet.\n`);
          return;
        }

        console.log(`\n${chalk.bold('Stored Secrets:')}`);
        console.log(chalk.gray('─'.repeat(50)));
        for (const key of keys) {
          console.log(`  ${icons.shield} ${chalk.cyan(key.padEnd(30))} ${chalk.gray('••••••••••••')}`);
        }
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`${icons.info} Total: ${chalk.white(keys.length)} secret(s)\n`);
      } catch (err) {
        spinner.fail(`${icons.x} Failed to list secrets`);
      }
    })
  )
  .addCommand(new Command('remove')
    .description('Delete a secret permanently')
    .argument('<key>', 'Secret name')
    .action(async (key) => {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `${icons.warning} Are you sure you want to delete '${chalk.cyan(key)}'? This cannot be undone.`,
        default: false
      }]);

      if (!confirm) {
        console.log(chalk.yellow('\nOperation cancelled.'));
        return;
      }

      const spinner = ora(`${icons.trash} Deleting...`).start();
      try {
        const deleted = await deleteSecret(key);
        if (deleted) {
          spinner.succeed(`${icons.check} Secret '${chalk.cyan(key)}' deleted permanently.`);
        } else {
          spinner.warn(`${icons.warning} Secret '${chalk.cyan(key)}' not found.`);
        }
      } catch (err) {
        spinner.fail(`${icons.x} Failed to delete secret`);
      }
    })
  );
