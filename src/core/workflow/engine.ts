import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Workflow, WorkflowRun, WorkflowStep } from '../../types/workflow.js';
import { loadAgent } from '../../utils/agent-utils.js';
import { runAgent } from '../agent-runner.js';
import { globalA2ARouter } from '../a2a/router.js';

const WORKFLOWS_DIR = path.join(process.cwd(), '.hulool', 'workflows');
const RUNS_DIR = path.join(process.cwd(), '.hulool', 'workflow-runs');

export class WorkflowEngine {
  async ensureDirs() {
    await fs.mkdir(WORKFLOWS_DIR, { recursive: true });
    await fs.mkdir(RUNS_DIR, { recursive: true });
  }

  async create(workflow: Workflow): Promise<Workflow> {
    await this.ensureDirs();
    workflow.id = workflow.id || `wf-${uuidv4().slice(0, 8)}`;
    workflow.metadata = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runCount: 0,
      successRate: 0,
      avgDurationMs: 0,
    };
    await fs.writeFile(
      path.join(WORKFLOWS_DIR, `${workflow.id}.json`),
      JSON.stringify(workflow, null, 2)
    );
    return workflow;
  }

  async get(id: string): Promise<Workflow | null> {
    try {
      const content = await fs.readFile(path.join(WORKFLOWS_DIR, `${id}.json`), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async list(): Promise<Workflow[]> {
    await this.ensureDirs();
    const files = await fs.readdir(WORKFLOWS_DIR);
    const workflows: Workflow[] = [];
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(path.join(WORKFLOWS_DIR, file), 'utf-8');
      workflows.push(JSON.parse(content));
    }
    return workflows;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await fs.unlink(path.join(WORKFLOWS_DIR, `${id}.json`));
      return true;
    } catch {
      return false;
    }
  }

  async run(workflowId: string, input: Record<string, any> = {}, triggeredBy = 'manual'): Promise<WorkflowRun> {
    const workflow = await this.get(workflowId);
    if (!workflow) throw new Error(`Workflow "${workflowId}" not found`);
    if (workflow.status !== 'active') throw new Error(`Workflow is not active (status: ${workflow.status})`);

    await this.ensureDirs();
    const run: WorkflowRun = {
      id: `run-${uuidv4().slice(0, 8)}`,
      workflowId,
      status: 'running',
      input,
      stepResults: [],
      startedAt: new Date().toISOString(),
      totalCost: 0,
      totalTokens: 0,
      triggeredBy,
    };

    // حفظ حالة التشغيل الأولية
    await this.saveRun(run);

    try {
      // تنفيذ الخطوات بالتسلسل
      for (const step of workflow.steps) {
        const stepResult = await this.executeStep(step, workflow, input, run);
        run.stepResults.push(stepResult);
        
        if (stepResult.status === 'failed') {
          if (step.onError === 'abort') {
            run.status = 'failed';
            break;
          } else if (step.onError === 'continue') {
            continue;
          }
        }

        // دمج مخرجات الخطوة في المتغيرات
        if (stepResult.output) {
          Object.assign(input, { [`step_${step.id}`]: stepResult.output });
          run.totalCost += stepResult.cost || 0;
          run.totalTokens += stepResult.tokensUsed || 0;
        }

        await this.saveRun(run);
      }

      if (run.status === 'running') {
        run.status = 'completed';
      }
    } catch (error: any) {
      run.status = 'failed';
      run.output = { error: error.message };
    }

    run.completedAt = new Date().toISOString();
    await this.saveRun(run);

    // تحديث إحصائيات الـ workflow
    await this.updateWorkflowStats(workflow, run);

    return run;
  }

  private async executeStep(
    step: WorkflowStep,
    workflow: Workflow,
    input: Record<string, any>,
    run: WorkflowRun
  ): Promise<WorkflowRun['stepResults'][0]> {
    const result: WorkflowRun['stepResults'][0] = {
      stepId: step.id,
      status: 'running',
      startedAt: new Date().toISOString(),
    };

    try {
      if (step.type === 'agent' && step.agentId && step.prompt) {
        const agent = await loadAgent(step.agentId);
        if (!agent) throw new Error(`Agent "${step.agentId}" not found`);
        
        // استبدال المتغيرات في الـ prompt
        const resolvedPrompt = this.resolveVariables(step.prompt, { ...workflow.variables, ...input });
        
        const agentResult = await runAgent({ agent, taskDescription: resolvedPrompt });
        
        result.status = agentResult.success ? 'completed' : 'failed';
        result.output = agentResult.response;
        result.cost = agentResult.cost;
        result.tokensUsed = agentResult.tokensUsed;
        if (!agentResult.success) result.error = agentResult.error;
      } 
      else if (step.type === 'delay' && step.delayMs) {
        await new Promise(resolve => setTimeout(resolve, step.delayMs));
        result.status = 'completed';
        result.output = { delayed: step.delayMs };
      }
      else if (step.type === 'condition' && step.condition) {
        const conditionMet = this.evaluateCondition(step.condition, input);
        result.status = 'completed';
        result.output = { conditionMet };
        if (!conditionMet) result.status = 'skipped';
      }
      else if (step.type === 'a2a' && step.a2aAction && step.agentId) {
        const response = await globalA2ARouter.sendMessage({
          senderId: workflow.id,
          receiverId: step.agentId,
          intent: 'request',
          action: step.a2aAction,
          payload: input,
          requiresResponse: true,
        });
        result.status = response.intent === 'response' ? 'completed' : 'failed';
        result.output = response.payload;
      }
      else {
        throw new Error(`Invalid step configuration: ${step.type}`);
      }
    } catch (error: any) {
      result.status = 'failed';
      result.error = error.message;
    }

    result.completedAt = new Date().toISOString();
    return result;
  }

  private resolveVariables(template: string, vars: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
    });
  }

  private evaluateCondition(condition: string, vars: Record<string, any>): boolean {
    // تنفيذ بسيط للشرط (يمكن توسيعه لاحقاً)
    try {
      const fn = new Function(...Object.keys(vars), `return ${condition}`);
      return Boolean(fn(...Object.values(vars)));
    } catch {
      return false;
    }
  }

  private async saveRun(run: WorkflowRun) {
    await fs.writeFile(
      path.join(RUNS_DIR, `${run.id}.json`),
      JSON.stringify(run, null, 2)
    );
  }

  async getRun(runId: string): Promise<WorkflowRun | null> {
    try {
      const content = await fs.readFile(path.join(RUNS_DIR, `${runId}.json`), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async listRuns(workflowId?: string): Promise<WorkflowRun[]> {
    await this.ensureDirs();
    const files = await fs.readdir(RUNS_DIR);
    const runs: WorkflowRun[] = [];
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(path.join(RUNS_DIR, file), 'utf-8');
      const run = JSON.parse(content);
      if (!workflowId || run.workflowId === workflowId) {
        runs.push(run);
      }
    }
    return runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  private async updateWorkflowStats(workflow: Workflow, run: WorkflowRun) {
    const duration = run.completedAt 
      ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
      : 0;
    
    const totalRuns = workflow.metadata.runCount + 1;
    const successfulRuns = run.status === 'completed' 
      ? Math.round(workflow.metadata.successRate * workflow.metadata.runCount / 100) + 1
      : Math.round(workflow.metadata.successRate * workflow.metadata.runCount / 100);
    
    workflow.metadata.runCount = totalRuns;
    workflow.metadata.successRate = (successfulRuns / totalRuns) * 100;
    workflow.metadata.lastRunAt = run.startedAt;
    workflow.metadata.avgDurationMs = 
      (workflow.metadata.avgDurationMs * (totalRuns - 1) + duration) / totalRuns;
    workflow.metadata.updatedAt = new Date().toISOString();

    await fs.writeFile(
      path.join(WORKFLOWS_DIR, `${workflow.id}.json`),
      JSON.stringify(workflow, null, 2)
    );
  }
}

export const workflowEngine = new WorkflowEngine();
