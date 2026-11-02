import { Command } from 'commander';
import { mcpServeCommand } from './mcp-serve.js';

export const mcpCommand = new Command('mcp')
  .description('Manage Model Context Protocol (MCP) features')
  .addCommand(mcpServeCommand);
