import type { Template } from '../types/template.js';
import type { Agent } from '../types/agent.js';

export function validateTemplateForAgent(template: Template, agent: Agent): CompatibilityReport {
  const report: CompatibilityReport = {
    compatible: true,
    warnings: [],
    errors: [],
    suggestions: [],
  };

  // 1. التحقق من نوع القالب
  if (template.type !== 'prompt') {
    report.errors.push(`Template type "${template.type}" cannot be applied to an agent. Only "prompt" templates are compatible.`);
    report.compatible = false;
    return report;
  }

  // 2. التحقق من النظام prompt
  if (!template.config.systemPrompt || template.config.systemPrompt.trim() === '') {
    report.errors.push('Template must have a valid systemPrompt.');
    report.compatible = false;
  }

  // 3. التحقق من النموذج
  if (template.config.model && agent.model !== template.config.model) {
    report.warnings.push(`Template uses model "${template.config.model}" but agent uses "${agent.model}". The agent's model will be preserved unless explicitly changed.`);
  }

  // 4. التحقق من التبعيات
  if (template.dependencies && template.dependencies.length > 0) {
    report.warnings.push(`Template has ${template.dependencies.length} dependencies that may need to be installed.`);
    report.suggestions.push('Run: hulool template list to check available dependencies');
  }

  // 5. التحقق من التوافق مع النماذج المطلوبة
  if (template.compatibility?.requiredModels && template.compatibility.requiredModels.length > 0) {
    if (!template.compatibility.requiredModels.includes(agent.model)) {
      report.warnings.push(`Template recommends models: ${template.compatibility.requiredModels.join(', ')}. Agent uses: ${agent.model}`);
    }
  }

  // 6. التحقق من التعارضات
  if (template.compatibility?.conflictsWith && template.compatibility.conflictsWith.length > 0) {
    for (const conflict of template.compatibility.conflictsWith) {
      if (agent.tags?.includes(conflict)) {
        report.errors.push(`Template conflicts with agent tag: ${conflict}`);
        report.compatible = false;
      }
    }
  }

  // 7. التحقق من المهارات المطلوبة
  if (template.compatibility?.requiredSkills && template.compatibility.requiredSkills.length > 0) {
    const missingSkills = template.compatibility.requiredSkills.filter(
      skill => !agent.skills.includes(skill)
    );
    
    if (missingSkills.length > 0) {
      report.warnings.push(`Agent is missing recommended skills: ${missingSkills.join(', ')}`);
      report.suggestions.push(`Add skills with: hulool agent update ${agent.id} --skills ${missingSkills.join(',')}`);
    }
  }

  // 8. التحقق من طول النظام prompt
  if (template.config.systemPrompt && template.config.systemPrompt.length > 10000) {
    report.warnings.push('System prompt is very long (>10,000 characters). This may affect performance and cost.');
  }

  return report;
}

export function validateTemplateForCreation(template: Template): CompatibilityReport {
  const report: CompatibilityReport = {
    compatible: true,
    warnings: [],
    errors: [],
    suggestions: [],
  };

  // 1. التحقق من الحقول المطلوبة
  if (!template.id || template.id.trim() === '') {
    report.errors.push('Template must have a valid ID.');
    report.compatible = false;
  }

  if (!template.name || template.name.trim() === '') {
    report.errors.push('Template must have a valid name.');
    report.compatible = false;
  }

  if (!template.type) {
    report.errors.push('Template must have a type.');
    report.compatible = false;
  }

  // 2. التحقق من نوع القالب
  const validTypes = ['prompt', 'tool', 'skill', 'plugin', 'module'];
  if (!validTypes.includes(template.type)) {
    report.errors.push(`Invalid template type: ${template.type}. Must be one of: ${validTypes.join(', ')}`);
    report.compatible = false;
  }

  // 3. التحقق من التكوين حسب النوع
  if (template.type === 'prompt') {
    if (!template.config.systemPrompt || template.config.systemPrompt.trim() === '') {
      report.errors.push('Prompt template must have a systemPrompt.');
      report.compatible = false;
    }
  }

  if (template.type === 'tool') {
    if (!template.config.toolDefinition) {
      report.errors.push('Tool template must have a toolDefinition.');
      report.compatible = false;
    }
  }

  if (template.type === 'skill') {
    if (!template.config.capabilities || template.config.capabilities.length === 0) {
      report.warnings.push('Skill template has no capabilities defined.');
    }
  }

  // 4. التحقق من metadata
  if (!template.metadata.version) {
    report.warnings.push('Template has no version. Defaulting to 1.0.0');
    template.metadata.version = '1.0.0';
  }

  if (!template.metadata.author) {
    report.warnings.push('Template has no author. Defaulting to "unknown"');
    template.metadata.author = 'unknown';
  }

  return report;
}
