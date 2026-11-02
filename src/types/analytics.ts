export interface AnalyticsSummary {
  period: { from: string; to: string };
  agents: {
    total: number;
    active: number;
    totalRuns: number;
    totalCost: number;
    totalTokens: number;
  };
  tasks: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    running: number;
    avgCost: number;
    totalCost: number;
  };
  workflows: {
    total: number;
    runs: number;
    successRate: number;
    avgDuration: number;
  };
  budget: {
    total: number;
    used: number;
    remaining: number;
    burnRate: number; // per day
    projectedExhaustion?: string;
  };
  topAgents: Array<{
    id: string;
    name: string;
    cost: number;
    runs: number;
  }>;
  costByDay: Array<{
    date: string;
    cost: number;
  }>;
}

export interface Report {
  id: string;
  type: 'summary' | 'detailed' | 'cost' | 'performance';
  title: string;
  generatedAt: string;
  data: any;
}
