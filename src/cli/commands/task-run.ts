import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import {
  loadTask,
  saveTask,
} from '../../utils/task-utils.js';
import { loadAgent, saveAgent, updateAgentBudget } from '../../utils/agent-utils.js';
import { runAgent } from '../../core/agent-runner.js';
import { icons } from '../../utils/icons.js';
import type { Task } from '../../types/task.js';

const LOGS_DIR = path.join(process.cwd(), 'logs');

export const taskRunCommand = new Command('run')
  .description('Execute a task using its assigned agent')
  .argument('<task-id>', 'Task ID to execute')
  .option('--dry-run', 'Simulate execution without calling LLM')
  .option('--verbose', 'Show detailed execution logs')
  .action(async (taskId: string, options: { dryRun?: boolean; verbose?: boolean }) => {
    console.log(chalk.blue.bold('\n🚀 Run Task\n'));

    // 1. تحميل المهمة
    const spinner = ora(`${icons.refresh} تحميل المهمة "${taskId}"...`).start();
    let task: Task | null;
    try {
      task = await loadTask(taskId);
    } catch (err) {
      spinner.fail('فشل في تحميل المهمة');
      console.error(chalk.red('Error:'), err);
      process.exit(1);
    }

    if (!task) {
      spinner.fail(`المهمة "${taskId}" غير موجودة`);
      console.error(chalk.red(`\n💡 أنشئ مهمة أولاً: hulool task create --agent <id> --description "<text>"\n`));
      process.exit(1);
    }
    spinner.succeed(`تم تحميل المهمة: ${task.description}`);

    // 2. تحميل الوكيل
    const agentSpinner = ora(`${icons.refresh} تحميل الوكيل "${task.agentId}"...`).start();
    let agent: Awaited<ReturnType<typeof loadAgent>>;
    try {
      agent = await loadAgent(task.agentId);
    } catch (err) {
      agentSpinner.fail('فشل في تحميل الوكيل');
      console.error(chalk.red('Error:'), err);
      process.exit(1);
    }

    if (!agent) {
      agentSpinner.fail(`الوكيل "${task.agentId}" غير موجود`);
      console.error(chalk.red(`\n💡 أنشئ الوكيل أولاً: hulool agent create --name "${task.agentId}"\n`));
      process.exit(1);
    }
    agentSpinner.succeed(`تم تحميل الوكيل: ${agent.name}`);

    // 3. التحقق من حالة الوكيل (يجب أن يكون active)
    if (agent.status !== 'active') {
      console.error(
        chalk.red(
          `\n${icons.x} الوكيل "${agent.id}" ليس نشطاً (الحالة الحالية: ${agent.status})\n   💡 قم بتفعيل الوكيل قبل تشغيل المهام.\n`,
        ),
      );
      process.exit(1);
    }

    // 4. التحقق من الميزانية المتبقية
    const budgetRemaining = agent.budget.monthly - agent.budget.used;
    if (budgetRemaining <= 0) {
      console.error(
        chalk.red(
          `\n${icons.x} نفدت ميزانية الوكيل "${agent.id}"\n   💰 المستخدم: $${agent.budget.used.toFixed(2)} / $${agent.budget.monthly.toFixed(2)}\n   💡 زِد الميزانية أو احذف بعض المهام.\n`,
        ),
      );
      process.exit(1);
    }

    if (options.verbose) {
      console.log(chalk.gray(`   💰 الميزانية المتبقية: $${budgetRemaining.toFixed(2)}`));
    }

    // 5. وضع المحاكاة (dry-run)
    if (options.dryRun) {
      console.log(chalk.yellow('\n⚠️  وضع المحاكاة (dry-run) - لن يتم استدعاء LLM\n'));
      const now = new Date().toISOString();
      const simulatedTask: Task = {
        ...task,
        status: 'completed',
        output: { simulated: true, message: 'This is a dry-run simulation' },
        tokensUsed: 0,
        cost: 0,
        startedAt: now,
        completedAt: now,
        updatedAt: now,
      };

      await saveTask(simulatedTask);
      console.log(chalk.green.bold('\n✅ Task completed (dry-run):\n'));
      console.log(chalk.white('   🆔 ID:      '), chalk.cyan(simulatedTask.id));
      console.log(chalk.white('   📊 Status:  '), chalk.green('completed'));
      console.log(chalk.white('   💰 Cost:    '), chalk.green('$0.0000'));
      console.log(chalk.white('   🔢 Tokens:  '), chalk.green('0'));
      console.log('');
      return;
    }

    // 6. تنفيذ المهمة عبر runAgent
    const runSpinner = ora(`${icons.refresh} تنفيذ المهمة عبر ${agent.model}...`).start();
    const runResult = await runAgent({
      agent,
      taskDescription: task.description,
      systemPrompt: agent.systemPrompt,
      input: task.input,
    });

    if (!runResult.success) {
      runSpinner.fail('فشل في تنفيذ المهمة');

      // تحديث حالة المهمة إلى failed
      const now = new Date().toISOString();
      const failedTask: Task = {
        ...task,
        status: 'failed',
        errorMessage: runResult.error,
        startedAt: now,
        completedAt: now,
        updatedAt: now,
      };

      await saveTask(failedTask);

      // تسجيل في السجلات
      await appendLog(taskId, agent.id, 'failed', runResult.error, 0, 0);

      console.error(chalk.red(`\n❌ خطأ: ${runResult.error}\n`));
      process.exit(1);
    }

    // 7. تحديث حالة المهمة إلى completed
    const now = new Date().toISOString();
    const completedTask: Task = {
      ...task,
      status: 'completed',
      output: { response: runResult.response },
      tokensUsed: runResult.tokensUsed,
      cost: runResult.cost,
      startedAt: now,
      completedAt: now,
      updatedAt: now,
    };

    await saveTask(completedTask);

    // 8. تحديث ميزانية الوكيل
    await updateAgentBudget(agent.id, runResult.cost);

    // 9. تسجيل العملية في logs/
    await appendLog(
      taskId,
      agent.id,
      'completed',
      '',
      runResult.tokensUsed,
      runResult.cost,
      runResult.response,
    );

    runSpinner.succeed('تم تنفيذ المهمة بنجاح!');

    // 10. عرض النتيجة بشكل جميل
    console.log(chalk.green.bold('\n✅ Task completed:\n'));
    console.log(chalk.white('   🆔 ID:          '), chalk.cyan(completedTask.id));
    console.log(chalk.white('   🤖 Agent:       '), chalk.cyan(agent.id));
    console.log(chalk.white('   📝 Description: '), chalk.white(task.description));
    console.log(chalk.white('   📊 Status:      '), chalk.green('completed'));
    console.log(chalk.white('   💰 Cost:        '), chalk.green(`$${runResult.cost.toFixed(4)}`));
    console.log(chalk.white('   🔢 Tokens:      '), chalk.green(runResult.tokensUsed.toLocaleString()));
    console.log(chalk.white('   💰 Agent Budget:'), chalk.green(`$${agent.budget.used.toFixed(2)} / $${agent.budget.monthly.toFixed(2)}`));
    console.log('');

    if (options.verbose || runResult.response) {
      console.log(chalk.white.bold('   📤 Response:'));
      const responseLines = runResult.response.split('\n');
      responseLines.forEach(line => {
        console.log(chalk.gray('      ' + line));
      });
      console.log('');
    }
  });

/**
 * إضافة سجل تنفيذي إلى ملف logs/
 */
async function appendLog(
  taskId: string,
  agentId: string,
  status: string,
  error: string,
  tokensUsed: number,
  cost: number,
  response?: string,
): Promise<void> {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
    const logFile = path.join(LOGS_DIR, 'execution.log');
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({
      timestamp,
      taskId,
      agentId,
      status,
      error,
      tokensUsed,
      cost,
      response: response || null,
    }) + '\n';

    await fs.appendFile(logFile, logEntry, 'utf-8');
  } catch {
    // فشل تسجيل السجلات لا يجب أن يفشل الأمر الرئيسي
  }
}
