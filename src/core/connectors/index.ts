import { connectorManager } from './manager.js';
import { WebSearchConnector } from './web-search.js';
import { SlackConnector } from './slack.js';

// تسجيل الموصلات المتاحة عند بدء التشغيل
connectorManager.register(new WebSearchConnector());
connectorManager.register(new SlackConnector());

export { connectorManager };
