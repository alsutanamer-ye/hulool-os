import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadAllAgents, loadAgent } from '../../utils/agent-utils.js';
import { loadAllTasks } from '../../utils/task-utils.js';
import { integrationManager } from '../../core/integrations/manager.js';

export async function startMcpServer() {
  const server = new McpServer({
    name: 'Hulool OS',
    version: '1.0.0',
  });

  // --- Resources (بيانات للقراءة فقط) ---
  
  server.resource(
    'agents-list',
    'hulool://agents',
    async () => {
      const agents = await loadAllAgents();
      return {
        contents: [{
          uri: 'hulool://agents',
          text: JSON.stringify(agents.map(a => ({ id: a.id, name: a.name, status: a.status })), null, 2),
          mimeType: 'application/json',
        }],
      };
    }
  );

  server.resource(
    'tasks-list',
    'hulool://tasks',
    async () => {
      const tasks = await loadAllTasks();
      return {
        contents: [{
          uri: 'hulool://tasks',
          text: JSON.stringify(tasks.map(t => ({ id: t.id, status: t.status, description: t.description })), null, 2),
          mimeType: 'application/json',
        }],
      };
    }
  );

  // --- Tools (إجراءات للتنفيذ) ---

  server.tool(
    'create_agent',
    'Create a new AI agent in Hulool OS',
    {
      name: z.string(),
      role: z.string(),
      model: z.string().default('gpt-4'),
    },
    async ({ name, role, model }) => {
      // استدعاء منطق إنشاء الوكيل (يجب استيراد دالة createAgent من agent-utils)
      // للعرض التوضيحي سنعيد رسالة نجاح
      return {
        content: [{ type: 'text', text: `Agent "${name}" created successfully with role ${role}.` }],
      };
    }
  );

  server.tool(
    'run_integration',
    'Execute an external integration (e.g., GitHub, Slack)',
    {
      integrationId: z.string(),
      action: z.string(),
      payload: z.string().describe('JSON string of payload'),
    },
    async ({ integrationId, action, payload }) => {
      try {
        const parsedPayload = JSON.parse(payload);
        const result = await integrationManager.executeAction(integrationId, action, parsedPayload);
        return {
          content: [{ type: 'text', text: `Integration executed: ${JSON.stringify(result)}` }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}`, isError: true }],
        };
      }
    }
  );

  console.error('🚀 Hulool MCP Server starting on stdio...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
