export type PluginStatus = 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'installed' | 'disabled';
export type PluginCategory = 'integration' | 'utility' | 'ai' | 'analytics' | 'security' | 'workflow';

export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: {
    name: string;
    email: string;
    website?: string;
  };
  icon: string; // Lucide icon name or SVG path
  category: PluginCategory;
  tags: string[];
  homepage?: string;
  repository?: string;
  license: string;
}

export interface PluginConfig {
  settings: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'select';
    label: string;
    default?: any;
    required?: boolean;
    options?: string[]; // for select type
    description?: string;
  }>;
  permissions: string[]; // e.g., ['vault:read', 'agents:write']
  dependencies: string[]; // other plugin IDs
}

export interface PluginManifest extends PluginMetadata {
  status: PluginStatus;
  config: PluginConfig;
  entryPoint: string; // main file path
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  downloads: number;
  rating: number;
}

export interface InstalledPlugin extends PluginManifest {
  installedAt: string;
  enabled: boolean;
  settingsValues: Record<string, any>;
}
