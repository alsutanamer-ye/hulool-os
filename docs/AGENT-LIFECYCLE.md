# 🤖 Agent Lifecycle - Hulool OS

## نظرة عامة

دورة حياة الوكيل في Hulool OS من الإنشاء حتى التقاعد.

---

## 🔄 دورة الحياة الكاملة

```mermaid
stateDiagram-v2
    [*] --> Created: hulool agent create
    Created --> Inactive: initial state
    
    Inactive --> Active: hulool agent start
    Active --> Running: task assigned
    Running --> Active: task completed
    Running --> Error: task failed
    
    Active --> Paused: hulool agent pause
    Paused --> Active: hulool agent resume
    
    Active --> Error: budget exceeded
    Error --> Active: hulool agent fix
    Error --> Inactive: hulool agent stop
    
    Active --> Inactive: hulool agent stop
    Inactive --> [*]: hulool agent delete
    Error --> [*]: hulool agent delete
```

---

## 📊 حالات الوكيل

```mermaid
graph TB
    subgraph "الحالات الرئيسية"
        A[Created<br/>🆕] --> B[Inactive<br/>⚪]
        B --> C[Active<br/>🟢]
        C --> D[Running<br/>🔵]
        D --> C
        C --> E[Paused<br/>🟡]
        E --> C
        C --> F[Error<br/>🔴]
        F --> C
        F --> B
        C --> B
        B --> G[Deleted<br/>🗑️]
        F --> G
    end
    
    style A fill:#3b82f6,stroke:#1e40af,color:#fff
    style B fill:#9ca3af,stroke:#6b7280,color:#fff
    style C fill:#10b981,stroke:#065f46,color:#fff
    style D fill:#3b82f6,stroke:#1e40af,color:#fff
    style E fill:#f59e0b,stroke:#92400e,color:#fff
    style F fill:#ef4444,stroke:#991b1b,color:#fff
    style G fill:#6b7280,stroke:#4b5563,color:#fff
```

---

## 🎯 transitions (الانتقالات)

### 1. Created → Inactive

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant FileSystem
    
    User->>CLI: hulool agent create
    CLI->>CLI: جمع المعلومات
    CLI->>CLI: إنشاء ID
    CLI->>FileSystem: حفظ agent.json
    FileSystem-->>CLI: ✅ Saved
    CLI-->>User: Agent created (inactive)
```

### 2. Inactive → Active

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Agent
    participant LLM
    
    User->>CLI: hulool agent start
    CLI->>Agent: load agent
    Agent->>Agent: validate config
    Agent->>LLM: test connection
    LLM-->>Agent: ✅ Connected
    Agent->>Agent: set status = active
    Agent-->>CLI: ✅ Started
    CLI-->>User: Agent is now active
```

### 3. Active → Running

```mermaid
sequenceDiagram
    participant TaskQueue
    participant Agent
    participant LLM
    participant Database
    
    TaskQueue->>Agent: assign task
    Agent->>Agent: set status = running
    Agent->>Database: update task status
    Agent->>LLM: send prompt
    LLM-->>Agent: response
    Agent->>Agent: parse response
    Agent->>Database: save result
    Agent->>Database: update budget
    Agent->>Agent: set status = active
    Agent-->>TaskQueue: task completed
```

---

## 💰 إدارة الميزانية

```mermaid
graph TB
    A[Task Started] --> B[Calculate Cost]
    B --> C{Budget Check}
    C -->|Within Budget| D[Execute Task]
    C -->|Exceeds Budget| E{Alert Threshold?}
    
    E -->|< 80%| D
    E -->|>= 80%| F[Send Warning]
    F --> D
    
    D --> G[Update Budget]
    G --> H{New Total?}
    H -->|< Limit| I[Continue]
    H -->|>= Limit| J[Stop Agent]
    J --> K[Send Alert]
    
    style C fill:#f59e0b,stroke:#92400e,color:#fff
    style E fill:#f59e0b,stroke:#92400e,color:#fff
    style J fill:#ef4444,stroke:#991b1b,color:#fff
```

### مستويات التنبيه

| المستوى | العتبة | الإجراء |
|---------|--------|---------|
| 🟢 **آمن** | < 50% | لا شيء |
| 🟡 **تحذير** | 50-80% | إشعار في الـ Dashboard |
| 🟠 **تنبيه** | 80-95% | إشعار + Email |
| 🔴 **حرج** | > 95% | إيقاف الوكيل تلقائياً |

---

## 🔄 معالجة الأخطاء

