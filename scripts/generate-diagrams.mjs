import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const docsDir = 'docs';
const outputDir = 'docs/diagrams';

// التأكد من وجود مجلد المخرجات
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const filesToProcess = [
  { md: 'ARCHITECTURE.md', name: 'architecture' },
  { md: 'WORKFLOWS.md', name: 'workflows' },
  { md: 'DATABASE.md', name: 'database' },
  { md: 'USER-JOURNEY.md', name: 'user-journey' },
  { md: 'AGENT-LIFECYCLE.md', name: 'agent-lifecycle' }
];

console.log('🎨 بدء توليد المخططات البيانية...\n');

for (const file of filesToProcess) {
  const mdPath = path.join(docsDir, file.md);
  const outputPath = path.join(outputDir, `${file.name}.png`);

  if (!fs.existsSync(mdPath)) {
    console.log(`⚠️  الملف غير موجود: ${mdPath}`);
    continue;
  }

  console.log(`📄 معالجة: ${file.md}...`);

  try {
    // استخراج أول كتلة mermaid من الملف
    const content = fs.readFileSync(mdPath, 'utf8');
    const match = content.match(/```mermaid([\s\S]*?)```/);
    
    if (!match) {
      console.log(`   ⚠️  لم يتم العثور على كود mermaid في ${file.md}`);
      continue;
    }

    const mermaidCode = match[1].trim();
    
    // تشفير الكود بصيغة base64 URL-safe
    const base64Code = Buffer.from(mermaidCode).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // رابط API لتوليد PNG
    const apiUrl = `https://mermaid.ink/img/${base64Code}?bgColor=transparent`;

    // تنزيل الصورة باستخدام curl
    execSync(`curl -s -o "${outputPath}" "${apiUrl}"`);

    // التحقق من نجاح التنزيل
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      console.log(`   ✅ تم الحفظ: ${outputPath}`);
    } else {
      console.log(`   ❌ فشل في توليد: ${file.name}`);
    }
  } catch (error) {
    console.log(`   ❌ خطأ في معالجة ${file.md}:`, error.message);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ اكتمل توليد المخططات البيانية!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// عرض الملفات المولدة
try {
  execSync(`ls -lh ${outputDir}`);
} catch (e) {}
