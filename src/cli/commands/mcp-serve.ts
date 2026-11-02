import { Command } from 'commander';
import chalk from 'chalk';
import { startMcpServer } from '../../mcp/server.js';

export const mcpServeCommand = new Command('serve')
  .description('Start the Hulool OS MCP Server (for use with Claude Desktop, etc.)')
  .action(async () => {
    console.log(chalk.blue.bold('\n🔌 Starting Hulool OS MCP Server...\n'));
    console.log(chalk.gray('   This server communicates via stdio.'));
    console.log(chalk.gray('   Configure your MCP client (e.g., Claude Desktop) to run:\n'));
    console.log(chalk.cyan('   pnpm tsx /root/projects/hulool-os/src/cli/index.ts mcp serve\n'));
    console.log(chalk.gray('   Press Ctrl+C to stop.\n'));

    try {
      await startMcpServer();
    } catch (error) {
      console.error(chalk.red('❌ Failed to start MCP server:'), error);
      process.exit(1);
    }
  });
