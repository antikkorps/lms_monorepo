const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

const HTML_ESCAPE_RE = /[&<>"']/g;

export function escapeHtml(text: string): string {
  return text.replace(HTML_ESCAPE_RE, (char) => HTML_ESCAPE_MAP[char]);
}

export function sanitizeText(text: string): string {
  return escapeHtml(text.trim());
}
