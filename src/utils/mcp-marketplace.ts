import fs from 'fs/promises';
import path from 'path';
import type { McpToolConfig, InstalledMcpTool, McpMarketplaceIndex } from '../types/mcp-tool.js';

const HULOOl_DIR = path.join(process.cwd(), '.hulool');
const MARKETPLACE_DIR = path.join(process.cwd(), 'mcp-marketplace');
const INSTALLED_FILE = path.join(HULOOl_DIR, 'mcp-installed.json');

export class McpMarketplaceManager {
  constructor() {
    this.ensureHuloolDir();
  }

  private async ensureHuloolDir() {
    await fs.mkdir(HULOOl_DIR, { recursive: true });
  }

  // جلب الأدوات المتاحة من السوق المحلي (يمكن استبداله بـ API مستقبلاً)
  async getAvailableTools(): Promise<McpToolConfig[]> {
    try {
      const files = await fs.readdir(MARKETPLACE_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');
      
      const tools: McpToolConfig[] = [];
      for (const file of jsonFiles) {
        const content = await fs.readFile(path.join(MARKETPLACE_DIR, file), 'utf-8');
        tools.push(JSON.parse(content));
      }
      return tools;
    } catch {
      return [];
    }
  }

  // جلب الأدوات المثبتة
  async getInstalledTools(): Promise<InstalledMcpTool[]> {
    try {
      const content = await fs.readFile(INSTALLED_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  // تثبيت أداة
  async installTool(toolId: string): Promise<InstalledMcpTool> {
    const availableTools = await this.getAvailableTools();
    const tool = availableTools.find(t => t.id === toolId);

    if (!tool) {
      throw new Error(`Tool "${toolId}" not found in marketplace.`);
    }

    const installedTools = await this.getInstalledTools();
    if (installedTools.find(t => t.id === toolId)) {
      throw new Error(`Tool "${toolId}" is already installed.`);
    }

    const installedTool: InstalledMcpTool = {
      ...tool,
      installedAt: new Date().toISOString(),
      status: 'active',
    };

    installedTools.push(installedTool);
    await fs.writeFile(INSTALLED_FILE, JSON.stringify(installedTools, null, 2), 'utf-8');

    return installedTool;
  }

  // إلغاء تثبيت أداة
  async uninstallTool(toolId: string): Promise<boolean> {
    const installedTools = await this.getInstalledTools();
    const filtered = installedTools.filter(t => t.id !== toolId);

    if (filtered.length === installedTools.length) {
      throw new Error(`Tool "${toolId}" is not installed.`);
    }

    await fs.writeFile(INSTALLED_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  }

  // توليد ملف التكوين لعملاء MCP (مثل Claude Desktop)
  async generateMcpClientConfig(): Promise<Record<string, any>> {
    const installedTools = await this.getInstalledTools();
    const config: Record<string, any> = { mcpServers: {} };

    for (const tool of installedTools) {
      if (tool.status === 'active') {
        config.mcpServers[tool.id] = {
          command: tool.command,
          args: tool.args,
          env: tool.envVars ? tool.envVars.reduce((acc, env) => {
            acc[env] = `YOUR_${env}_HERE`;
            return acc;
          }, {} as Record<string, string>) : undefined,
        };
      }
    }

    return config;
  }
}

export const mcpMarketplaceManager = new McpMarketplaceManager();
