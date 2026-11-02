import { Command } from 'commander';
import chalk from 'chalk';
import { startDashboard } from '../../dashboard/server.js';
import { exec } from 'child_process';

export const dashboardCommand = new Command('dashboard')
  .description('Start the Hulool OS Web Dashboard')
  .option('-p, --port <port>', 'Port to run on', '4000')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🌐 Starting Hulool OS Dashboard...\n'));

    const port = parseInt(options.port);
    
    // بدء الخادم
    await startDashboard(port);

    // محاولة فتح المتصفح
    if (options.open) {
      const url = `http://localhost:${port}/dashboard/`;
      console.log(chalk.gray(`Attempting to open: ${url}`));
      
      const platform = process.platform;
      let command = '';
      
      if (platform === 'win32') command = `start ${url}`;
      else if (platform === 'darwin') command = `open ${url}`;
      else command = `xdg-open ${url} 2>/dev/null || echo "Please open ${url} in your browser"`;
      
      exec(command);
    }
  });
