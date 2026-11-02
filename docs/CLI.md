# ⌨️ CLI Reference - Hulool OS

## نظرة عامة

Hulool CLI هو أداة سطر الأوامر الرئيسية لإدارة وكلاء الذكاء الاصطناعي وسير العمل.

---

## 🚀 الأوامر الأساسية

### hulool init

إنشاء مشروع Hulool جديد.

```bash
hulool init <name> [options]
```

**الخيارات**:
- `-t, --template <template>` - القالب (default, startup, content)
- `-y, --yes` - تخطي الأسئلة واستخدام الإعدادات الافتراضية

**مثال**:
```bash
hulool init my-company --template startup
```

---

### hulool agent

إدارة وكلاء الذكاء الاصطناعي.

#### hulool agent create

إنشاء وكيل جديد.

```bash
hulool agent create [options]
```

**الخيارات**:
- `-n, --name <name>` - اسم الوكيل
- `-r, --role <role>` - دور الوكيل
- `-m, --model <model>` - نموذج LLM
- `-b, --budget <budget>` - الميزانية الشهرية
- `-y, --yes` - تخطي الأسئلة

**مثال**:
```bash
# تفاعلي
hulool agent create

# مباشر
hulool agent create \
  --name "Research Analyst" \
  --role researcher \
  --model gpt-4 \
  --budget 200 \
  --yes
```

#### hulool agent list

عرض قائمة الوكلاء.

```bash
hulool agent list [options]
```

**الخيارات**:
- `-s, --status <status>` - فلترة حسب الحالة
- `--json` - إخراج JSON

**مثال**:
```bash
hulool agent list
hulool agent list --status active --json
```

#### hulool agent info

عرض تفاصيل وكيل.

```bash
hulool agent info <id>
```

**مثال**:
```bash
hulool agent info research-analyst
```

---

### hulool task

إدارة المهام.

#### hulool task create

إنشاء مهمة جديدة.

```bash
hulool task create [options]
```

**الخيارات**:
- `-a, --agent <agent-id>` - الوكيل المنفذ (مطلوب)
- `-d, --description <desc>` - وصف المهمة (مطلوب)
- `-g, --goal <goal-id>` - الهدف المرتبط (اختياري)
- `-i, --input <json>` - مدخلات المهمة كسلسلة JSON (اختياري)
- `-p, --priority <level>` - الأولوية: low, medium, high, critical (الافتراضي: medium)
- `-y, --yes` - تخطي الأسئلة واستخدام القيم الافتراضية

**مثال**:
```bash
# تفاعلي
hulool task create

# مباشر
hulool task create \
  --agent research-analyst \
  --description "Analyze competitor pricing" \
  --priority high \
  --input '{"competitors": ["Company A", "Company B"]}' \
  --yes
```

**ملاحظات**:
- يجب أن يكون الوكيل موجوداً ونشطاً (status = active)
- يجب أن يكون لدى الوكيل ميزانية متبقية قبل إنشاء المهمة

#### hulool task list

عرض المهام.

```bash
hulool task list [options]
```

**الخيارات**:
- `-a, --agent <agent-id>` - فلترة حسب الوكيل
- `-s, --status <status>` - فلترة حسب الحالة (pending, running, completed, failed, cancelled)
- `-p, --priority <priority>` - فلترة حسب الأولوية (low, medium, high, critical)
- `--json` - إخراج JSON

**مثال**:
```bash
hulool task list
hulool task list --status pending --json
hulool task list --agent research-analyst --priority high
```

#### hulool task info

عرض تفاصيل مهمة محددة.

```bash
hulool task info <id>
```

**ال引数**:
- `<id>` - معرف المهمة (مطلوب)

**مثال**:
```bash
hulool task info analyze-ai-trends
```

#### hulool task run

تنفيذ مهمة باستخدام الوكيل المعيّن لها، مع تحديث الحالة والميزانية والتوكنات.

```bash
hulool task run <task-id> [options]
```

**الخيارات**:
- `--dry-run` - محاكاة التنفيذ دون استدعاء مزود LLM
- `--verbose` - عرض تفاصيل التنفيذ

**مثال**:
```bash
hulool task run analyze-ai-trends --dry-run
```

---

### hulool a2a

إدارة بروتوكول A2A (Agent-to-Agent) للتواصل بين الوكلاء.

يُخزَّن سجل الرسائل في `.hulool/a2a-log.json` داخل مجلد العمل، ويشمل حالة كل رسالة
(`sent` / `delivered` / `failed` / `timeout`) والخطأ إن وُجد.

#### hulool a2a logs

عرض سجل رسائل A2A.

```bash
hulool a2a logs [options]
```

**الخيارات**:
- `-a, --agent <agent-id>` - فلترة الرسائل حسب الوكيل (مرسل أو مستقبل)
- `--json` - إخراج السجل بصيغة JSON

**مثال**:
```bash
hulool a2a logs --agent researcher-1
hulool a2a logs --json
```

---

### hulool agent delegate

تفويض إجراء (قدرة) من وكيل إلى وكيل آخر عبر بروتوكول A2A.
يسجّل الأمر معالجات الوكيل المستقبل تلقائياً حسب قدراته
(الدور + المهارات + الأدوات)، ثم يرسل الرسالة وينتظر الرد.

```bash
hulool agent delegate <from> <to> <action> [options]
```

**الـ Arguments**:
- `<from>` - معرف الوكيل المرسل
- `<to>` - معرف الوكيل المستقبل
- `<action>` - الإجراء المطلوب (يجب أن يكون ضمن قدرات المستقبل)

