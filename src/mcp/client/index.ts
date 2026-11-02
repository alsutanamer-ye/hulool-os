import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class HuloolMcpClient {
  private client: Client;

  constructor() {
    this.client = new Client({
      name: 'hulool-mcp-client',
      version: '1.0.0',
    }, {
      capabilities: {},
    });
  }

  async connectToServer(command: string, args: string[]) {
    const transport = new StdioClientTransport({
      command,
      args,
    });
    await this.client.connect(transport);
    console.log(`✅ Connected to MCP Server: ${command}`);
  }

  async listTools() {
    const response = await this.client.listTools();
    return response.tools;
  }

  async callTool(name: string, arguments_: any) {
    const response = await this.client.callTool({
      name,
      arguments: arguments_,
    });
    return response.content;
  }
}

export const mcpClient = new HuloolMcpClient();
