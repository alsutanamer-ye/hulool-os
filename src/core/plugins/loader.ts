import fs from 'fs/promises';
import path from 'path';
import type { PluginManifest, InstalledPlugin } from '../../types/plugin.js';

const INSTALLED_PLUGINS_DIR = path.join(process.cwd(), '.hulool', 'installed-plugins');
const CONFIG_FILE = path.join(INSTALLED_PLUGINS_DIR, 'config.json');

export class PluginLoader {
  async ensureDirs() {
    await fs.mkdir(INSTALLED_PLUGINS_DIR, { recursive: true });
  }

  async getInstalled(): Promise<InstalledPlugin[]> {
    try {
      const content = await fs.readFile(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async install(pluginId: string): Promise<void> {
    await this.ensureDirs();
    
    // البحث عن الإضافة في السوق المحلي
    const marketplaceDir = path.join(process.cwd(), '.hulool', 'plugins-marketplace', pluginId);
    const manifestPath = path.join(marketplaceDir, 'manifest.json');
    
    if (!await fs.access(manifestPath).then(() => true).catch(() => false)) {
      throw new Error(`Plugin "${pluginId}" not found in marketplace`);
    }

    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent) as PluginManifest;

    // نسخ الإضافة إلى مجلد التثبيت
    const targetDir = path.join(INSTALLED_PLUGINS_DIR, pluginId);
    await fs.cp(marketplaceDir, targetDir, { recursive: true });

    // حفظ في قائمة المثبتة
    const installed = await this.getInstalled();
    const existingIndex = installed.findIndex(p => p.id === pluginId);
    
    const installedPlugin: InstalledPlugin = {
      ...manifest,
      installedAt: new Date().toISOString(),
      settings: {},
      isActive: false, // معطل افتراضياً حتى يتم إعداده
    };

    if (existingIndex >= 0) {
      installed[existingIndex] = installedPlugin;
    } else {
      installed.push(installedPlugin);
    }

    await fs.writeFile(CONFIG_FILE, JSON.stringify(installed, null, 2));
  }

  async uninstall(pluginId: string): Promise<void> {
    const installed = await this.getInstalled();
    const filtered = installed.filter(p => p.id !== pluginId);
    
    if (filtered.length === installed.length) {
      throw new Error(`Plugin "${pluginId}" is not installed`);
    }

    await fs.writeFile(CONFIG_FILE, JSON.stringify(filtered, null, 2));
    
    // حذف الملفات
    const targetDir = path.join(INSTALLED_PLUGINS_DIR, pluginId);
    await fs.rm(targetDir, { recursive: true, force: true });
  }

  async configure(pluginId: string, settings: Record<string, any>): Promise<void> {
    const installed = await this.getInstalled();
    const plugin = installed.find(p => p.id === pluginId);
    
    if (!plugin) throw new Error(`Plugin "${pluginId}" not found`);

    plugin.settings = { ...plugin.settings, ...settings };
    await fs.writeFile(CONFIG_FILE, JSON.stringify(installed, null, 2));
  }

  async activate(pluginId: string): Promise<void> {
    const installed = await this.getInstalled();
    const plugin = installed.find(p => p.id === pluginId);
    
    if (!plugin) throw new Error(`Plugin "${pluginId}" not found`);

    plugin.isActive = true;
    await fs.writeFile(CONFIG_FILE, JSON.stringify(installed, null, 2));
    
    // هنا يمكن استدعاء دالة init الخاصة بالإضافة إذا كانت موجودة
    console.log(`Plugin ${pluginId} activated.`);
  }

  async deactivate(pluginId: string): Promise<void> {
    const installed = await this.getInstalled();
    const plugin = installed.find(p => p.id === pluginId);
    
    if (!plugin) throw new Error(`Plugin "${pluginId}" not found`);

    plugin.isActive = false;
    await fs.writeFile(CONFIG_FILE, JSON.stringify(installed, null, 2));
  }
}

export const pluginLoader = new PluginLoader();
