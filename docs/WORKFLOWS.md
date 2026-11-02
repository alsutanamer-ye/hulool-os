# 🔄 Workflows - Hulool OS

## نظرة عامة

سير العمل (Workflows) في Hulool OS هو تسلسل منظم من الخطوات التي تنفذها وكلاء الذكاء الاصطناعي لتحقيق هدف معين.

---

## 🎯 أنواع سير العمل

### 1. Sequential Workflow (تسلسلي)

```mermaid
graph LR
    A[Step 1<br/>Research] --> B[Step 2<br/>Draft]
    B --> C[Step 3<br/>Review]
    C --> D[Step 4<br/>Publish]
    
    style A fill:#3b82f6,stroke:#1e40af,color:#fff
    style B fill:#10b981,stroke:#065f46,color:#fff
    style C fill:#f59e0b,stroke:#92400e,color:#fff
    style D fill:#8b5cf6,stroke:#5b21b6,color:#fff
```

**مثال**: إنشاء مقال مدونة
1. **Research Agent**: جمع المعلومات
2. **Writer Agent**: كتابة المسودة
3. **Editor Agent**: المراجعة والتحرير
4. **Publisher Agent**: النشر

### 2. Parallel Workflow (متوازي)

```mermaid
graph TB
    Start([Start]) --> P1[Research Agent]
    Start --> P2[Data Agent]
    Start --> P3[Image Agent]
    
    P1 --> Merge{Merge Results}
    P2 --> Merge
    P3 --> Merge
    
    Merge --> Final[Writer Agent]
    Final --> End([End])
    
    style Start fill:#10b981,stroke:#065f46,color:#fff
    style End fill:#ef4444,stroke:#991b1b,color:#fff
    style Merge fill:#f59e0b,stroke:#92400e,color:#fff
```

**مثال**: تقرير شامل
- 3 وكلاء يعملون بالتوازي
- دمج النتائج في النهاية

### 3. Conditional Workflow (شرطي)

```mermaid
graph TB
    A[Analyze Input] --> B{Type?}
    B -->|Technical| C[Code Agent]
    B -->|Marketing| D[Content Agent]
    B -->|Data| E[Analytics Agent]
    
    C --> F[Review Agent]
    D --> F
    E --> F
    
    F --> G{Approved?}
    G -->|Yes| H[Publish]
    G -->|No| I[Revise]
    I --> A
    
    style B fill:#f59e0b,stroke:#92400e,color:#fff
    style G fill:#f59e0b,stroke:#92400e,color:#fff
```

---

## 🏗️ بنية سير العمل

### ملف تعريف سير العمل

```json
{
  "id": "content-pipeline",
  "name": "Content Creation Pipeline",
  "description": "End-to-end content creation workflow",
  "steps": [
    {
      "id": "step-1",
      "agent": "researcher",
      "action": "research_topic",
      "input": {
        "topic": "{{input.topic}}",
        "depth": "comprehensive"
      },
      "output_mapping": {
        "research_data": "step-2.research"
      }
    },
    {
      "id": "step-2",
      "agent": "writer",
      "action": "write_draft",
      "input": {
        "research": "{{step-1.research_data}}",
        "tone": "professional"
      }
    }
  ],
  "error_handling": {
    "retry_attempts": 3,
    "fallback_agent": "backup-writer"
  }
}
```

---

## 🔄 دورة حياة سير العمل

```mermaid
stateDiagram-v2
    [*] --> Created
    Created --> Validating: validate()
    Validating --> Ready: valid
    Validating --> Failed: invalid
    
    Ready --> Running: start()
    Running --> StepExecuting: execute step
    StepExecuting --> Running: step done
    StepExecuting --> Failed: step error
    
    Running --> Completed: all steps done
    Running --> Paused: pause()
    Paused --> Running: resume()
    
    Failed --> Retrying: retry
    Retrying --> Running: retry success
    Retrying --> Failed: retry failed
    
    Completed --> [*]
    Failed --> [*]
```

