import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getEnvVar, saveEnvVars } from './env-manager.js';

const VAULT_FILE = path.join(process.cwd(), '.hulool', 'vault.json');

// الحصول على مفتاح التشفير أو إنشاء واحد جديد
async function getVaultKey(): Promise<string> {
  let key = await getEnvVar('HULOOl_VAULT_KEY');
  if (!key || key.length < 32) {
    key = crypto.randomBytes(32).toString('hex');
    await saveEnvVars({ HULOOl_VAULT_KEY: key });
  }
  return key;
}

async function ensureVaultDir() {
  const dir = path.dirname(VAULT_FILE);
  await fs.mkdir(dir, { recursive: true });
}

export async function encryptSecret(value: string): Promise<string> {
  const key = await getVaultKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return JSON.stringify({
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag
  });
}

export async function decryptSecret(encryptedJson: string): Promise<string> {
  const key = await getVaultKey();
  const { iv, encryptedData, authTag } = JSON.parse(encryptedJson);
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export async function setSecret(keyName: string, value: string): Promise<void> {
  await ensureVaultDir();
  let vault: Record<string, string> = {};
  
  try {
    const content = await fs.readFile(VAULT_FILE, 'utf-8');
    vault = JSON.parse(content);
  } catch {
    // الملف غير موجود، نبدأ بجديد
  }
  
  vault[keyName] = await encryptSecret(value);
  await fs.writeFile(VAULT_FILE, JSON.stringify(vault, null, 2), 'utf-8');
}

export async function getSecret(keyName: string): Promise<string | null> {
  try {
    const content = await fs.readFile(VAULT_FILE, 'utf-8');
    const vault = JSON.parse(content);
    
    if (vault[keyName]) {
      return await decryptSecret(vault[keyName]);
    }
    return null;
  } catch {
    return null;
  }
}

export async function listSecrets(): Promise<string[]> {
  try {
    const content = await fs.readFile(VAULT_FILE, 'utf-8');
    const vault = JSON.parse(content);
    return Object.keys(vault);
  } catch {
    return [];
  }
}

export async function deleteSecret(keyName: string): Promise<boolean> {
  try {
    const content = await fs.readFile(VAULT_FILE, 'utf-8');
    const vault = JSON.parse(content);
    
    if (vault[keyName]) {
      delete vault[keyName];
      await fs.writeFile(VAULT_FILE, JSON.stringify(vault, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
