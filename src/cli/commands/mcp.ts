import { Command } from 'commander';
import chalk from 'chalk';
import { startMcpServer } from '../../mcp/server/index.js';

export const mcpCommand = new Command('mcp')
  .description('Manage Model Context Protocol features')
  .addCommand(new Command('serve')
    .description('Start Hulool OS as an MCP Server')
    .action(async () => {
      console.log(chalk.blue('Starting Hulool MCP Server...'));
      await startMcpServer();
    })
  )
  .addCommand(new Command('test-client')
    .description('Test MCP Client connection')
    .argument('<server-command>', 'Command to run the external server')
    .action(async (serverCommand) => {
      const { mcpClient } = await import('../../mcp/client/index.js');
      try {
        await mcpClient.connectToServer(serverCommand, []);
        const tools = await mcpClient.listTools();
        console.log(chalk.green('Available Tools:'));
        tools.forEach(t => console.log(`- ${t.name}: ${t.description}`));
      } catch (error) {
        console.error(chalk.red('Connection failed:', error));
      }
    })
  );

export default mcpCommand;
