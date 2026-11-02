import { Command } from 'commander';
import chalk from 'chalk';
import { loadAllAgents } from '../../utils/agent-utils.js';

const STATUS_ICONS: Record<string, string> = {
  active: chalk.green('●'),
  inactive: chalk.gray('○'),
  error: chalk.red('●'),
  paused: chalk.yellow('●'),
};

export const agentListCommand = new Command('list')
  .description('List all AI agents')
  .option('-s, --status <status>', 'Filter by status')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const agents = await loadAllAgents();

    if (agents.length === 0) {
      console.log(chalk.yellow('\n⚠️  No agents found.'));
      console.log(chalk.gray('   Create one with: hulool agent create\n'));
      return;
    }

    let filtered = agents;
    if (options.status) {
      filtered = agents.filter(a => a.status === options.status);
    }

    if (options.json) {
      console.log(JSON.stringify(filtered, null, 2));
      return;
    }

    console.log(chalk.blue.bold('\n🤖 AI Agents\n'));

    // حساب عرض الأعمدة ديناميكياً مع حدود دنيا
    const nameWidth = Math.max(15, ...filtered.map(a => a.name.length)) + 2;
    const roleWidth = Math.max(12, ...filtered.map(a => a.role.length)) + 2;
    const modelWidth = 25;

    // Header
    const header = [
      'Status'.padEnd(10),
      'Name'.padEnd(nameWidth),
      'Role'.padEnd(roleWidth),
      'Model'.padEnd(modelWidth),
      'Budget'
    ].join('');
    
    console.log(chalk.gray('  ') + chalk.bold(header));
    console.log(chalk.gray('  ' + '─'.repeat(nameWidth + roleWidth + modelWidth + 25)));

    // Rows
    for (const agent of filtered) {
      const statusIcon = STATUS_ICONS[agent.status] || chalk.gray('?');
      const budgetPercent = agent.budget.monthly > 0 
        ? (agent.budget.used / agent.budget.monthly) * 100 
        : 0;
      
      let budgetColor = chalk.green;
      if (budgetPercent > 80) budgetColor = chalk.red;
      else if (budgetPercent > 50) budgetColor = chalk.yellow;

      const row = [
        statusIcon.padEnd(8),
        chalk.white(agent.name.padEnd(nameWidth)),
        chalk.gray(agent.role.padEnd(roleWidth)),
        chalk.cyan(agent.model.padEnd(modelWidth)),
        budgetColor(`$${agent.budget.used.toFixed(2)}/$${agent.budget.monthly}`)
      ].join('');
      
      console.log('  ' + row);
    }

    console.log('');
    console.log(chalk.gray(`  Total: ${filtered.length} agent(s)`));
    
    const activeCount = filtered.filter(a => a.status === 'active').length;
    if (activeCount > 0) {
      console.log(chalk.gray(`  Active: ${activeCount}`));
    }
    console.log('');
  });
