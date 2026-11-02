# 🏗️ Architecture - Hulool OS

## نظرة عامة على المعمارية

يعتمد Hulool OS على **معمارية الطبقات (Layered Architecture)** مع فصل واضح للمسؤوليات، مما يضمن قابلية التوسع والصيانة.

```mermaid
graph TB
    subgraph "Presentation Layer"
        CLI[Hulool CLI<br/>Commander.js]
        Dashboard[Web Dashboard<br/>Next.js + React]
        API[REST API<br/>Fastify]
    end
    
    subgraph "Application Layer"
        Core[Hulool Core Engine]
        AgentMgr[Agent Manager]
        TaskMgr[Task Manager]
        WorkflowMgr[Workflow Manager]
        BudgetMgr[Budget Manager]
        PluginSystem[Plugin System]
        EventBus[Event Bus]
    end
    
    subgraph "Data Layer"
        Supabase[(Supabase<br/>PostgreSQL)]
        Redis[(Redis Cache)]
        FS[File System<br/>Logs & Outputs]
    end
    
    subgraph "External Integrations"
        OpenAI[OpenAI API]
        Anthropic[Anthropic API]
        Ollama[Ollama Local]
        Plugins[Plugins<br/>Slack, GitHub, etc.]
    end
    
    CLI --> Core
    Dashboard --> API
    API --> Core
    
    Core --> AgentMgr
    Core --> TaskMgr
    Core --> WorkflowMgr
    Core --> BudgetMgr
    Core --> PluginSystem
    Core --> EventBus
    
    AgentMgr --> Supabase
    TaskMgr --> Supabase
    WorkflowMgr --> Supabase
    BudgetMgr --> Supabase
    
    AgentMgr --> OpenAI
    AgentMgr --> Anthropic
    AgentMgr --> Ollama
    
    PluginSystem --> Plugins
    
    EventBus --> Redis
    Core --> FS
    
    style CLI fill:#3b82f6,stroke:#1e40af,color:#fff
    style Dashboard fill:#3b82f6,stroke:#1e40af,color:#fff
    style API fill:#3b82f6,stroke:#1e40af,color:#fff
    style Core fill:#10b981,stroke:#065f46,color:#fff
    style Supabase fill:#f59e0b,stroke:#92400e,color:#fff
```

---

## 📦 مكونات النظام

### 1. Presentation Layer (طبقة العرض)

| المكون | الوصف | التقنيات |
|--------|-------|----------|
| **Hulool CLI** | واجهة سطر الأوامر للمطورين | Commander.js, Inquirer, Chalk |
| **Web Dashboard** | لوحة تحكم رسومية | Next.js 14, React, Tailwind |
| **REST API** | واجهة برمجية للتكامل | Fastify, TypeScript |

### 2. Application Layer (طبقة التطبيقات)

```mermaid
graph LR
    A[User Request] --> B[Core Engine]
    B --> C{Route Request}
    C -->|Agent| D[Agent Manager]
    C -->|Task| E[Task Manager]
    C -->|Workflow| F[Workflow Manager]
    C -->|Budget| G[Budget Manager]
    
    D --> H[Execute]
    E --> H
    F --> H
    G --> I[Check Limits]
    
    H --> J[Event Bus]
    I --> J
    J --> K[Log & Monitor]
    
    style B fill:#10b981,stroke:#065f46,color:#fff
    style J fill:#8b5cf6,stroke:#5b21b6,color:#fff
```

### 3. Data Layer (طبقة البيانات)