---

## 🎨 محرر سير العمل البصري

```mermaid
graph TB
    subgraph "Visual Workflow Builder"
        Canvas[Canvas]
        
        subgraph "Toolbox"
            T1[Research Agent]
            T2[Writer Agent]
            T3[Editor Agent]
            T4[Publisher Agent]
        end
        
        subgraph "Workflow"
            S1[Step 1] --> S2[Step 2]
            S2 --> S3[Step 3]
            S3 --> S4[Step 4]
        end
        
        subgraph "Properties"
            P1[Agent: researcher]
            P2[Action: research]
            P3[Input: topic]
        end
    end
    
    T1 -.->|drag| S1
    T2 -.->|drag| S2
    
    S1 -.->|select| P1
    S1 -.->|select| P2
    S1 -.->|select| P3
    
    style Canvas fill:#f3f4f6,stroke:#9ca3af
```

---

## 📊 أمثلة عملية

### مثال 1: خط إنتاج المحتوى

```mermaid
graph LR
    A[📝 Topic Input] --> B[🔍 Research<br/>2 min]
    B --> C[✍️ Draft<br/>5 min]
    C --> D[👁️ Review<br/>3 min]
    D --> E[🎨 Design<br/>4 min]
    E --> F[📤 Publish<br/>1 min]
    
    F --> G[✅ Complete<br/>15 min total]
    
    style A fill:#3b82f6,stroke:#1e40af,color:#fff
    style G fill:#10b981,stroke:#065f46,color:#fff
```

**التكلفة المتوقعة**: ~$0.50  
**الوكلاء**: 5  
**النماذج**: GPT-4 + Claude 3

### مثال 2: تحليل السوق

```mermaid
graph TB
    Start([Market Analysis Request]) --> R1[Competitor Research]
    Start --> R2[Customer Interviews]
    Start --> R3[Trend Analysis]
    
    R1 --> Merge[Data Synthesis]
    R2 --> Merge
    R3 --> Merge
    
    Merge --> Report[Generate Report]
    Report --> Visual[Create Visuals]
    Visual --> Present[Prepare Presentation]
    Present --> End([Final Report])
    
    style Start fill:#3b82f6,stroke:#1e40af,color:#fff
    style End fill:#10b981,stroke:#065f46,color:#fff
    style Merge fill:#f59e0b,stroke:#92400e,color:#fff
```

---

## 🔧 أوامر CLI لسير العمل

```bash
# إنشاء سير عمل جديد
hulool workflow create

# تشغيل سير عمل
hulool workflow run content-pipeline --input '{"topic": "AI Trends"}'

# جدولة سير عمل
hulool workflow schedule content-pipeline --cron "0 9 * * 1"

# عرض حالة سير العمل
hulool workflow status content-pipeline

# إلغاء سير عمل
hulool workflow cancel <run-id>

# عرض سجل التشغيل
hulool workflow logs <run-id>
```

---

## 🎯 أفضل الممارسات

### ✅ افعل

1. **ابدأ بسيطاً**: سير عمل من 3-5 خطوات
2. **اختبر كل خطوة**: تأكد من عمل كل وكيل منفرداً
3. **حدد timeouts**: تجنب الحلقات اللانهائية
4. **استخدم error handling**: تعامل مع الفشل بذكاء
5. **راقب التكاليف**: حدد ميزانية لكل سير عمل

### ❌ لا تفعل

1. **لا تنشئ سير عمل طويلاً جداً**: قسمه لسير عمل أصغر
2. **لا تعتمد على وكيل واحد**: استخدم fallback agents
3. **لا تتجاهل الأخطاء**: سجلها وحللها
4. **لا تستخدم نماذج باهظة للمهام البسيطة**

---

## 📚 مراجع

- [Workflow Patterns](https://workflowpatterns.com)
- [BPMN 2.0 Specification](https://www.omg.org/spec/BPMN/)
- [Temporal.io Documentation](https://docs.temporal.io)
