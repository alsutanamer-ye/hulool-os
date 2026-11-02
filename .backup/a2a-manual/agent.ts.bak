import { Command } from 'commander';
import { agentCreateCommand } from './agent-create.js';
import { agentListCommand } from './agent-list.js';
import { agentInfoCommand } from './agent-info.js';
import { agentDelegateCommand } from './agent-delegate.js';

export const agentCommand = new Command('agent')
  .description('Manage AI agents')
  .addCommand(agentCreateCommand)
  .addCommand(agentListCommand)
  .addCommand(agentInfoCommand)
  .addCommand(agentDelegateCommand);
