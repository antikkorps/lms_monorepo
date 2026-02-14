import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeText } from './sanitize.js';

describe('escapeHtml', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#x27;');
  });

  it('escapes script tags', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('preserves safe text', () => {
    expect(escapeHtml('Hello world 123')).toBe('Hello world 123');
  });

  it('preserves markdown syntax', () => {
    const md = '# Title\n**bold** _italic_ [link](url)';
    expect(escapeHtml(md)).toBe('# Title\n**bold** _italic_ [link](url)');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('handles string with only special chars', () => {
    expect(escapeHtml('<<<>>>')).toBe('&lt;&lt;&lt;&gt;&gt;&gt;');
  });
});

describe('sanitizeText', () => {
  it('trims whitespace and escapes HTML', () => {
    expect(sanitizeText('  <b>bold</b>  ')).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('trims leading/trailing whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('handles mixed content', () => {
    expect(sanitizeText(' Tom & Jerry <3 ')).toBe('Tom &amp; Jerry &lt;3');
  });

  it('handles empty string after trim', () => {
    expect(sanitizeText('   ')).toBe('');
  });
});
