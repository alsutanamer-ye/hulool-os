import { Command } from 'commander';
import chalk from 'chalk';
import { loadAgent } from '../../utils/agent-utils.js';

const SEPARATOR = chalk.gray('─'.repeat(50));

export const agentInfoCommand = new Command('info')
  .description('Show detailed information about an agent')
  .argument('<id>', 'Agent ID')
  .action(async (id) => {
    const agent = await loadAgent(id);

    if (!agent) {
      console.error(chalk.red(`\n❌ Agent "${id}" not found.\n`));
      process.exit(1);
    }

    const budgetPercent = agent.budget.monthly > 0
      ? (agent.budget.used / agent.budget.monthly) * 100
      : 0;
    
    const filledBlocks = Math.floor(budgetPercent / 5);
    const budgetBar = chalk.green('█'.repeat(filledBlocks)) + 
                     chalk.gray('░'.repeat(20 - filledBlocks));

    console.log('');
    console.log(chalk.blue.bold(`🤖 Agent: ${agent.name}`));
    console.log('');
    console.log(SEPARATOR);
    console.log(chalk.white('  🆔 ID:           '), chalk.cyan(agent.id));
    console.log(chalk.white('  🎭 Role:         '), chalk.cyan(agent.role));
    console.log(chalk.white('  🧠 Model:        '), chalk.cyan(agent.model));
    console.log(chalk.white('  📊 Status:       '), getStatusText(agent.status));
    console.log(chalk.white('  📅 Created:      '), chalk.gray(new Date(agent.createdAt).toLocaleString()));
    console.log(SEPARATOR);
    
    console.log(chalk.white.bold('  💰 Budget:'));
    console.log(chalk.white('     Used:         '), chalk.green(`$${agent.budget.used.toFixed(2)}`));
    console.log(chalk.white('     Monthly:      '), chalk.green(`$${agent.budget.monthly.toFixed(2)}`));
    console.log(chalk.white('     Remaining:    '), chalk.green(`$${(agent.budget.monthly - agent.budget.used).toFixed(2)}`));
    console.log(chalk.white('     Usage:        '), budgetBar + ` ${budgetPercent.toFixed(1)}%`);
    
    if (agent.skills.length > 0) {
      console.log(SEPARATOR);
      console.log(chalk.white.bold('  🛠️  Skills:'));
      agent.skills.forEach(skill => {
        console.log(chalk.gray('     • '), chalk.cyan(skill));
      });
    }

    console.log(SEPARATOR);
    console.log(chalk.white.bold('  📝 System Prompt:'));
    const promptLines = agent.systemPrompt.split('\n');
    promptLines.forEach(line => {
      console.log(chalk.gray('  ' + line));
    });
    console.log(SEPARATOR);
    console.log('');
  });

function getStatusText(status: string): string {
  switch (status) {
    case 'active': return chalk.green('● Active');
    case 'inactive': return chalk.gray('○ Inactive');
    case 'error': return chalk.red('● Error');
    case 'paused': return chalk.yellow('● Paused');
    default: return chalk.gray('? Unknown');
  }
}
