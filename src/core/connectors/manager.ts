import type { IConnector, ConnectorConfig, ConnectorStatus } from '../../types/connector.js';
import { getSecret, setSecret } from '../../utils/vault.js';

export class ConnectorManager {
  private registry: Map<string, IConnector> = new Map();
  private activeConfigs: Map<string, ConnectorConfig> = new Map();

  register(connector: IConnector): void {
    this.registry.set(connector.id, connector);
  }

  getConnector(id: string): IConnector | undefined {
    return this.registry.get(id);
  }

  listConnectors(): { id: string; name: string; description: string; status: Promise<ConnectorStatus> }[] {
    return Array.from(this.registry.values()).map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.getStatus(),
    }));
  }

  async configure(id: string, credentials: Record<string, string>): Promise<boolean> {
    const connector = this.getConnector(id);
    if (!connector) throw new Error(`Connector "${id}" not found.`);

    // التحقق من وجود المتغيرات المطلوبة
    for (const envVar of connector.requiredEnvVars) {
      if (!credentials[envVar]) {
        throw new Error(`Missing required credential: ${envVar}`);
      }
    }

    // حفظ المفاتيح بشكل مشفر في Vault
    for (const [key, value] of Object.entries(credentials)) {
      await setSecret(`${id}_${key}`, value);
    }

    const config: ConnectorConfig = {
      id,
      name: connector.name,
      credentials,
    };

    const isAuthenticated = await connector.authenticate(config);
    if (isAuthenticated) {
      this.activeConfigs.set(id, config);
    }

    return isAuthenticated;
  }

  async execute(id: string, action: string, params: Record<string, any>) {
    const connector = this.getConnector(id);
    if (!connector) throw new Error(`Connector "${id}" not found.`);

    // استرجاع المفاتيح المشفرة عند التنفيذ
    const config = this.activeConfigs.get(id);
    if (!config) {
      // محاولة إعادة بناء الكونفيج من Vault
      const creds: Record<string, string> = {};
      for (const envVar of connector.requiredEnvVars) {
        const secret = await getSecret(`${id}_${envVar}`);
        if (secret) creds[envVar] = secret;
      }
      
      if (Object.keys(creds).length === 0) {
        throw new Error(`Connector "${id}" is not configured. Run: hulool connector auth ${id}`);
      }
      
      await connector.authenticate({ id, name: connector.name, credentials: creds });
    }

    return await connector.execute(action, params);
  }
}

export const connectorManager = new ConnectorManager();