```mermaid
graph TB
    A[Error Occurred] --> B{Error Type?}
    
    B -->|Network| C[Retry 3 times]
    B -->|Rate Limit| D[Wait & Retry]
    B -->|Invalid Input| E[Log & Fail]
    B -->|Budget| F[Stop Agent]
    B -->|LLM Error| G[Fallback Model]
    
    C --> H{Success?}
    H -->|Yes| I[Continue]
    H -->|No| E
    
    D --> J{Wait Complete?}
    J -->|Yes| C
    J -->|No| E
    
    G --> K{Fallback Success?}
    K -->|Yes| I
    K -->|No| E
    
    E --> L[Set Status = Error]
    F --> L
    L --> M[Notify User]
    
    style A fill:#ef4444,stroke:#991b1b,color:#fff
    style I fill:#10b981,stroke:#065f46,color:#fff
    style L fill:#ef4444,stroke:#991b1b,color:#fff
```

---

## 📈 مراقبة الأداء

```mermaid
graph LR
    subgraph "مقاييس الأداء"
        A[Success Rate] --> B[> 90%]
        C[Avg Response Time] --> D[< 30s]
        E[Cost per Task] --> F[< $1]
        G[Token Usage] --> H[Optimized]
    end
    
    subgraph "Alerts"
        B --> I{< 90%?}
        D --> J{> 30s?}
        F --> K{> $1?}
        
        I -->|Yes| L[Alert]
        J -->|Yes| L
        K -->|Yes| L
    end
    
    style L fill:#ef4444,stroke:#991b1b,color:#fff
```

---

## 🎯 أوامر دورة الحياة

```bash
# الإنشاء
hulool agent create

# البدء
hulool agent start <id>

# الإيقاف
hulool agent stop <id>

# الإيقاف المؤقت
hulool agent pause <id>

# الاستئناف
hulool agent resume <id>

# إعادة التشغيل
hulool agent restart <id>

# الحذف
hulool agent delete <id>

# العرض
hulool agent list
hulool agent info <id>
```

---

## 📊 أمثلة على سيناريوهات دورة الحياة

### السيناريو 1: وكيل بحث يعمل بشكل طبيعي

```mermaid
sequenceDiagram
    participant User
    participant Agent
    participant LLM
    participant DB
    
    User->>Agent: create
    Agent->>DB: save (inactive)
    
    User->>Agent: start
    Agent->>DB: update (active)
    
    loop Every task
        User->>Agent: assign task
        Agent->>LLM: request
        LLM-->>Agent: response
        Agent->>DB: save result
        Agent->>DB: update budget
    end
    
    User->>Agent: stop
    Agent->>DB: update (inactive)
```

### السيناريو 2: وكيل يتجاوز الميزانية

```mermaid
sequenceDiagram
    participant User
    participant Agent
    participant Budget
    participant LLM
    
    Agent->>Budget: check budget
    Budget-->>Agent: 75% used
    
    Agent->>LLM: task 1
    LLM-->>Agent: response
    Agent->>Budget: update (+$10)
    Budget-->>Agent: 85% used
    
    Agent->>Budget: alert threshold
    Budget->>User: ⚠️ Warning: 85%
    
    Agent->>LLM: task 2
    LLM-->>Agent: response
    Agent->>Budget: update (+$20)
    Budget-->>Agent: 105% used
    
    Budget->>Agent: 🛑 Stop!
    Agent->>Agent: set status = error
    Agent->>User: ❌ Budget exceeded
```

---

## 🎓 أفضل الممارسات

### ✅ افعل

1. **ابدأ بميزانية صغيرة**: اختبر الوكيل قبل زيادة الميزانية
2. **راقب الأداء**: استخدم `hulool monitor` بانتظام
3. **استخدم النماذج المناسبة**: GPT-3.5 للمهام البسيطة، GPT-4 للمعقدة
4. **حدد timeouts**: تجنب المهام اللانهائية
5. **سجل الأخطاء**: حلل الأنماط المتكررة

### ❌ لا تفعل

1. **لا تترك الوكلاء بدون مراقبة**: قد يستهلكون الميزانية بسرعة
2. **لا تستخدم GPT-4 لكل شيء**: مكلف وغير ضروري
3. **لا تتجاهل التنبيهات**: قد تشير لمشاكل حقيقية
4. **لا تنشئ وكلاء متشابهين**: وفر الموارد

---

## 📚 مراجع

- [Agent Design Patterns](https://www.patterns.ai/agents)
- [LLM Best Practices](https://docs.anthropic.com/claude/docs/best-practices)
- [Budget Management](https://hulool.ai/docs/budget)
