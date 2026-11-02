import fs from 'fs/promises';
import path from 'path';
import type { Template, TemplateType, TemplateIndex } from '../types/template.js';
import { validateTemplateForCreation, validateTemplateForAgent } from './template-compatibility.js';
import type { Agent } from '../types/agent.js';

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

export class TemplateManager {
  async loadIndex(type: TemplateType): Promise<TemplateIndex> {
    const indexPath = path.join(TEMPLATES_DIR, type + 's', 'index.json');
    
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { templates: [], lastUpdated: new Date().toISOString() };
    }
  }

  async saveIndex(type: TemplateType, index: TemplateIndex): Promise<void> {
    const indexPath = path.join(TEMPLATES_DIR, type + 's', 'index.json');
    index.lastUpdated = new Date().toISOString();
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  async listTemplates(type?: TemplateType): Promise<Template[]> {
    if (type) {
      const index = await this.loadIndex(type);
      return index.templates;
    }

    const types: TemplateType[] = ['prompt', 'tool', 'skill', 'plugin', 'module'];
    const allTemplates: Template[] = [];

    for (const t of types) {
      const index = await this.loadIndex(t);
      allTemplates.push(...index.templates);
    }

    return allTemplates;
  }

  async getTemplate(id: string, type: TemplateType): Promise<Template | null> {
    const index = await this.loadIndex(type);
    return index.templates.find(t => t.id === id) || null;
  }

  async searchTemplates(query: string, type?: TemplateType): Promise<Template[]> {
    const templates = await this.listTemplates(type);
    const lowerQuery = query.toLowerCase();

    return templates.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  async installTemplate(template: Template, force: boolean = false): Promise<void> {
    // التحقق من صحة القالب
    const validation = validateTemplateForCreation(template);
    if (!validation.compatible) {
      throw new Error(`Template validation failed:\n${validation.errors.join('\n')}`);
    }

    const index = await this.loadIndex(template.type);
    
    // التحقق من عدم التكرار
    const existing = index.templates.find(t => t.id === template.id);
    if (existing && !force) {
      throw new Error(`Template "${template.id}" already exists. Use --force to overwrite.`);
    }

    // التحقق من التبعيات
    for (const dep of template.dependencies) {
      const depExists = await this.getTemplate(dep, template.type);
      if (!depExists) {
        throw new Error(`Dependency "${dep}" not found. Install it first.`);
      }
    }

    // إضافة أو تحديث القالب
    if (existing) {
      const idx = index.templates.findIndex(t => t.id === template.id);
      index.templates[idx] = template;
    } else {
      index.templates.push(template);
    }

    await this.saveIndex(template.type, index);

    // حفظ ملف القالب الفعلي
    const templatePath = path.join(TEMPLATES_DIR, template.type + 's', `${template.id}.json`);
    await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
  }

  async uninstallTemplate(id: string, type: TemplateType): Promise<void> {
    const index = await this.loadIndex(type);
    const filtered = index.templates.filter(t => t.id !== id);
    
    if (filtered.length === index.templates.length) {
      throw new Error(`Template "${id}" not found.`);
    }

    index.templates = filtered;
    await this.saveIndex(type, index);

    const templatePath = path.join(TEMPLATES_DIR, type + 's', `${id}.json`);
    try {
      await fs.unlink(templatePath);
    } catch {
      // تجاهل إذا لم يكن الملف موجوداً
    }
  }

  async createTemplateFromAgent(agentId: string): Promise<Template> {
    const { loadAgent } = await import('./agent-utils.js');
    const agent = await loadAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found.`);
    }

    const template: Template = {
      id: `prompt-${agent.id}`,
      name: agent.name,
      type: 'prompt',
      description: `Prompt template extracted from agent: ${agent.name}`,
      tags: [agent.role, 'auto-generated'],
      config: {
        systemPrompt: agent.systemPrompt,
        model: agent.model,
      },
      dependencies: [],
      metadata: {
        createdAt: agent.createdAt,
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
        author: 'system',
        license: 'MIT',
        downloads: 0,
      },
    };

    return template;
  }

  async applyTemplateToAgent(templateId: string, agentId: string): Promise<void> {
    const { loadAgent, saveAgent } = await import('./agent-utils.js');
    
    // تحميل القالب
    const template = await this.getTemplate(templateId, 'prompt');
    if (!template) {
      throw new Error(`Template "${templateId}" not found.`);
    }

    // تحميل الوكيل
    const agent = await loadAgent(agentId);
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found.`);
    }

    // التحقق من التوافق
    const compatibility = validateTemplateForAgent(template, agent);
    if (!compatibility.compatible) {
      throw new Error(`Template is not compatible with agent:\n${compatibility.errors.join('\n')}`);
    }

    // تطبيق القالب
    if (template.config.systemPrompt) {
      agent.systemPrompt = template.config.systemPrompt;
    }

    if (template.config.model) {
      agent.model = template.config.model;
    }

    agent.updatedAt = new Date().toISOString();

    // حفظ الوكيل المحدث
    await saveAgent(agent);
  }

  async createAgentFromTemplate(templateId: string, agentName: string): Promise<string> {
    const { saveAgent, generateAgentId } = await import('./agent-utils.js');
    
    // تحميل القالب
    const template = await this.getTemplate(templateId, 'prompt');
    if (!template) {
      throw new Error(`Template "${templateId}" not found.`);
    }

    if (template.type !== 'prompt') {
      throw new Error(`Template "${templateId}" is not a prompt template.`);
    }

    // إنشاء وكيل جديد
    const agentId = generateAgentId(agentName);
    const now = new Date().toISOString();

    const newAgent: Agent = {
      id: agentId,
      name: agentName,
      role: template.tags[0] || 'custom',
      model: template.config.model || 'gpt-4',
      systemPrompt: template.config.systemPrompt || '',
      budget: { monthly: 100, used: 0 },
      status: 'inactive',
      skills: [],
      tools: [],
      maxConcurrentTasks: 2,
      createdAt: now,
      updatedAt: now,
    };

    await saveAgent(newAgent);

    return agentId;
  }
}

export const templateManager = new TemplateManager();
