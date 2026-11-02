import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { loadAllAgents, loadAgent } from '../utils/agent-utils.js';
import { loadAllTasks } from '../utils/task-utils.js';
import { templateManager } from '../utils/template-manager.js';
import { globalA2ARouter } from '../core/a2a/router.js';
import { mcpMarketplaceManager } from '../utils/mcp-marketplace.js';
import { connectorManager } from '../core/connectors/index.js';
import { getEnvVar } from '../utils/env-manager.js';
import { messageManager } from '../core/messaging/message-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startDashboard(port: number = 4000): Promise<void> {
  const fastify = Fastify({ logger: false });

  await fastify.register(cors, { origin: true });

  // Socket.io
  const io = new Server(fastify.server, {
    cors: { origin: '*' },
  });

  // تقديم ملفات الـ static
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../../public/dashboard'),
    prefix: '/dashboard/',
  });

  // ==========================================
  // WebSocket Handlers
  // ==========================================

  io.on('connection', (socket) => {
    console.log(chalk.gray(`[WebSocket] Client connected: ${socket.id}`));

    // الانضمام إلى محادثة
    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(chalk.gray(`[WebSocket] ${socket.id} joined conversation ${conversationId}`));
    });

    // مغادرة محادثة
    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // إرسال رسالة
    socket.on('send-message', async (data: { conversationId: string; content: string; userId: string }) => {
      try {
        const { conversationId, content, userId } = data;
        
        // معالجة الرسالة
        const agentResponse = await messageManager.handleIncomingMessage(
          conversationId,
          content,
          userId
        );

        // إرسال الرد إلى جميع العملاء في المحادثة
        io.to(`conversation:${conversationId}`).emit('new-message', agentResponse);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(chalk.gray(`[WebSocket] Client disconnected: ${socket.id}`));
    });
  });

  // ==========================================
  // API Endpoints
  // ==========================================

  // نظرة عامة
  fastify.get('/api/overview', async () => {
    const [agents, tasks] = await Promise.all([
      loadAllAgents(),
      loadAllTasks(),
    ]);

    const totalBudget = agents.reduce((sum, a) => sum + a.budget.monthly, 0);
    const usedBudget = agents.reduce((sum, a) => sum + a.budget.used, 0);
    const activeAgents = agents.filter(a => a.status === 'active').length;

    return {
      agents: { total: agents.length, active: activeAgents },
      tasks: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        running: tasks.filter(t => t.status === 'running').length,
        completed: tasks.filter(t => t.status === 'completed').length,
      },
      budget: {
        total: totalBudget,
        used: usedBudget,
        remaining: totalBudget - usedBudget,
      },
    };
  });

  // الوكلاء
  fastify.get('/api/agents', async () => {
    const agents = await loadAllAgents();
    return agents;
  });

  // المحادثات
  fastify.get('/api/conversations', async () => {
    return await messageManager.getConversations();
  });

  fastify.get('/api/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const conversation = await messageManager.getConversation(id);
    if (!conversation) {
      reply.code(404);
      return { error: 'Conversation not found' };
    }
    return conversation;
  });

  fastify.post('/api/conversations', async (request) => {
    const { agentId, channelId, participantId, participantName } = request.body as any;
    return await messageManager.createConversation(agentId, channelId, participantId, participantName);
  });

  // Webhooks للموصلات الخارجية
  fastify.post('/webhooks/whatsapp', async (request) => {
    // معالجة webhook من WhatsApp
    console.log('[WhatsApp Webhook]', request.body);
    return { status: 'ok' };
  });

  fastify.post('/webhooks/telegram', async (request) => {
    // معالجة webhook من Telegram
    console.log('[Telegram Webhook]', request.body);
    return { status: 'ok' };
  });

  // بدء الخادم
  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(chalk.green(`\n✅ Dashboard running at: ${chalk.cyan(`http://localhost:${port}/dashboard/`)}`));
    console.log(chalk.gray('   WebSocket server ready'));
    console.log(chalk.gray('   Press Ctrl+C to stop\n'));
  } catch (err: any) {
    console.error(chalk.red('Failed to start dashboard:'), err.message);
    process.exit(1);
  }
}
