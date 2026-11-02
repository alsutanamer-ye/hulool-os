import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMMANDS_DIR = path.join(__dirname, 'commands');

/**
 * يبحث تلقائياً عن جميع ملفات الأوامر ويقوم بتحميلها
 */
export async function loadAllCommands(program: Command): Promise<void> {
  const commands = await scanDirectory(COMMANDS_DIR);
  
  for (const cmdModule of commands) {
    try {
      // نفترض أن كل ملف يصدر متغير باسم ينتهي بـ 'Command'
      // مثال: agent.ts يصدر agentCommand
      const commandInstance = cmdModule.default || Object.values(cmdModule)[0];
      
      if (commandInstance && commandInstance instanceof Command) {
        program.addCommand(commandInstance);
        console.log(`✅ Loaded command: ${commandInstance.name()}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load command module: ${cmdModule.path}`, error);
    }
  }
}

async function scanDirectory(dir: string): Promise<any[]> {
  const results: any[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // بحث متكرر داخل المجلدات الفرعية
      results.push(...await scanDirectory(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.startsWith('_')) {
      // تجاهل الملفات التي تبدأ بـ _ (ملفات مساعدة)
      try {
        const module = await import(pathToFileURL(fullPath).href);
        results.push({ ...module, path: fullPath });
      } catch (e) {
        console.error(`Error importing ${fullPath}:`, e);
      }
    }
  }
  return results;
}

function pathToFileURL(filePath: string): URL {
  return new URL(`file://${filePath}`);
}
