import fs from 'fs/promises';
import path from 'path';

type TemplateType = 'prompt' | 'tool' | 'skill' | 'plugin' | 'module';

const ROOT = process.cwd();
const TEMPLATES_DIR = path.join(ROOT, 'templates');

const TYPE_DIRS: Record<TemplateType, string> = {
  prompt: 'prompts',
  tool: 'tools',
  skill: 'skills',
  plugin: 'plugins',
  module: 'modules',
};

interface AnyTemplate {
  id?: string;
  name?: string;
  type?: TemplateType;
  description?: string;
  tags?: string[];
  config?: Record<string, unknown>;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

function isValidTemplate(template: AnyTemplate, expectedType: TemplateType): string[] {
  const errors: string[] = [];

  if (!template.id) errors.push('Missing id');
  if (!template.name) errors.push('Missing name');
  if (!template.type) errors.push('Missing type');
  if (template.type !== expectedType) {
    errors.push(`Invalid type: expected ${expectedType}, got ${template.type}`);
  }

  if (!template.config) {
    errors.push('Missing config');
  }

  if (template.type === 'prompt') {
    const systemPrompt = template.config?.systemPrompt;
    if (typeof systemPrompt !== 'string' || systemPrompt.trim().length === 0) {
      errors.push('Prompt template requires config.systemPrompt');
    }
  }

  if (template.type === 'tool') {
    if (!template.config?.toolDefinition) {
      errors.push('Tool template requires config.toolDefinition');
    }
  }

  return errors;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function rebuildType(type: TemplateType) {
  const dirName = TYPE_DIRS[type];
  const dirPath = path.join(TEMPLATES_DIR, dirName);

  await ensureDir(dirPath);

  const files = await fs.readdir(dirPath);
  const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'index.json');

  const templates: AnyTemplate[] = [];
  const invalid: Array<{ file: string; errors: string[] }> = [];

  for (const file of jsonFiles) {
    const fullPath = path.join(dirPath, file);

    try {
      const raw = await fs.readFile(fullPath, 'utf-8');
      const template = JSON.parse(raw) as AnyTemplate;

      const errors = isValidTemplate(template, type);

      if (errors.length > 0) {
        invalid.push({ file, errors });
        continue;
      }

      templates.push(template);
    } catch (error) {
      invalid.push({
        file,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  const index = {
    version: '1.0.0',
    type,
    templates,
    lastUpdated: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(dirPath, 'index.json'),
    JSON.stringify(index, null, 2),
    'utf-8'
  );

  console.log(`✅ ${type}: ${templates.length} template(s)`);

  if (invalid.length > 0) {
    console.log(`⚠️  ${type}: ${invalid.length} invalid template(s)`);
    for (const item of invalid) {
      console.log(`   - ${item.file}`);
      for (const err of item.errors) {
        console.log(`     • ${err}`);
      }
    }
  }
}

async function main() {
  console.log('🔄 Rebuilding Hulool template indexes...\n');

  await ensureDir(TEMPLATES_DIR);

  for (const type of Object.keys(TYPE_DIRS) as TemplateType[]) {
    await rebuildType(type);
  }

  console.log('\n✅ Template indexes rebuilt successfully.');
}

main().catch(error => {
  console.error('❌ Failed to rebuild template indexes:', error);
  process.exit(1);
});
