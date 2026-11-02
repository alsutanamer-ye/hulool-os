import fs from 'fs/promises';
import path from 'path';
import type { IntegrationConfig } from '../../types/integration.js';
import { GitHubAdapter } from './adapters/github.js';

const INTEGRATIONS_FILE = path.join(process.cwd(), '.hulool', 'integrations.json');

export class IntegrationManager {
  async ensureFile() {
    try { await fs.access(INTEGRATIONS_FILE); } 
    catch { await fs.writeFile(INTEGRATIONS_FILE, JSON.stringify([])); }
  }

  async list(): Promise<IntegrationConfig[]> {
    await this.ensureFile();
    const content = await fs.readFile(INTEGRATIONS_FILE, 'utf-8');
    return JSON.parse(content);
  }

  async get(id: string): Promise<IntegrationConfig | undefined> {
    const integrations = await this.list();
    return integrations.find(i => i.id === id);
  }

  async add(config: IntegrationConfig): Promise<void> {
    const integrations = await this.list();
    if (integrations.find(i => i.id === config.id)) {
      throw new Error(`Integration "${config.id}" already exists.`);
    }
    integrations.push({ ...config, createdAt: new Date().toISOString(), status: 'active' });
    await fs.writeFile(INTEGRATIONS_FILE, JSON.stringify(integrations, null, 2));
  }

  async remove(id: string): Promise<void> {
    let integrations = await this.list();
    integrations = integrations.filter(i => i.id !== id);
    await fs.writeFile(INTEGRATIONS_FILE, JSON.stringify(integrations, null, 2));
  }

  // دالة موحدة لتنفيذ الإجراءات عبر أي تكامل
  async executeAction(id: string, action: string, payload: any): Promise<any> {
    const integration = await this.get(id);
    if (!integration) throw new Error(`Integration "${id}" not found`);

    switch (integration.service) {
      case 'github':
        return this.handleGitHubAction(integration, action, payload);
      case 'webhook':
        return this.triggerWebhook(integration.settings?.url, payload);
      default:
        throw new Error(`Service "${integration.service}" not supported for actions yet.`);
    }
  }

  private async handleGitHubAction(config: IntegrationConfig, action: string, payload: any) {
    const gh = new GitHubAdapter(config);

    switch (action) {
      case 'list_issues':
        return await gh.listIssues(payload.state || 'open');
      case 'create_issue':
        return await gh.createIssue(payload.title, payload.body, payload.labels);
      case 'add_comment':
        return await gh.addComment(payload.issueNumber, payload.comment);
      case 'ping':
        return await gh.ping();
      default:
        throw new Error(`Unknown GitHub action: ${action}`);
    }
  }

  private async triggerWebhook(url: string, data: any) {
    if (!url) throw new Error('Webhook URL is missing');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return { success: response.ok, status: response.status };
  }
}

export const integrationManager = new IntegrationManager();
