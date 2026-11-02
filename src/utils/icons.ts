/**
 * نظام الأيقونات المستوحى من svgl.app
 * تم اختيار رموز Unicode عالية الدقة لضمان التوافق الكامل مع طرفيات proot/Termux
 * مع الحفاظ على الجمالية البصرية لأيقونات SVG الأصلية.
 */

export const icons = {
  // الأمان والأسرار (Security & Secrets)
  key: '🔑',           // svgl: key
  shield: '🛡️',        // svgl: shield
  shieldCheck: '🛡️✅',  // svgl: shield-check
  eye: '👁️',           // svgl: eye
  eyeOff: '🙈',        // svgl: eye-off
  lock: '🔒',          // svgl: lock
  unlock: '🔓',        // svgl: unlock

  // العمليات (Actions)
  plus: '➕',          // svgl: plus
  trash: '🗑️',         // svgl: trash-2
  edit: '✏️',          // svgl: edit-3
  check: '✅',         // svgl: check
  x: '❌',             // svgl: x
  refresh: '🔄',       // svgl: refresh-cw

  // المعلومات (Info)
  list: '📋',          // svgl: list
  terminal: '💻',      // svgl: terminal
  settings: '⚙️',      // svgl: settings
  warning: '⚠️',       // svgl: alert-triangle
  info: 'ℹ️',          // svgl: info

  // المزودين (Providers - ألوان مخصصة)
  openai: '🟢',        // svgl: openai
  anthropic: '🟠',     // svgl: anthropic
  gemini: '🔵',        // svgl: google-cloud
  qwen: '🟣',          // svgl: alibaba-cloud
  openrouter: '🌐',    // svgl: globe
  ollama: '🦙',        // svgl: llama (أقرب تمثيل لـ Ollama)
};

export const colors = {
  success: '\x1b[32m', // أخضر
  error: '\x1b[31m',   // أحمر
  warning: '\x1b[33m', // أصفر
  info: '\x1b[36m',    // سماوي
  reset: '\x1b[0m',    // إعادة تعيين
};
