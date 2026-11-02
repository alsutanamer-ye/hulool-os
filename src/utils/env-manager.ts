import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

const ENV_FILE = path.join(process.cwd(), '.env');

export async function loadEnv(): Promise<Record<string, string>> {
  try {
    await fs.access(ENV_FILE);
    dotenv.config({ path: ENV_FILE });
    return process.env as Record<string, string>;
  } catch {
    return {};
  }
}

export async function saveEnvVars(vars: Record<string, string>): Promise<void> {
  let existingContent = '';
  
  try {
    existingContent = await fs.readFile(ENV_FILE, 'utf-8');
  } catch {
    // الملف غير موجود، سننشئه
  }

  const lines = existingContent.split('\n');
  const envMap = new Map<string, string>();

  // قراءة المتغيرات الموجودة
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      envMap.set(match[1].trim(), match[2].trim());
    }
  }

  // تحديث أو إضافة المتغيرات الجديدة
  for (const [key, value] of Object.entries(vars)) {
    envMap.set(key, value);
  }

  // بناء المحتوى الجديد
  const newLines = Array.from(envMap.entries()).map(([key, value]) => `${key}=${value}`);
  const newContent = newLines.join('\n') + '\n';

  await fs.writeFile(ENV_FILE, newContent, 'utf-8');
}

export async function getEnvVar(key: string): Promise<string | undefined> {
  const env = await loadEnv();
  return env[key];
}

export async function hasEnvVar(key: string): Promise<boolean> {
  const value = await getEnvVar(key);
  return !!value && value.length > 0;
}

export async function removeEnvVar(key: string): Promise<void> {
  const env = await loadEnv();
  delete env[key];
  await saveEnvVars(env);
}
