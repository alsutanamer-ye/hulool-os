import fs from 'fs/promises';
import path from 'path';
import type { Agent } from '../types/agent.js';
import { getStorageType, getAgentRepository } from '../db/storage.js';

export function generateAgentId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

export function getAgentsDir(projectRoot: string = process.cwd()): string {
  return path.join(projectRoot, 'agents');
}

export async function ensureAgentsDir(projectRoot: string = process.cwd()): Promise<string> {
  const agentsDir = getAgentsDir(projectRoot);
  await fs.mkdir(agentsDir, { recursive: true });
  return agentsDir;
}

export async function saveAgent(agent: Agent, projectRoot: string = process.cwd()): Promise<string> {
  // إذا كان التخزين Supabase، استخدم المستودع
  if (getStorageType() === 'supabase') {
    const repo = getAgentRepository();
    if (repo) {
      await repo.create({
        name: agent.name,
        role: agent.role,
        model: agent.model,
        systemPrompt: agent.systemPrompt,
        budget: { monthly: agent.budget.monthly, used: agent.budget.used },
        status: agent.status,
        skills: agent.skills,
        tools: agent.tools,
        maxConcurrentTasks: agent.maxConcurrentTasks,
      });
      return `supabase:agents/${agent.id}`;
    }
  }

  // JSON fallback
  const agentsDir = await ensureAgentsDir(projectRoot);
  const filePath = path.join(agentsDir, `${agent.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(agent, null, 2));
  return filePath;
}

export async function loadAgent(id: string, projectRoot: string = process.cwd()): Promise<Agent | null> {
  // إذا كان التخزين Supabase، استخدم المستودع
  if (getStorageType() === 'supabase') {
    const repo = getAgentRepository();
    if (repo) {
      const dbAgent = await repo.findById(id);
      if (dbAgent) {
        return repo.toAgentType(dbAgent);
      }
      return null;
    }
  }

  // JSON fallback
  const filePath = path.join(getAgentsDir(projectRoot), `${id}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function loadAllAgents(projectRoot: string = process.cwd()): Promise<Agent[]> {
  // إذا كان التخزين Supabase، استخدم المستودع
  if (getStorageType() === 'supabase') {
    const repo = getAgentRepository();
    if (repo) {
      const dbAgents = await repo.findAll();
      return dbAgents.map(a => repo.toAgentType(a));
    }
  }

  // JSON fallback
  const agentsDir = getAgentsDir(projectRoot);
  try {
    const files = await fs.readdir(agentsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const agents: Agent[] = [];
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(agentsDir, file), 'utf-8');
        agents.push(JSON.parse(content));
      } catch {}
    }
    return agents;
  } catch {
    return [];
  }
}

export async function agentExists(id: string, projectRoot: string = process.cwd()): Promise<boolean> {
  // إذا كان التخزين Supabase، استخدم المستودع
  if (getStorageType() === 'supabase') {
    const repo = getAgentRepository();
    if (repo) {
      return repo.exists(id);
    }
  }

  // JSON fallback
  const filePath = path.join(getAgentsDir(projectRoot), `${id}.json`);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function updateAgentBudget(id: string, additionalCost: number): Promise<void> {
  // إذا كان التخزين Supabase، استخدم المستودع
  if (getStorageType() === 'supabase') {
    const repo = getAgentRepository();
    if (repo) {
      await repo.updateBudget(id, additionalCost);
      return;
    }
  }

  // JSON fallback
  const agent = await loadAgent(id);
  if (agent) {
    agent.budget.used += additionalCost;
    agent.updatedAt = new Date().toISOString();
    await saveAgent(agent);
  }
}
