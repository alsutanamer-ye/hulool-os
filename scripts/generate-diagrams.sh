#!/bin/bash

echo "🎨 Generating diagrams from Mermaid files..."
echo ""

# إنشاء مجلد الصور
mkdir -p docs/diagrams

# قائمة الملفات
FILES=(
  "docs/ARCHITECTURE.md:architecture"
  "docs/WORKFLOWS.md:workflows"
  "docs/DATABASE.md:database"
  "docs/USER-JOURNEY.md:user-journey"
  "docs/AGENT-LIFECYCLE.md:agent-lifecycle"
)

# توليد الصور
for item in "${FILES[@]}"; do
  IFS=':' read -r md_file diagram_name <<< "$item"
  
  if [ -f "$md_file" ]; then
    echo "📄 Processing $md_file..."
    
    # استخراج كتل mermaid
    awk '/```mermaid/,/```/' "$md_file" | \
      grep -v '```mermaid' | \
      grep -v '```' > "/tmp/diagram.mmd"
    
    if [ -s "/tmp/diagram.mmd" ]; then
      # تحويل إلى PNG
      npx mmdc -i "/tmp/diagram.mmd" -o "docs/diagrams/${diagram_name}.png" -b transparent -w 1200 -H 800
      
      if [ $? -eq 0 ]; then
        echo "  ✅ Generated: docs/diagrams/${diagram_name}.png"
      else
        echo "  ❌ Failed: ${diagram_name}"
      fi
    else
      echo "  ⚠️  No mermaid blocks found"
    fi
  else
    echo "  ❌ File not found: $md_file"
  fi
  echo ""
done

# تنظيف
rm -f /tmp/diagram.mmd

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Diagram generation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Generated files:"
ls -lh docs/diagrams/
