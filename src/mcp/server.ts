import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { URL } from 'url';
import { loadAllAgents, loadAgent, saveAgent } from '../utils/agent-utils.js';
import { loadAllTasks } from '../utils/task-utils.js';
import { runAgent } from '../core/agent-runner.js';
import { globalA2ARouter } from '../core/a2a/router.js';
import '../core/a2a/handlers.js';
import type { Agent } from '../types/agent.js';

export async function startMcpServer() {
  const server = new McpServer({
    name: 'Hulool OS',
    version: '0.1.0',
  });

  // ==========================================
  // 1. الموارد (Resources)
  // ==========================================
  
  server.resource(
    'agents-list',
    'hulool://agents',
    async (uri: URL) => {
      const agents = await loadAllAgents();
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(agents.map(a => ({ 
            id: a.id, name: a.name, role: a.role, status: a.status, budget: a.budget 
          })), null, 2),
          mimeType: 'application/json',
        }],
      };
    }
  );

  server.resource(
    'tasks-list',
    'hulool://tasks',
    async (uri: URL) => {
      const tasks = await loadAllTasks();
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(tasks.map(t => ({ 
            id: t.id, agentId: t.agentId, status: t.status, description: t.description 
          })), null, 2),
          mimeType: 'application/json',
        }],
      };
    }
  );

  // ==========================================
  // 2. الأدوات (Tools)
  // ==========================================

  server.tool(
    'create_agent',
    'إنشاء وكيل ذكاء اصطناعي جديد في Hulool OS',
    {
      name: z.string().min(1).describe('اسم الوكيل'),
      role: z.string().min(1).describe('دور الوكيل (مثال: researcher, writer)'),
      model: z.string().default('gpt-4').describe('نموذج الذكاء الاصطناعي'),
      budget: z.number().positive().describe('الميزانية الشهرية بالدولار'),
    },
    async (params: { name: string; role: string; model: string; budget: number }) => {
      try {
        const { name, role, model, budget } = params;
        
        const newAgent: Agent = {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          role,
          model,
          budget: { monthly: budget, used: 0 },
          status: 'inactive',
          skills: [],
          tools: [],
          maxConcurrentTasks: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          systemPrompt: `You are a ${role}.`
        };
        
        await saveAgent(newAgent); 

        return {
          content: [{ type: 'text', text: `✅ تم إنشاء الوكيل '${name}' بنجاح بالمعرف: ${newAgent.id}` }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `❌ فشل إنشاء الوكيل: ${message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'run_task',
    'تعيين مهمة لوكيل محدد وتنفيذها فوراً',
    {
      agentId: z.string().describe('معرف الوكيل المنفذ'),
      description: z.string().min(1).describe('وصف المهمة المطلوب تنفيذها'),
    },
    async (params: { agentId: string; description: string }) => {
      try {
        const { agentId, description } = params;
        
        const agent = await loadAgent(agentId);
        if (!agent) {
          return { content: [{ type: 'text', text: `❌ الوكيل '${agentId}' غير موجود.` }], isError: true };
        }

        // ✅ التصحيح هنا: تمرير كائن agent و taskDescription
        const result = await runAgent({
          agent: agent,
          taskDescription: description,
        });

        if (result.success) {
          return {
            content: [
              { type: 'text', text: `✅ اكتملت المهمة بنجاح.\n\nالنتيجة:\n${result.response}\n\nالتكلفة: $${result.cost.toFixed(4)} | الرموز: ${result.tokensUsed}` }
            ],
          };
        } else {
          return {
            content: [{ type: 'text', text: `❌ فشلت المهمة: ${result.error}` }],
            isError: true,
          };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text', text: `❌ خطأ في التنفيذ: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    'delegate_task_a2a',
    'تفويض مهمة من وكيل إلى آخر باستخدام بروتوكول A2A',
    {
      fromAgent: z.string().describe('معرف الوكيل المرسل'),
      toAgent: z.string().describe('معرف الوكيل المستقبل'),
      action: z.enum(['research', 'write', 'review', 'summarize']).describe('نوع الإجراء'),
      payloadJson: z.string().describe('حمولة JSON للإجراء (مثال: {"query": "AI trends"})'),
    },
    async (params: { fromAgent: string; toAgent: string; action: 'research' | 'write' | 'review' | 'summarize'; payloadJson: string }) => {
      try {
        const { fromAgent, toAgent, action, payloadJson } = params;
        const payload = JSON.parse(payloadJson);
        
        const response = await globalA2ARouter.sendMessage({
          senderId: fromAgent,
          receiverId: toAgent,
          intent: 'request',
          action,
          payload,
          requiresResponse: true,
          ttl: 300,
        });

        if (response.intent === 'response') {
          return {
            content: [{ type: 'text', text: `✅ استجابة A2A ناجحة:\n${JSON.stringify(response.payload, null, 2)}` }],
          };
        } else {
          return {
            content: [{ type: 'text', text: `❌ فشل تفويض A2A: ${JSON.stringify(response.payload)}` }],
            isError: true,
          };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text', text: `❌ خطأ في تفويض A2A: ${message}` }], isError: true };
      }
    }
  );

  // ==========================================
  // 3. بدء الخادم
  // ==========================================
  console.error('🚀 Hulool OS MCP Server starting on stdio...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ Hulool OS MCP Server connected and ready to serve tools/resources.');
}
