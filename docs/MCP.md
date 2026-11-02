# 🔌 Hulool OS MCP Integration

## نظرة عامة
يعرض Hulool OS قدراته عبر بروتوكول سياق النموذج (Model Context Protocol - MCP)، مما يسمح لعملاء الذكاء الاصطناعي مثل **Claude Desktop** بالتفاعل مباشرة مع وكلائك، ومهامك، وسير عمل A2A.

## الأدوات المتاحة (Tools)
1. `create_agent`: إنشاء وكيل ذكاء اصطناعي جديد.
2. `run_task`: تعيين مهمة لوكيل محدد وتنفيذها فوراً.
3. `delegate_task_a2a`: تفويض مهمة من وكيل إلى آخر باستخدام بروتوكول A2A.

## الموارد المتاحة (Resources)
- `hulool://agents`: قائمة للقراءة فقط بجميع الوكلاء وحالاتهم.
- `hulool://tasks`: قائمة للقراءة فقط بجميع المهام.

## الإعداد مع Claude Desktop

1. افتح إعدادات Claude Desktop.
2. انتقل إلى قسم "Developer" أو "MCP".
3. عدّل ملف `claude_desktop_config.json` لإضافة Hulool OS:

```json
{
  "mcpServers": {
    "hulool-os": {
      "command": "pnpm",
      "args": [
        "tsx",
        "/root/projects/hulool-os/src/cli/index.ts",
        "mcp",
        "serve"
      ],
      "env": {
        "HULOOl_STORAGE": "json",
        "OPENAI_API_KEY": "your-key-here"
      }
    }
  }
}
```
4. أعد تشغيل Claude Desktop. يجب أن ترى الآن أدوات Hulool OS متاحة عند النقر على أيقونة 🔌.

## أمثلة على الأوامر لـ Claude
- "List all available agents in my Hulool OS."
- "Create a new agent named 'DataAnalyst' with a budget of $50."
- "Ask the 'researcher' agent to find the top 3 AI trends, then ask the 'writer' agent to write a blog post about it using A2A delegation."
