export type TemplateType = 'prompt' | 'tool' | 'skill' | 'plugin' | 'module';

export interface TemplateMetadata {
  createdAt: string;
  updatedAt: string;
  version: string;
  author: string;
  license: string;
  downloads: number;
  rating?: number;
}

export interface TemplateConfig {
  // للـ prompts
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  
  // للـ tools
  toolDefinition?: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
  
  // للـ skills
  capabilities?: string[];
  
  // للـ plugins
  endpoints?: string[];
  authentication?: 'api-key' | 'oauth' | 'none';
  
  // للـ modules
  workflow?: any[];
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  description: string;
  tags: string[];
  config: TemplateConfig;
  dependencies: string[];
  metadata: TemplateMetadata;
  
  // حقول جديدة للتحقق من التوافق
  compatibility?: {
    minAgentVersion?: string;
    requiredModels?: string[];
    requiredSkills?: string[];
    conflictsWith?: string[];
  };
}

export interface TemplateIndex {
  templates: Template[];
  lastUpdated: string;
}

export interface CompatibilityReport {
  compatible: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
}
