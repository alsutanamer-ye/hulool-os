import { Command } from 'commander';
import chalk from 'chalk';
import { icons } from '../../../utils/icons.js';

export const docsCommand = new Command('docs')
  .description('Open local documentation')
  .action(() => {
    console.log(chalk.blue(`\n${icons.book} Opening Documentation...\n`));
    console.log(chalk.gray('Visit: http://localhost:4000/docs'));
    // هنا يمكن إضافة كود لفتح المتصفح تلقائياً
  });

export default docsCommand;
