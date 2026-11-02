import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { AnalyticsSummary, Report } from '../../types/analytics.js';
import { loadAllAgents } from '../../utils/agent-utils.js';
import { loadAllTasks } from '../../utils/task-utils.js';
import { workflowEngine } from '../workflow/engine.js';

const REPORTS_DIR = path.join(process.cwd(), '.hulool', 'reports');

export class AnalyticsEngine {
  async ensureDirs() {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  }

  async generateSummary(days = 30): Promise<AnalyticsSummary> {
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [agents, tasks, workflows, workflowRuns] = await Promise.all([
      loadAllAgents(),
      loadAllTasks(),
      workflowEngine.list(),
      workflowEngine.listRuns(),
    ]);

    // فلترة المهام حسب الفترة
    const periodTasks = tasks.filter(t => {
      const taskDate = new Date(t.createdAt);
      return taskDate >= from && taskDate <= now;
    });

    // حساب إحصائيات الوكلاء
    const activeAgents = agents.filter(a => a.status === 'active');
    const totalCost = agents.reduce((sum, a) => sum + a.budget.used, 0);
    const totalBudget = agents.reduce((sum, a) => sum + a.budget.monthly, 0);
    const totalTokens = tasks.reduce((sum, t) => sum + (t.tokensUsed || 0), 0);

    // حساب إحصائيات المهام
    const completedTasks = periodTasks.filter(t => t.status === 'completed');
    const failedTasks = periodTasks.filter(t => t.status === 'failed');
    const pendingTasks = periodTasks.filter(t => t.status === 'pending');
    const runningTasks = periodTasks.filter(t => t.status === 'running');
    const taskCost = periodTasks.reduce((sum, t) => sum + (t.cost || 0), 0);

    // حساب إحصائيات الـ workflows
    const totalWorkflowRuns = workflowRuns.length;
    const successfulRuns = workflowRuns.filter(r => r.status === 'completed').length;
    const avgWorkflowDuration = workflowRuns.reduce((sum, r) => {
      if (r.completedAt && r.startedAt) {
        return sum + (new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime());
      }
      return sum;
    }, 0) / (totalWorkflowRuns || 1);

    // أفضل الوكلاء حسب التكلفة
    const topAgents = agents
      .map(a => ({
        id: a.id,
        name: a.name,
        cost: a.budget.used,
        runs: 0, // يمكن حسابها من المهام لاحقاً
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    // التكلفة اليومية
    const costByDay: Array<{ date: string; cost: number }> = [];
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = tasks.filter(t => t.createdAt.startsWith(dateStr));
      const dayCost = dayTasks.reduce((sum, t) => sum + (t.cost || 0), 0);
      costByDay.push({ date: dateStr, cost: dayCost });
    }
    costByDay.reverse();

    // معدل الحرق اليومي
    const burnRate = totalCost / days;
    const remaining = totalBudget - totalCost;
    const daysUntilExhaustion = burnRate > 0 ? remaining / burnRate : Infinity;
    const projectedExhaustion = daysUntilExhaustion < Infinity
      ? new Date(now.getTime() + daysUntilExhaustion * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    return {
      period: { from: from.toISOString(), to: now.toISOString() },
      agents: {
        total: agents.length,
        active: activeAgents.length,
        totalRuns: tasks.length,
        totalCost,
        totalTokens,
      },
      tasks: {
        total: periodTasks.length,
        completed: completedTasks.length,
        failed: failedTasks.length,
        pending: pendingTasks.length,
        running: runningTasks.length,
        avgCost: periodTasks.length > 0 ? taskCost / periodTasks.length : 0,
        totalCost: taskCost,
      },
      workflows: {
        total: workflows.length,
        runs: totalWorkflowRuns,
        successRate: totalWorkflowRuns > 0 ? (successfulRuns / totalWorkflowRuns) * 100 : 0,
        avgDuration: avgWorkflowDuration,
      },
      budget: {
        total: totalBudget,
        used: totalCost,
        remaining,
        burnRate,
        projectedExhaustion,
      },
      topAgents,
      costByDay,
    };
  }

  async saveReport(report: Report): Promise<void> {
    await this.ensureDirs();
    await fs.writeFile(
      path.join(REPORTS_DIR, `${report.id}.json`),
      JSON.stringify(report, null, 2)
    );
  }

  async generateAndSave(type: 'summary' | 'detailed' | 'cost' | 'performance', days = 30): Promise<Report> {
    const summary = await this.generateSummary(days);
    
    const report: Report = {
      id: `report-${uuidv4().slice(0, 8)}`,
      type,
      title: `${type} Report - ${new Date().toISOString().split('T')[0]}`,
      generatedAt: new Date().toISOString(),
      data: summary,
    };

    await this.saveReport(report);
    return report;
  }

  async listReports(): Promise<Report[]> {
    await this.ensureDirs();
    const files = await fs.readdir(REPORTS_DIR);
    const reports: Report[] = [];
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(path.join(REPORTS_DIR, file), 'utf-8');
      reports.push(JSON.parse(content));
    }
    return reports.sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }
}

export const analyticsEngine = new AnalyticsEngine();