```mermaid
erDiagram
    COMPANIES ||--o{ AGENTS : has
    COMPANIES ||--o{ GOALS : defines
    COMPANIES ||--o{ WORKFLOWS : runs
    
    AGENTS ||--o{ TASKS : executes
    GOALS ||--o{ TASKS : contains
    WORKFLOWS ||--o{ WORKFLOW_STEPS : has
    
    AGENTS ||--o{ BUDGET_LOGS : tracks
    TASKS ||--o{ LOGS : generates
    
    COMPANIES {
        uuid id PK
        text name
        jsonb settings
    }
    
    AGENTS {
        uuid id PK
        uuid company_id FK
        text name
        text role
        text model
        real budget_monthly
        real budget_used
        text status
    }
    
    TASKS {
        uuid id PK
        uuid agent_id FK
        uuid goal_id FK
        text description
        jsonb input
        jsonb output
        text status
        integer tokens_used
        real cost
    }
```

---

## 🔄 أنماط التصميم المستخدمة

### 1. Command Pattern (CLI)
```typescript
// كل أمر CLI هو كائن مستقل
class InitCommand extends Command {
  async execute() { /* ... */ }
}
```

### 2. Observer Pattern (Event Bus)
```typescript
// الأحداث تُرسل للمستلمين
eventBus.emit('agent:completed', { agentId, taskId });
eventBus.on('agent:completed', handler);
```

### 3. Strategy Pattern (LLM Providers)
```typescript
// تبديل مزودي LLM بسهولة
interface LLMProvider {
  complete(prompt: string): Promise<string>;
}

class OpenAIProvider implements LLMProvider { }
class AnthropicProvider implements LLMProvider { }
```

### 4. Repository Pattern (Data Access)
```typescript
// فصل منطق البيانات
class AgentRepository {
  async findById(id: string): Promise<Agent> { }
  async save(agent: Agent): Promise<void> { }
}
```

---

## 🌐 تدفق البيانات

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Core
    participant AgentMgr
    participant LLM
    participant DB
    
    User->>CLI: hulool task create
    CLI->>Core: createTask()
    Core->>AgentMgr: assignTask(agentId)
    AgentMgr->>DB: saveTask()
    AgentMgr->>LLM: complete(prompt)
    LLM-->>AgentMgr: response
    AgentMgr->>DB: updateTask()
    AgentMgr->>Core: taskCompleted()
    Core-->>CLI: success
    CLI-->>User: ✅ Task completed
```

---

## 🔒 الأمان

```mermaid
graph TB
    A[User Input] --> B{Validation Layer}
    B -->|Invalid| C[Reject]
    B -->|Valid| D{Auth Check}
    D -->|Unauthorized| E[401 Error]
    D -->|Authorized| F{Permission Check}
    F -->|Denied| G[403 Error]
    F -->|Allowed| H[Execute Action]
    H --> I[Audit Log]
    
    style B fill:#f59e0b,stroke:#92400e,color:#fff
    style D fill:#3b82f6,stroke:#1e40af,color:#fff
    style F fill:#8b5cf6,stroke:#5b21b6,color:#fff
```

### طبقات الأمان:
1. **Input Validation**: Zod schemas
2. **Authentication**: Supabase Auth
3. **Authorization**: Role-based access
4. **Rate Limiting**: Per-agent budgets
5. **Audit Logging**: All actions tracked

---

## 📊 قابلية التوسع

### Horizontal Scaling
- Stateless API servers
- Redis for session management
- Supabase for data persistence

### Vertical Scaling
- Worker threads for CPU-intensive tasks
- Connection pooling for database
- Caching with Redis

---

## 🎯 قرارات معمارية مهمة

| القرار | البديل | السبب |
|--------|--------|-------|
| **TypeScript** | JavaScript | أمان الأنواع، صيانة أسهل |
| **Fastify** | Express | أداء أعلى، TypeScript-first |
| **Supabase** | Firebase | PostgreSQL أقوى، مفتوح المصدر |
| **Drizzle ORM** | Prisma | أخف، أسرع، TypeScript-native |
| **pnpm** | npm | أسرع، يوفر المساحة |
| **Mermaid** | Draw.io | نصي، يعمل مع Git |

---

## 📚 مراجع

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Supabase Documentation](https://supabase.com/docs)
- [Fastify Documentation](https://www.fastify.io/docs)
