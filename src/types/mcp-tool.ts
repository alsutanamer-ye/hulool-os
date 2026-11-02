export interface McpToolConfig {
  id: string;
  name: string;
  description: string;
  category: 'search' | 'filesystem' | 'database' | 'communication' | 'utility';
  command: string;
  args: string[];
  envVars?: string[]; // متغيرات البيئة المطلوبة (مثل API_KEY)
  website?: string;
  version: string;
}

export interface InstalledMcpTool extends McpToolConfig {
  installedAt: string;
  status: 'active' | 'inactive' | 'error';
}

export interface McpMarketplaceIndex {
  tools: McpToolConfig[];
  lastUpdated: string;
}
