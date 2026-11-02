import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import { analyticsEngine } from '../../core/analytics/analyzer.js';
import { icons } from '../../utils/icons.js';

export const analyticsCommand = new Command('analytics')
  .description('Generate analytics and reports')
  .addCommand(new Command('summary')
    .description('Generate a summary report')
    .option('-d, --days <number>', 'Number of days to analyze', '30')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora(`${icons.refresh} Generating analytics...`).start();
      try {
        const summary = await analyticsEngine.generateSummary(parseInt(options.days));
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(summary, null, 2));
          return;
        }

        console.log(chalk.blue.bold(`\n${icons.info} Analytics Summary (Last ${options.days} days)\n`));
        console.log(chalk.gray('─'.repeat(60)));

        // Agents
        console.log(chalk.white.bold('🤖 Agents:'));
        console.log(chalk.gray(`   Total:   ${summary.agents.total}`));
        console.log(chalk.gray(`   Active:  ${chalk.green(summary.agents.active)}`));
        console.log(chalk.gray(`   Cost:    $${summary.agents.totalCost.toFixed(2)}`));
        console.log(chalk.gray(`   Tokens:  ${summary.agents.totalTokens.toLocaleString()}`));
        console.log('');

        // Tasks
        console.log(chalk.white.bold('📝 Tasks:'));
        console.log(chalk.gray(`   Total:     ${summary.tasks.total}`));
        console.log(chalk.gray(`   Completed: ${chalk.green(summary.tasks.completed)}`));
        console.log(chalk.gray(`   Failed:    ${chalk.red(summary.tasks.failed)}`));
        console.log(chalk.gray(`   Pending:   ${chalk.yellow(summary.tasks.pending)}`));
        console.log(chalk.gray(`   Avg Cost:  $${summary.tasks.avgCost.toFixed(4)}`));
        console.log('');

        // Workflows
        console.log(chalk.white.bold('🔄 Workflows:'));
        console.log(chalk.gray(`   Total:       ${summary.workflows.total}`));
        console.log(chalk.gray(`   Runs:        ${summary.workflows.runs}`));
        console.log(chalk.gray(`   Success:     ${summary.workflows.successRate.toFixed(1)}%`));
        console.log(chalk.gray(`   Avg Time:    ${(summary.workflows.avgDuration / 1000).toFixed(1)}s`));
        console.log('');

        // Budget
        console.log(chalk.white.bold('💰 Budget:'));
        console.log(chalk.gray(`   Total:     $${summary.budget.total.toFixed(2)}`));
        console.log(chalk.gray(`   Used:      $${chalk.yellow(summary.budget.used.toFixed(2))}`));
        console.log(chalk.gray(`   Remaining: $${chalk.green(summary.budget.remaining.toFixed(2))}`));
        console.log(chalk.gray(`   Burn Rate: $${summary.budget.burnRate.toFixed(2)}/day`));
        if (summary.budget.projectedExhaustion) {
          const daysLeft = Math.ceil((new Date(summary.budget.projectedExhaustion).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
          console.log(chalk.gray(`   Exhausts:  ${daysLeft} days`));
        }
        console.log('');

        // Top Agents
        console.log(chalk.white.bold('🏆 Top Agents by Cost:'));
        for (const agent of summary.topAgents) {
          console.log(chalk.gray(`   ${agent.name}: $${agent.cost.toFixed(2)}`));
        }
        console.log(chalk.gray('─'.repeat(60)));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to generate analytics`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('report')
    .description('Generate and save a report')
    .argument('<type>', 'Report type (summary, detailed, cost, performance)')
    .option('-d, --days <number>', 'Number of days', '30')
    .action(async (type, options) => {
      const spinner = ora(`${icons.refresh} Generating ${type} report...`).start();
      try {
        const report = await analyticsEngine.generateAndSave(
          type as 'summary' | 'detailed' | 'cost' | 'performance',
          parseInt(options.days)
        );
        spinner.succeed(`${icons.check} Report generated: ${report.id}`);
        console.log(chalk.gray(`   Saved to: .hulool/reports/${report.id}.json`));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to generate report`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  )
  .addCommand(new Command('list')
    .description('List saved reports')
    .action(async () => {
      const spinner = ora(`${icons.list} Loading reports...`).start();
      try {
        const reports = await analyticsEngine.listReports();
        spinner.stop();

        if (reports.length === 0) {
          console.log(chalk.yellow('\n⚠️  No reports found.\n'));
          return;
        }

        console.log(chalk.blue.bold(`\n${icons.list} Reports (${reports.length})\n`));
        console.log(chalk.gray('─'.repeat(80)));

        for (const report of reports) {
          console.log(`${icons.file} ${chalk.bold(report.title)} ${chalk.gray(`[${report.type}]`)}`);
          console.log(chalk.gray(`   ID: ${report.id} | Generated: ${new Date(report.generatedAt).toLocaleString()}`));
          console.log('');
        }
        console.log(chalk.gray('─'.repeat(80)));
      } catch (error) {
        spinner.fail(`${icons.x} Failed to list reports`);
      }
    })
  )
  .addCommand(new Command('export')
    .description('Export analytics to CSV or JSON')
    .option('-f, --format <format>', 'Format (csv, json)', 'json')
    .option('-o, --output <file>', 'Output file', 'analytics-export.json')
    .option('-d, --days <number>', 'Days to analyze', '30')
    .action(async (options) => {
      const spinner = ora(`${icons.refresh} Generating export...`).start();
      try {
        const summary = await analyticsEngine.generateSummary(parseInt(options.days));
        
        if (options.format === 'json') {
          await fs.writeFile(options.output, JSON.stringify(summary, null, 2));
        } else if (options.format === 'csv') {
          // CSV export للتكلفة اليومية
          const csv = ['date,cost', ...summary.costByDay.map(d => `${d.date},${d.cost}`)].join('\n');
          await fs.writeFile(options.output, csv);
        }

        spinner.succeed(`${icons.check} Exported to ${options.output}`);
      } catch (error) {
        spinner.fail(`${icons.x} Export failed`);
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
  );
