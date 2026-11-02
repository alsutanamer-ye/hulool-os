import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { PluginManifest, InstalledPlugin, MarketplacePlugin } from '../../types/plugin.js';
import chalk from 'chalk';

const PLUGINS_DIR = path.join(process.cwd(), '.hulool', 'plugins');
const MARKETPLACE_DIR = path.join(process.cwd(), '.hulool', 'marketplace');
const INSTALLED_FILE = path.join(PLUGINS_DIR, 'installed.json');

export class PluginManager {
  async ensureDirs() {
    await fs.mkdir(PLUGINS_DIR, { recursive: true });
    await fs.mkdir(MARKETPLACE_DIR, { recursive: true });
  }

  // إنشاء حزمة إضافة جديدة
  async scaffold(manifest: PluginManifest, targetDir: string): Promise<void> {
    const pluginDir = path.join(targetDir, manifest.id);
    await fs.mkdir(pluginDir, { recursive: true });

    // حفظ Manifest
    await fs.writeFile(
      path.join(pluginDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // إنشاء ملف entry point بسيط
    const entryContent = `// ${manifest.name} v${manifest.version}
export default {
  init: async (config) => {
    console.log('[Plugin] ${manifest.name} initialized');
  },
  execute: async (context) => {
    // منطق الإضافة هنا
  }
};
`;
    await fs.writeFile(path.join(pluginDir, manifest.entryPoint), entryContent);

    // إنشاء README
    await fs.writeFile(
      path.join(pluginDir, 'README.md'),
      `# ${manifest.name}\n\n${manifest.description}\n\nAuthor: ${manifest.author.name}`
    );

    console.log(chalk.green(`✅ Plugin scaffolded at: ${pluginDir}`));
  }

  // فحص الإضافة قبل الرفع (Security & Lint)
  async validate(pluginPath: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const manifestPath = path.join(pluginPath, 'manifest.json');
      if (!await fs.access(manifestPath).then(() => true).catch(() => false)) {
        return { valid: false, errors: ['manifest.json not found'] };
      }

      const manifest: PluginManifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // فحوصات الأمان الأساسية
      if (manifest.permissions.includes('vault:write')) {
        errors.push('Warning: Plugin requests write access to Vault. Review carefully.');
      }

      if (manifest.dependencies) {
        for (const [pkg, version] of Object.entries(manifest.dependencies)) {
          if (version.includes('latest')) {
            errors.push(`Dependency "${pkg}" uses "latest". Pin to a specific version.`);
          }
        }
      }

      if (!manifest.minHuloolVersion) {
        errors.push('minHuloolVersion is required.');
      }

    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
    }

    return { valid: errors.length === 0, errors };
  }

  // رفع الإضافة للسوق (محلياً للمحاكاة)
  async publish(pluginPath: string): Promise<MarketplacePlugin> {
    const manifestPath = path.join(pluginPath, 'manifest.json');
    const manifest: PluginManifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

    const marketplacePlugin: MarketplacePlugin = {
      ...manifest,
      downloads: 0,
      rating: 0,
      reviewStatus: 'pending',
      publishedAt: new Date().toISOString(),
    };

    await this.ensureDirs();
    await fs.writeFile(
      path.join(MARKETPLACE_DIR, `${manifest.id}.json`),
      JSON.stringify(marketplacePlugin, null, 2)
    );

    return marketplacePlugin;
  }

  // تثبيت إضافة من السوق
  async install(pluginId: string): Promise<InstalledPlugin> {
    await this.ensureDirs();
    
    // البحث في السوق
    const marketPath = path.join(MARKETPLACE_DIR, `${pluginId}.json`);
    if (!await fs.access(marketPath).then(() => true).catch(() => false)) {
      throw new Error(`Plugin "${pluginId}" not found in marketplace`);
    }

    const marketPlugin: MarketplacePlugin = JSON.parse(await fs.readFile(marketPath, 'utf-8'));
    
    if (marketPlugin.reviewStatus !== 'approved') {
      throw new Error(`Plugin "${pluginId}" is not approved yet (Status: ${marketPlugin.reviewStatus})`);
    }

    // محاكاة نسخ الملفات (في الواقع سيتم تحميلها من URL)
    const installDir = path.join(PLUGINS_DIR, pluginId);
    await fs.mkdir(installDir, { recursive: true });
    
    // حفظ نسخة من Manifest كـ InstalledPlugin
    const installed: InstalledPlugin = {
      ...marketPlugin,
      status: 'installed',
      installedAt: new Date().toISOString(),
      config: {},
    };

    await fs.writeFile(
      path.join(installDir, 'manifest.json'),
      JSON.stringify(installed, null, 2)
    );

    // تحديث قائمة المثبتة
    let installedList: InstalledPlugin[] = [];
    try {
      const content = await fs.readFile(INSTALLED_FILE, 'utf-8');
      installedList = JSON.parse(content);
    } catch {}

    installedList.push(installed);
    await fs.writeFile(INSTALLED_FILE, JSON.stringify(installedList, null, 2));

    return installed;
  }

  // قائمة الإضافات المتاحة في السوق
  async listMarketplace(): Promise<MarketplacePlugin[]> {
    await this.ensureDirs();
    const files = await fs.readdir(MARKETPLACE_DIR);
    const plugins: MarketplacePlugin[] = [];
    
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(path.join(MARKETPLACE_DIR, file), 'utf-8');
      plugins.push(JSON.parse(content));
    }
    
    return plugins;
  }

  // قائمة الإضافات المثبتة
  async listInstalled(): Promise<InstalledPlugin[]> {
    try {
      const content = await fs.readFile(INSTALLED_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  // تفعيل/تعطيل إضافة
  async toggleStatus(pluginId: string, active: boolean): Promise<void> {
    const installedList = await this.listInstalled();
    const plugin = installedList.find(p => p.id === pluginId);
    
    if (!plugin) throw new Error(`Plugin "${pluginId}" not installed`);

    plugin.status = active ? 'active' : 'disabled';
    
    await fs.writeFile(INSTALLED_FILE, JSON.stringify(installedList, null, 2));
    
    // تحديث ملف الإضافة الفردي
    await fs.writeFile(
      path.join(PLUGINS_DIR, pluginId, 'manifest.json'),
      JSON.stringify(plugin, null, 2)
    );
  }

  // إلغاء التثبيت
  async uninstall(pluginId: string): Promise<void> {
    const installedList = await this.listInstalled();
    const filtered = installedList.filter(p => p.id !== pluginId);
    
    await fs.writeFile(INSTALLED_FILE, JSON.stringify(filtered, null, 2));
    
    // حذف المجلد
    try {
      await fs.rm(path.join(PLUGINS_DIR, pluginId), { recursive: true, force: true });
    } catch {}
  }
}

export const pluginManager = new PluginManager();
