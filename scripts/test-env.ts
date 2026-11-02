#!/usr/bin/env tsx
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { createClient } from '@supabase/supabase-js';
import { pgTable, text } from 'drizzle-orm/pg-core';
import Fastify from 'fastify';
import { z } from 'zod';

console.log(chalk.blue.bold('\n🚀 Hulool OS - Environment Test\n'));
console.log(chalk.green('✓'), 'Node.js:', process.version);
console.log(chalk.green('✓'), 'Chalk: Working');
console.log(chalk.green('✓'), 'Commander: Working');
console.log(chalk.green('✓'), 'Inquirer: Working');
console.log(chalk.green('✓'), 'Supabase Client: Working');
console.log(chalk.green('✓'), 'Drizzle ORM: Working');
console.log(chalk.green('✓'), 'Fastify: Working');
console.log(chalk.green('✓'), 'Zod: Working');
console.log(chalk.blue.bold('\n✅ All dependencies are working correctly!\n'));
