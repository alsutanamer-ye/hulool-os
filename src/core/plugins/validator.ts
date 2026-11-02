import type { PluginManifest } from '../../types/plugin.js';
import chalk from 'chalk';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PluginValidator {
  validate(manifest: Partial<PluginManifest>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // التحقق من الحقول المطلوبة
    if (!manifest.name || manifest.name.trim() === '') {
      errors.push('Plugin name is required');
    }
    if (!manifest.description || manifest.description.trim() === '') {
      errors.push('Plugin description is required');
    }
    if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push('Version must follow semver format (e.g., 1.0.0)');
    }
    if (!manifest.author?.name) {
      errors.push('Author name is required');
    }
    if (!manifest.author?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manifest.author.email)) {
      errors.push('Valid author email is required');
    }
    if (!manifest.icon) {
      warnings.push('No icon specified. Consider adding a Lucide icon name.');
    }
    if (!manifest.category) {
      errors.push('Category is required');
    }
    if (!manifest.license) {
      warnings.push('No license specified. Consider adding MIT, Apache-2.0, etc.');
    }
    if (!manifest.entryPoint) {
      errors.push('Entry point (main file) is required');
    }

    // التحقق من التصنيف
    const validCategories = ['integration', 'utility', 'ai', 'analytics', 'security', 'workflow'];
    if (manifest.category && !validCategories.includes(manifest.category)) {
      errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    // التحقق من الإعدادات
    if (manifest.config?.settings) {
      for (const [key, setting] of Object.entries(manifest.config.settings)) {
        if (!setting.type || !['string', 'number', 'boolean', 'select'].includes(setting.type)) {
          errors.push(`Setting "${key}" has invalid type`);
        }
        if (setting.type === 'select' && (!setting.options || setting.options.length === 0)) {
          errors.push(`Select setting "${key}" must have options`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  printResult(result: ValidationResult) {
    if (result.valid) {
      console.log(chalk.green('\n✅ Validation passed!'));
    } else {
      console.log(chalk.red('\n❌ Validation failed:'));
      result.errors.forEach(err => console.log(chalk.red(`   • ${err}`)));
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      result.warnings.forEach(warn => console.log(chalk.yellow(`   • ${warn}`)));
    }
  }
}

export const pluginValidator = new PluginValidator();