**الخيارات**:
- `-p, --payload <json>` - بيانات الإجراء ككائن JSON
- `--no-response` - إرسال غير متزامن دون انتظار رد
- `--priority <level>` - أولوية الرسالة: `low`، `medium`، `high`، `critical` (افتراضي: `medium`)
- `--ttl <seconds>` - مهلة انتظار الرد بالثواني (افتراضي: `300`)

**الشروط**:
- يجب أن يكون الوكيلان موجودين وحالتهما `active`
- يجب ألا يكون الوكيل المستقبل قد استنفد ميزانيته

**مثال**:
```bash
hulool agent delegate researcher-1 writer-1 summarize \
  --payload '{"task":"لخّص تقرير السوق"}' --ttl 120

# إرسال غير متزامن (fire-and-forget)
hulool agent delegate researcher-1 writer-1 summarize --no-response
```

**مثال برمجي (بروتوكول A2A مباشرة)**:

```typescript
import { A2ARouter } from './src/core/a2a/router.js';
import { registerAgentHandlers } from './src/core/a2a/handlers.js';

const router = new A2ARouter();
registerAgentHandlers(router, receiverAgent); // يسجّل معالجاً لكل قدرة

const result = await router.sendMessage({
  senderId: 'researcher-1',
  receiverId: 'writer-1',
  action: 'summarize',
  intent: 'request',
  payload: { task: 'لخّص تقرير السوق' },
  requiresResponse: true,
  priority: 'high',
  ttl: 120,
});

console.log(result.response?.payload);
```

---

### hulool goal

إدارة الأهداف.

#### hulool goal create

إنشاء هدف جديد.

```bash
hulool goal create [options]
```

**الخيارات**:
- `-n, --name <name>` - اسم الهدف
- `-d, --description <desc>` - وصف الهدف
- `-p, --priority <priority>` - الأولوية (low, medium, high, critical)
- `--deadline <date>` - الموعد النهائي
- `-b, --budget <budget>` - الميزانية
- `--agents <ids>` - الوكلاء المعينون

**مثال**:
```bash
hulool goal create \
  --name "Q1 Marketing Campaign" \
  --priority high \
  --deadline 2026-12-31 \
  --budget 500 \
  --agents researcher,writer,editor
```

---

### hulool workflow

إدارة سير العمل.

#### hulool workflow create

إنشاء سير عمل جديد.

```bash
hulool workflow create [options]
```

#### hulool workflow run

تشغيل سير عمل.

```bash
hulool workflow run <workflow-id> [options]
```

**الخيارات**:
- `-i, --input <json>` - مدخلات سير العمل
- `-p, --priority <priority>` - الأولوية

**مثال**:
```bash
hulool workflow run content-pipeline \
  --input '{"topic": "AI Trends 2026"}'
```

#### hulool workflow schedule

جدولة سير عمل.

```bash
hulool workflow schedule <workflow-id> --cron "0 9 * * 1"
```

---

### hulool budget

عرض الميزانية والتكاليف.

```bash
hulool budget [options]
```

**الخيارات**:
- `--period <period>` - الفترة (day, week, month)
- `--agent <agent-id>` - ميزانية وكيل محدد
- `--json` - إخراج JSON

**مثال**:
```bash
hulool budget
hulool budget --period month --json
```

---

### hulool monitor

لوحة مراقبة مباشرة.

```bash
hulool monitor [options]
```

**اختصارات**:
- `q` - خروج
- `r` - تحديث
- `f` - فلترة
- `?` - مساعدة

---

### hulool logs

عرض السجلات.

```bash
hulool logs [options]
```

**الخيارات**:
- `-l, --level <level>` - المستوى (debug, info, warn, error)
- `-a, --agent <agent-id>` - سجلات وكيل محدد
- `-n, --tail <n>` - آخر n سجل
- `-f, --follow` - متابعة مباشرة
- `--from <date>` - من تاريخ
- `--to <date>` - إلى تاريخ

**مثال**:
```bash
hulool logs --level error --tail 50
hulool logs --agent research-analyst --follow
```

---

## 🎨 الأعلام العامة

جميع الأوامر تدعم هذه الأعلام:

```bash
--help, -h          عرض المساعدة
--version, -v       عرض الإصدار
--config, -c        مسار ملف التكوين
--verbose           إخراج مفصل
--quiet, -q         إخراج صامت
--no-color          تعطيل الألوان
--format            صيغة الإخراج (table, json, csv)
```

---

## 📊 أمثلة متقدمة

### إنشاء فريق كامل

```bash
# إنشاء الوكلاء
hulool agent create --name "Researcher" --role researcher --budget 200 --yes
hulool agent create --name "Writer" --role writer --budget 150 --yes
hulool agent create --name "Editor" --role reviewer --budget 100 --yes

# إنشاء هدف
hulool goal create \
  --name "Blog Series" \
  --agents researcher,writer,editor \
  --budget 500

# تشغيل سير العمل
hulool workflow run content-pipeline
```

### مراقبة التكاليف

```bash
# عرض الميزانية
hulool budget

# عرض سجلات التكلفة
hulool logs --level info | grep "cost"

# تصدير التقرير
hulool budget --json > budget-report.json
```

---

## 🔧 تكوين CLI

### ملف hulool.config.json

```json
{
  "name": "my-company",
  "llm": {
    "provider": "openai",
    "model": "gpt-4"
  },
  "budget": {
    "monthly": 1000,
    "alertThreshold": 80
  },
  "logging": {
    "level": "info"
  }
}
```

### متغيرات البيئة

```bash
# .env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
OPENAI_API_KEY=xxx
ANTHROPIC_API_KEY=xxx
```

---

## 📚 مراجع

- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Inquirer.js Documentation](https://github.com/SBoudrias/Inquirer.js)
- [Chalk Documentation](https://github.com/chalk/chalk)
