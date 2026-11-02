import type { IntegrationConfig, GitHubIssue } from '../../../types/integration.js';

export class GitHubAdapter {
  private token: string;
  private owner: string;
  private repo: string;
  private baseUrl = 'https://api.github.com';

  constructor(config: IntegrationConfig) {
    if (!config.credentials?.token) throw new Error('GitHub Token is missing');
    if (!config.settings?.owner || !config.settings?.repo) throw new Error('Owner and Repo are required');

    this.token = config.credentials.token;
    this.owner = config.settings.owner;
    this.repo = config.settings.repo;
  }

  private async request(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Hulool-OS-Bot'
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  // 1. قراءة الـ Issues المفتوحة
  async listIssues(state: 'open' | 'closed' = 'open'): Promise<GitHubIssue[]> {
    const data = await this.request(`/repos/${this.owner}/${this.repo}/issues?state=${state}`);
    return data.map((issue: any) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state,
      url: issue.html_url
    }));
  }

  // 2. إنشاء Issue جديد
  async createIssue(title: string, body: string, labels?: string[]): Promise<GitHubIssue> {
    const data = await this.request(`/repos/${this.owner}/${this.repo}/issues`, 'POST', {
      title,
      body,
      labels
    });
    
    return {
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      url: data.html_url
    };
  }

  // 3. إضافة تعليق على Issue
  async addComment(issueNumber: number, comment: string): Promise<void> {
    await this.request(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments`, 'POST', {
      body: comment
    });
  }

  // 4. التحقق من الاتصال
  async ping(): Promise<boolean> {
    try {
      await this.request(`/repos/${this.owner}/${this.repo}`);
      return true;
    } catch {
      return false;
    }
  }
}
